(function () {
    // DOM
    const originalTextEl = document.getElementById('originalText');
    const userInputDisplayEl = document.getElementById('userInputDisplay');
    const inputDisplayWrapper = document.getElementById('inputDisplayWrapper');
    const virtualInputZone = document.getElementById('virtualInputZone');
    const hiddenEditable = document.getElementById('hiddenEditable');
    const tapArea = document.getElementById('tapArea');
    const tapText = document.getElementById('tapText');
    const statTime = document.getElementById('statTime');
    const statWPM = document.getElementById('statWPM');
    const statAccuracy = document.getElementById('statAccuracy');
    const statProgress = document.getElementById('statProgress');
    const modeIndicator = document.getElementById('modeIndicator');
    const textInfo = document.getElementById('textInfo');
    const btnResetSmall = document.getElementById('btnResetSmall');
    const btnBackToHome = document.getElementById('btnBackToHome');
    const challengeBanner = document.getElementById('challengeBanner');
    const challengeTargetInfo = document.getElementById('challengeTargetInfo');
    const toastContainer = document.getElementById('toastContainer');
    const splashScreen = document.getElementById('splashScreen');

    // 状态
    let originalText = '', normalizedText = '', userInput = '';
    let actualKeystrokes = 0, autoSkippedPositions = [];
    let startTime = null, timerInterval = null;
    let isFinished = false, isActive = false;
    let useLowerCaseMode = false, modeSelected = false;
    let challengeMode = false, challengeRecord = null;
    let currentSortMode = 'accuracy';
    let inputBuffer = '';

    // 工具
    function escapeHTML(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function showToast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; toastContainer.appendChild(t); setTimeout(() => { if (t.parentNode) t.remove(); }, 2000); }
    function formatTime(s) { const m = Math.floor(s / 60), sec = Math.floor(s % 60); return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0'); }
    function isWhitespace(c) { const code = c.charCodeAt(0); return !((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57)); }
    function normalizeChar(c) { const code = c.charCodeAt(0); return (code >= 65 && code <= 90) ? String.fromCharCode(code + 32) : c; }
    function normalizeText(t) { let r = ''; for (const ch of t) r += normalizeChar(ch); return r; }
    function countValidChars(s) { let n = 0; for (const ch of s) if (!isWhitespace(ch)) n++; return n; }
    function getCorrectValidCount() { return countValidChars(userInput); }
    function calcAccuracy() { const c = getCorrectValidCount(); if (c === 0) return 100; if (actualKeystrokes === 0) return 100; return Math.min(100, Math.round((c / actualKeystrokes) * 100)); }
    function getComparisonText() { return useLowerCaseMode ? normalizedText : originalText; }
    function findNextValid(start, text) { let p = start; while (p < text.length && isWhitespace(text[p])) p++; return (p < text.length && !isWhitespace(text[p])) ? p : -1; }
    function isValidText(t) { return countValidChars(t) > 0; }

    // 历史
    const HISTORY_KEY = 'typing_practice_history';
    function getHistory() { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; } }
    function saveHistory(r) { const h = getHistory(); h.unshift({ ...r, id: Date.now(), date: new Date().toISOString() }); if (h.length > 50) h.length = 50; try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch (e) { } }
    function renderHistoryList() {
        const history = getHistory();
        const list = document.getElementById('historyList');
        if (history.length === 0) { list.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">📭 暂无记录</div>'; return; }
        let h = history;
        if (currentSortMode === 'accuracy') h = [...history].sort((a, b) => b.accuracy - a.accuracy);
        else if (currentSortMode === 'newest') h = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        else h = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
        list.innerHTML = h.map((r, i) => {
            const c = r.accuracy >= 95 ? '#27ae60' : r.accuracy >= 80 ? '#f0a500' : '#e74c3c';
            return `<div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:#f8fafc;margin-bottom:4px;font-size:0.75rem;">
                <span style="font-weight:700;min-width:20px;">${i + 1}</span>
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHTML(r.title || '未命名')}</span>
                <span style="font-weight:700;color:${c};">${r.accuracy}%</span>
                <span style="color:#64748b;">${r.wpm}WPM</span>
                ${r.fullText ? `<button onclick="window._loadHistoryById(${r.id})" style="padding:3px 6px;border-radius:4px;border:1px solid #3b82f6;color:#3b82f6;background:#fff;cursor:pointer;font-size:0.65rem;">调用</button>` : ''}
                ${r.fullText && !r.isChallenge ? `<button onclick="window._challengeHistoryById(${r.id})" style="padding:3px 6px;border-radius:4px;border:1px solid #f59e0b;color:#d97706;background:#fff;cursor:pointer;font-size:0.65rem;">挑战</button>` : ''}
                <button onclick="window._deleteHistory(${r.id})" style="padding:3px 5px;border:none;color:#cbd5e1;background:none;cursor:pointer;font-size:0.7rem;">✕</button>
            </div>`;
        }).join('');
    }
    window._loadHistoryById = function (id) { const r = getHistory().find(x => x.id === id); if (r?.fullText) { challengeMode = false; challengeRecord = null; updateChallengeUI(); loadText(r.fullText); setTimeout(() => selectMode(r.useLowercase === true), 300); document.getElementById('historyModal').style.display = 'none'; } };
    window._challengeHistoryById = function (id) { const r = getHistory().find(x => x.id === id); if (r?.fullText && !r.isChallenge) { challengeMode = true; challengeRecord = r; updateChallengeUI(); loadText(r.fullText); setTimeout(() => selectMode(r.useLowercase === true), 300); document.getElementById('historyModal').style.display = 'none'; showToast('⚔️ 挑战模式！'); } };
    window._deleteHistory = function (id) { let h = getHistory(); h = h.filter(x => x.id !== id && x.challengeTargetId !== id); try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)) } catch (e) { } renderHistoryList(); };

    function updateChallengeUI() {
        challengeBanner.style.display = challengeMode ? 'inline-flex' : 'none';
        inputDisplayWrapper.classList.toggle('challenge-active', challengeMode);
    }

    // 渲染
    function renderOriginal() {
        if (!originalText) {
            originalTextEl.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;"><div style="font-size:2.5rem;">📝</div><p style="margin:8px 0;font-size:0.8rem;">上传或粘贴英文文本开始</p><div style="display:flex;gap:6px;justify-content:center;"><button class="btn btn-primary btn-sm" id="btnEmptyUpload">📁 上传</button><button class="btn btn-outline btn-sm" id="btnEmptyPaste">📋 粘贴</button><button class="btn btn-sample btn-sm" id="btnEmptySample">✨ 示例</button></div></div>`;
            setTimeout(() => {
                const b1 = document.getElementById('btnEmptyUpload'), b2 = document.getElementById('btnEmptyPaste'), b3 = document.getElementById('btnEmptySample');
                if (b1) b1.addEventListener('click', () => document.getElementById('fileInput').click());
                if (b2) b2.addEventListener('click', () => { document.getElementById('pasteTextarea').value = ''; document.getElementById('pasteModal').style.display = 'flex'; });
                if (b3) b3.addEventListener('click', () => { challengeMode = false; challengeRecord = null; updateChallengeUI(); document.getElementById('charCountModal').style.display = 'flex'; });
            }, 100);
            return;
        }
        let html = ''; const chars = [...originalText]; const len = userInput.length;
        for (let i = 0; i < chars.length; i++) {
            let cls = 'char ';
            if (i < len) cls += 'correct'; else if (i === len) cls += 'current'; else cls += 'pending';
            if (autoSkippedPositions.includes(i)) cls += ' auto-skipped';
            if (chars[i] === '\n') html += '<span class="' + cls + '">⏎</span><br>';
            else if (chars[i] === ' ') html += '<span class="' + cls + '" style="border-bottom:1px dotted #cbd5e1;"> </span>';
            else html += '<span class="' + cls + '">' + escapeHTML(chars[i]) + '</span>';
        }
        originalTextEl.innerHTML = html;
        if (isActive && !isFinished && len < chars.length) {
            const el = originalTextEl.querySelector('.char.current');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function renderUserInput() {
        if (!originalText && userInput.length === 0) { userInputDisplayEl.innerHTML = ''; return; }
        let html = '';
        for (const ch of userInput) {
            if (ch === '\n') html += '<span class="char correct-char">⏎</span><br>';
            else if (ch === ' ') html += '<span class="char correct-char" style="border-bottom:1px dotted #94a3b8;"> </span>';
            else html += '<span class="char correct-char">' + escapeHTML(ch) + '</span>';
        }
        if (isActive && !isFinished) html += '<span class="cursor-blink"> </span>';
        userInputDisplayEl.innerHTML = html;
        if (isActive && !isFinished) inputDisplayWrapper.scrollTop = inputDisplayWrapper.scrollHeight;
    }

    function updateStats() {
        statProgress.textContent = userInput.length + '/' + originalText.length;
        if (startTime && userInput.length > 0 && !isFinished) {
            const e = (Date.now() - startTime) / 1000, cv = getCorrectValidCount();
            statWPM.textContent = e > 0 ? Math.round((cv / 5) / (e / 60)) : 0;
            statTime.textContent = formatTime(e);
            const a = calcAccuracy();
            statAccuracy.textContent = a;
            statAccuracy.className = 'stat-value ' + (a >= 95 ? 'green' : a >= 80 ? '' : 'red');
        } else if (!startTime) {
            statTime.textContent = '00:00'; statWPM.textContent = '0';
            statAccuracy.textContent = '100'; statAccuracy.className = 'stat-value green';
        }
    }

    function updateUIState() {
        inputDisplayWrapper.classList.remove('active', 'finished', 'error-flash', 'challenge-active');
        if (isFinished) inputDisplayWrapper.classList.add('finished');
        else if (isActive) { inputDisplayWrapper.classList.add('active'); if (challengeMode) inputDisplayWrapper.classList.add('challenge-active'); }
        if (!originalText) tapText.textContent = '请先加载文本';
        else if (!modeSelected) tapText.textContent = '请选择打字模式';
        else if (!isActive && !isFinished) tapText.textContent = challengeMode ? '点击开始挑战' : '点击开始打字';
        else if (isFinished) tapText.textContent = '✅ 打字完成！';
        else tapText.textContent = '⌨️ 正在输入...';
        tapArea.style.display = (isActive && !isFinished) ? 'none' : 'flex';
        btnResetSmall.style.display = (isActive || isFinished) ? 'inline-flex' : 'none';
        btnBackToHome.style.display = (originalText && modeSelected) ? 'inline-flex' : 'none';
    }

    function flashError() {
        inputDisplayWrapper.classList.add('error-flash');
        setTimeout(() => inputDisplayWrapper.classList.remove('error-flash'), 250);
    }

    function startTimer() { if (!timerInterval) { startTime = Date.now(); timerInterval = setInterval(updateStats, 300); } }
    function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

    function processChar(key) {
        if (isFinished || !originalText || !modeSelected) return;
        const comp = getComparisonText();
        const pos = userInput.length;
        if (pos >= comp.length) { finishTyping(); return; }
        if (!isActive) { isActive = true; startTimer(); updateUIState(); }
        if (key.length !== 1) return;
        const charCode = key.charCodeAt(0);
        if (charCode < 32 && charCode !== 10 && charCode !== 13) return;
        const pk = useLowerCaseMode ? normalizeChar(key) : key;
        const target = comp[pos];
        if (pk === target) {
            userInput += originalText[pos]; actualKeystrokes++;
            renderOriginal(); renderUserInput(); updateStats();
            if (userInput.length >= comp.length) finishTyping();
            else checkTrailing();
            return;
        }
        if (isWhitespace(target)) {
            const next = findNextValid(pos, comp);
            if (next > pos && pk === comp[next]) {
                userInput += originalText.substring(pos, next) + originalText[next];
                for (let i = pos; i < next; i++) autoSkippedPositions.push(i);
                actualKeystrokes++;
                renderOriginal(); renderUserInput(); updateStats();
                if (userInput.length >= comp.length) finishTyping();
                else checkTrailing();
                return;
            }
            let aw = true;
            for (let i = pos; i < comp.length; i++) if (!isWhitespace(comp[i])) { aw = false; break; }
            if (aw) {
                let tr = ''; for (let i = pos; i < originalText.length; i++) if (isWhitespace(getComparisonText()[i] || originalText[i])) { tr += originalText[i]; autoSkippedPositions.push(i); }
                if (tr.length > 0) { userInput += tr; renderOriginal(); renderUserInput(); updateStats(); }
                finishTyping(); return;
            }
        }
        actualKeystrokes++; flashError();
        const ce = originalTextEl.querySelector('.char.current');
        if (ce) { ce.classList.add('error-flash'); setTimeout(() => ce.classList.remove('error-flash'), 400); }
        updateStats();
    }

    function checkTrailing() {
        if (isFinished) return;
        const comp = getComparisonText(); const pos = userInput.length;
        if (pos >= comp.length) { finishTyping(); return; }
        let aw = true;
        for (let i = pos; i < comp.length; i++) if (!isWhitespace(comp[i])) { aw = false; break; }
        if (aw && pos > 0) {
            let tr = ''; for (let i = pos; i < originalText.length; i++) if (isWhitespace(getComparisonText()[i] || originalText[i])) { tr += originalText[i]; autoSkippedPositions.push(i); }
            if (tr.length > 0) { userInput += tr; renderOriginal(); renderUserInput(); updateStats(); }
            finishTyping();
        }
    }

    function handleBackspace() {
        if (isFinished || userInput.length === 0) return;
        userInput = userInput.slice(0, -1);
        autoSkippedPositions = autoSkippedPositions.filter(p => p < userInput.length);
        renderOriginal(); renderUserInput(); updateStats();
    }

    function finishTyping() {
        if (isFinished) return;
        isFinished = true; isActive = false; stopTimer(); updateUIState();
        renderOriginal(); renderUserInput(); updateStats();
        const elapsed = (Date.now() - startTime) / 1000, cv = getCorrectValidCount(), acc = calcAccuracy();
        const wpm = elapsed > 0 ? Math.round((cv / 5) / (elapsed / 60)) : 0;
        statTime.textContent = formatTime(elapsed); statWPM.textContent = wpm;
        statAccuracy.textContent = acc;
        const title = userInput.substring(0, 30).replace(/\n/g, ' ');
        const rec = { title, fullText: originalText, mode: useLowerCaseMode ? '智能小写' : '严格匹配', useLowercase: useLowerCaseMode, accuracy: acc, wpm, actualKeystrokes, totalSkipped: autoSkippedPositions.length, elapsed, isChallenge: challengeMode };
        if (challengeMode && challengeRecord) { rec.challengeTargetId = challengeRecord.id; rec.isChallenge = true; }
        saveHistory(rec);
        if (challengeMode && challengeRecord) {
            const nS = acc * 0.6 + Math.min(wpm, 200) * 0.2;
            const oS = challengeRecord.accuracy * 0.6 + Math.min(challengeRecord.wpm, 200) * 0.2;
            let v, ic;
            if (nS > oS + 3) { v = '挑战成功！🏆'; ic = '🏆'; }
            else if (Math.abs(nS - oS) <= 3) { v = '平局 🤝'; ic = '🤝'; }
            else { v = '挑战失败 💪'; ic = '💪'; }
            setTimeout(() => {
                const d = document.getElementById('challengeResultDialog');
                d.innerHTML = `<div style="text-align:center;"><div style="font-size:3rem;">${ic}</div><h3>${v}</h3><div style="display:flex;gap:10px;justify-content:center;margin:12px 0;"><div><b style="color:#3b82f6;">${acc}%</b><br><small>${wpm}WPM</small></div><div>VS</div><div><b>${challengeRecord.accuracy}%</b><br><small>${challengeRecord.wpm}WPM</small></div></div><div style="display:flex;gap:6px;justify-content:center;"><button class="btn btn-primary btn-sm" id="btnCRetry">🔄 再挑战</button><button class="btn btn-outline btn-sm" id="btnCHome">🏠 返回</button><button class="btn btn-ghost btn-sm" id="btnCClose">关闭</button></div></div>`;
                document.getElementById('challengeResultModal').style.display = 'flex';
                document.getElementById('btnCRetry').addEventListener('click', () => { document.getElementById('challengeResultModal').style.display = 'none'; resetTypingState(); focusInput(); });
                document.getElementById('btnCHome').addEventListener('click', () => { document.getElementById('challengeResultModal').style.display = 'none'; resetAll(); });
                document.getElementById('btnCClose').addEventListener('click', () => { document.getElementById('challengeResultModal').style.display = 'none'; });
            }, 400);
        } else {
            setTimeout(() => {
                const d = document.getElementById('resultDialog');
                let g, ic2;
                if (acc >= 98 && wpm >= 60) { g = 'S - 卓越'; ic2 = '🏆'; }
                else if (acc >= 95) { g = 'A - 优秀'; ic2 = '🌟'; }
                else if (acc >= 85) { g = 'B - 良好'; ic2 = '👍'; }
                else if (acc >= 70) { g = 'C - 一般'; ic2 = '📝'; }
                else { g = 'D - 需改进'; ic2 = '💪'; }
                d.innerHTML = `<div style="text-align:center;"><div style="font-size:3rem;">${ic2}</div><h3>${g}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;"><div style="background:#f8fafc;border-radius:8px;padding:10px;"><div style="font-size:1.3rem;font-weight:700;color:#f0a500;">${wpm}</div><small>WPM</small></div><div style="background:#f8fafc;border-radius:8px;padding:10px;"><div style="font-size:1.3rem;font-weight:700;color:${acc >= 95 ? '#27ae60' : '#e74c3c'};">${acc}%</div><small>准确率</small></div></div><div style="display:flex;gap:6px;justify-content:center;"><button class="btn btn-primary btn-sm" id="btnRetry">🔄 重新练习</button><button class="btn btn-success btn-sm" id="btnSwitchMode">🔀 切换模式</button><button class="btn btn-outline btn-sm" id="btnBackToStart">🏠 返回</button></div></div>`;
                document.getElementById('resultModal').style.display = 'flex';
                document.getElementById('btnRetry').addEventListener('click', () => { document.getElementById('resultModal').style.display = 'none'; resetTypingState(); focusInput(); });
                document.getElementById('btnSwitchMode').addEventListener('click', () => { document.getElementById('resultModal').style.display = 'none'; useLowerCaseMode = !useLowerCaseMode; updateModeIndicator(); resetTypingState(); focusInput(); });
                document.getElementById('btnBackToStart').addEventListener('click', () => { document.getElementById('resultModal').style.display = 'none'; resetAll(); });
            }, 300);
        }
    }

    function resetTypingState() {
        userInput = ''; actualKeystrokes = 0; autoSkippedPositions = [];
        startTime = null; isFinished = false; isActive = false;
        if (timerInterval) clearInterval(timerInterval); timerInterval = null;
        inputBuffer = ''; hiddenEditable.textContent = '';
        renderOriginal(); renderUserInput(); updateStats(); updateUIState();
        statTime.textContent = '00:00'; statWPM.textContent = '0'; statAccuracy.textContent = '100';
        statAccuracy.className = 'stat-value green'; statProgress.textContent = '0/' + originalText.length;
    }

    function resetAll() {
        originalText = ''; normalizedText = ''; userInput = '';
        actualKeystrokes = 0; autoSkippedPositions = [];
        startTime = null; isFinished = false; isActive = false;
        modeSelected = false; useLowerCaseMode = false;
        challengeMode = false; challengeRecord = null;
        updateChallengeUI(); stopTimer();
        inputBuffer = ''; hiddenEditable.textContent = '';
        renderOriginal(); renderUserInput(); updateStats(); updateUIState();
        updateModeIndicator(); updateTextInfo();
        statTime.textContent = '00:00'; statWPM.textContent = '0'; statAccuracy.textContent = '100';
        statAccuracy.className = 'stat-value green'; statProgress.textContent = '0/0';
        btnResetSmall.style.display = 'none'; btnBackToHome.style.display = 'none';
        document.getElementById('resultModal').style.display = 'none';
    }

    function loadText(text) {
        let c = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        c = c.replace(/\n{3,}$/g, '\n\n');
        if (!isValidText(c)) { resetAll(); showInvalidDialog(c); return false; }
        originalText = c; normalizedText = normalizeText(c);
        userInput = ''; actualKeystrokes = 0; autoSkippedPositions = [];
        startTime = null; isFinished = false; isActive = false;
        modeSelected = false; useLowerCaseMode = false;
        stopTimer(); inputBuffer = ''; hiddenEditable.textContent = '';
        renderOriginal(); renderUserInput(); updateStats(); updateUIState();
        updateModeIndicator(); updateTextInfo();
        btnResetSmall.style.display = 'none';
        const vc = countValidChars(originalText);
        showToast('✅ ' + originalText.length + '字符（' + vc + '有效）');
        document.getElementById('modeSelectionOverlay').style.display = 'flex';
        return true;
    }

    function selectMode(lc) {
        useLowerCaseMode = lc; modeSelected = true;
        document.getElementById('modeSelectionOverlay').style.display = 'none';
        updateModeIndicator(); resetTypingState(); updateUIState();
        showToast('🎯 ' + (lc ? '智能小写' : '严格匹配') + '模式');
        setTimeout(() => focusInput(), 400);
    }

    function updateModeIndicator() {
        if (modeSelected && originalText) {
            modeIndicator.style.display = 'inline-flex';
            modeIndicator.innerHTML = useLowerCaseMode ? '🔤 智能小写' : '📝 严格匹配';
            modeIndicator.style.background = useLowerCaseMode ? '#ede9fe' : '#dbeafe';
            modeIndicator.style.color = useLowerCaseMode ? '#6d28d9' : '#1e40af';
        } else modeIndicator.style.display = 'none';
    }

    function updateTextInfo() {
        textInfo.textContent = originalText ? '共' + originalText.length + '字符（' + countValidChars(originalText) + '有效）' : '';
    }

    function showInvalidDialog(t) {
        document.getElementById('invalidTextTitle').textContent = (!t || t.trim().length === 0) ? '📄 文本为空' : '🔤 无法练习';
        document.getElementById('invalidTextMessage').textContent = (!t || t.trim().length === 0) ? '文本内容为空' : '没有英文字母或数字';
        document.getElementById('invalidTextModal').style.display = 'flex';
    }

    function focusInput() {
        if (isFinished) return;
        if (!originalText) { showToast('⚠️ 请先加载文本'); return; }
        if (!modeSelected) { document.getElementById('modeSelectionOverlay').style.display = 'flex'; return; }
        hiddenEditable.focus();
    }

    virtualInputZone.addEventListener('click', focusInput);
    inputDisplayWrapper.addEventListener('click', focusInput);

    hiddenEditable.addEventListener('focus', () => {
        if (!isActive && !isFinished && originalText && modeSelected) {
            updateUIState();
        }
    });

    hiddenEditable.addEventListener('beforeinput', function (e) {
        e.preventDefault();
        if (isFinished) return;
        if (!originalText || !modeSelected) {
            hiddenEditable.textContent = '';
            return;
        }
        const inputType = e.inputType;
        if (inputType === 'deleteContentBackward' || inputType === 'deleteContentForward') {
            handleBackspace();
            hiddenEditable.textContent = '';
            return;
        }
        if (inputType === 'insertText' && e.data) {
            const text = e.data;
            for (const ch of text) {
                if (isFinished) break;
                processChar(ch);
            }
            hiddenEditable.textContent = '';
            return;
        }
        if (inputType === 'insertFromPaste') {
            const text = (e.dataTransfer?.getData('text/plain')) || '';
            for (const ch of text) {
                if (isFinished) break;
                processChar(ch);
            }
            hiddenEditable.textContent = '';
            return;
        }
        hiddenEditable.textContent = '';
    });

    hiddenEditable.addEventListener('compositionstart', function () {
        hiddenEditable.dataset.composing = 'true';
    });

    hiddenEditable.addEventListener('compositionend', function (e) {
        hiddenEditable.dataset.composing = 'false';
        if (e.data) {
            for (const ch of e.data) {
                if (isFinished) break;
                processChar(ch);
            }
        }
        hiddenEditable.textContent = '';
    });

    hiddenEditable.addEventListener('input', function (e) {
        if (hiddenEditable.textContent && hiddenEditable.dataset.composing !== 'true') {
            const text = hiddenEditable.textContent;
            for (const ch of text) {
                if (isFinished) break;
                processChar(ch);
            }
            hiddenEditable.textContent = '';
        }
    });

    hiddenEditable.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            handleBackspace();
        }
    });

    const WORD_BANK = {
        articles: ['a', 'an', 'the'],
        conjunctions: ['and', 'but', 'or', 'yet', 'so'],
        prepositions: ['in', 'on', 'at', 'by', 'to', 'of', 'for', 'with', 'from'],
        pronouns: ['I', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her'],
        verbs: ['is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did',
            'go', 'goes', 'make', 'makes', 'take', 'takes', 'give', 'know', 'think',
            'see', 'come', 'find', 'keep', 'get', 'let', 'put', 'run', 'say', 'use'],
        adjectives: ['good', 'new', 'old', 'big', 'small', 'great', 'high', 'long',
            'quick', 'happy', 'brave', 'quiet', 'bright', 'dark', 'wild', 'young',
            'kind', 'true', 'free', 'clear', 'strong'],
        adverbs: ['very', 'just', 'quite', 'always', 'never', 'often', 'quickly',
            'well', 'much', 'now', 'then', 'here', 'there'],
        nouns: ['time', 'day', 'night', 'world', 'life', 'hand', 'part', 'place',
            'week', 'year', 'work', 'way', 'thing', 'name', 'home', 'water', 'light',
            'mind', 'end', 'fact', 'group', 'number', 'job'],
        pangramWords: ['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog', 'wizard',
            'jump', 'vex', 'zephyr', 'sphinx', 'quartz', 'judge', 'myth', 'jazz',
            'excel', 'quiz', 'zebra', 'jungle', 'voyage', 'exotic', 'puzzle', 'majesty',
            'galaxy', 'zenith', 'vortex', 'breeze']
    };
    function pick(a) { return a[Math.floor(Math.random() * a.length)] }
    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1) }
    function hasAllLetters(t) { const s = new Set(); for (const ch of t.toLowerCase()) if (ch >= 'a' && ch <= 'z') s.add(ch); return s.size === 26 }
    function getMissingLetters(t) { const p = new Set(); for (const ch of t.toLowerCase()) if (ch >= 'a' && ch <= 'z') p.add(ch); const m = []; for (let i = 97; i <= 122; i++) { const l = String.fromCharCode(i); if (!p.has(l)) m.push(l) } return m }
    function getInjectWords(ml) {
        const m = {
            a: ['amazing', 'always'],
            b: ['beautiful', 'brave'],
            c: ['quick', 'quite'],
            d: ['wonderful', 'world'],
            e: ['excellent', 'every'],
            f: ['favorite', 'famous'],
            g: ['great', 'good'],
            h: ['happy', 'heart'],
            i: ['imagine', 'inside'],
            j: ['joyful', 'judge'],
            k: ['kind', 'know'],
            l: ['lovely', 'light'],
            m: ['majesty', 'magic'],
            n: ['nature', 'noble'],
            o: ['observe', 'ocean'],
            p: ['perfect', 'power'],
            q: ['quest', 'quick'],
            r: ['really', 'right'],
            s: ['simple', 'strong'],
            t: ['travel', 'truth'],
            u: ['unique', 'useful'],
            v: ['value', 'vivid'],
            w: ['welcome', 'wisdom'],
            x: ['explore', 'extra'],
            y: ['yearly', 'young'],
            z: ['amaze', 'breeze', 'puzzle', 'zebra', 'zero', 'zone', 'lazy', 'size']
        };
        let w = [];
        for (const l of ml)
            if (m[l]) w.push(pick(m[l]));
        return w
    }
    function generateSampleText(tl) {
        if (tl < 27) tl = 27;
        const temps = [() => `${pick(WORD_BANK.articles)} ${pick(WORD_BANK.adjectives)} ${pick(WORD_BANK.nouns)} ${pick(WORD_BANK.verbs)} ${pick(WORD_BANK.prepositions)} ${pick(WORD_BANK.articles)} ${pick(WORD_BANK.adjectives)} ${pick(WORD_BANK.nouns)}`, () => `${pick(WORD_BANK.pronouns)} ${pick(WORD_BANK.verbs)} ${pick(WORD_BANK.adverbs)} ${pick(WORD_BANK.adjectives)} ${pick(WORD_BANK.conjunctions)} ${pick(WORD_BANK.verbs)} ${pick(WORD_BANK.adjectives)} ${pick(WORD_BANK.nouns)}`, () => `${pick(WORD_BANK.articles)} ${pick(WORD_BANK.pangramWords)} ${pick(WORD_BANK.nouns)} ${pick(WORD_BANK.verbs)} ${pick(WORD_BANK.prepositions)} ${pick(WORD_BANK.articles)} ${pick(WORD_BANK.pangramWords)} ${pick(WORD_BANK.nouns)}`];
        let ss = [], total = 0, att = 0;
        while (total < tl && att < 200) { att++; let s = pick(temps)(); if (Math.random() < 0.5) s = capitalize(s); const sp = s + '.'; const nt = total + sp.length + (ss.length > 0 ? 1 : 0); if (nt <= tl + 50) { ss.push(sp); total = ss.join(' ').length } }
        let text = ss.join(' ');
        if (!hasAllLetters(text)) { const iw = getInjectWords(getMissingLetters(text)); if (iw.length > 0) text = text + ' Also: ' + iw.join(' ') + '.' }
        text = text.trim(); if (text.length > 0 && text[0] >= 'a' && text[0] <= 'z') text = capitalize(text);
        if (!text.endsWith('.')) text += '.'; return text;
    }

    document.getElementById('btnBackToHome').addEventListener('click', () => {
        if (isActive && !isFinished && userInput.length > 0) { document.getElementById('confirmBackMsg').textContent = '进度将丢失'; document.getElementById('confirmBackModal').style.display = 'flex'; }
        else if (originalText && !isActive) { document.getElementById('confirmBackModal').style.display = 'flex'; }
        else resetAll();
    });
    document.getElementById('btnConfirmBack').addEventListener('click', () => { document.getElementById('confirmBackModal').style.display = 'none'; resetAll(); });
    document.getElementById('btnConfirmCancel').addEventListener('click', () => document.getElementById('confirmBackModal').style.display = 'none');

    document.getElementById('btnTutorial').addEventListener('click', () => document.getElementById('tutorialModal').style.display = 'flex');
    document.getElementById('btnCloseTutorial').addEventListener('click', () => document.getElementById('tutorialModal').style.display = 'none');

    document.getElementById('btnSampleText').addEventListener('click', () => { challengeMode = false; challengeRecord = null; updateChallengeUI(); document.getElementById('charCountModal').style.display = 'flex'; });
    btnResetSmall.addEventListener('click', () => { resetTypingState(); focusInput(); });

    document.querySelectorAll('.char-preset').forEach(b => b.addEventListener('click', function () { document.getElementById('charCountInput').value = this.dataset.count; }));
    document.getElementById('btnCharConfirm').addEventListener('click', () => {
        const v = parseInt(document.getElementById('charCountInput').value);
        if (isNaN(v) || v < 27) { document.getElementById('charHint').textContent = '⚠️ 至少27'; return; }
        document.getElementById('charCountModal').style.display = 'none';
        loadText(generateSampleText(v));
    });
    document.getElementById('btnCharCancel').addEventListener('click', () => document.getElementById('charCountModal').style.display = 'none');
    document.getElementById('btnInvalidRetry').addEventListener('click', () => { document.getElementById('invalidTextModal').style.display = 'none'; document.getElementById('charCountModal').style.display = 'flex'; });
    document.getElementById('btnCloseInvalid').addEventListener('click', () => document.getElementById('invalidTextModal').style.display = 'none');
    document.getElementById('btnModeLowercase').addEventListener('click', () => selectMode(true));
    document.getElementById('btnModeNormal').addEventListener('click', () => selectMode(false));
    document.getElementById('btnModeCancel').addEventListener('click', () => { document.getElementById('modeSelectionOverlay').style.display = 'none'; if (!modeSelected && originalText) showToast('💡 请选择模式'); });
    document.getElementById('btnPaste').addEventListener('click', () => { document.getElementById('pasteTextarea').value = ''; document.getElementById('pasteModal').style.display = 'flex'; });
    document.getElementById('btnPasteCancelTop').addEventListener('click', () => document.getElementById('pasteModal').style.display = 'none');
    document.getElementById('btnPasteCancel').addEventListener('click', () => document.getElementById('pasteModal').style.display = 'none');
    document.getElementById('btnPasteConfirm').addEventListener('click', () => { const t = document.getElementById('pasteTextarea').value; if (!t.trim()) { showToast('⚠️ 文本为空'); return; } if (loadText(t)) document.getElementById('pasteModal').style.display = 'none'; });
    document.getElementById('btnUpload').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', function () { const f = this.files[0]; if (!f) return; const r = new FileReader(); r.onload = function (e) { loadText(e.target.result); }; r.readAsText(f, 'UTF-8'); this.value = ''; });
    document.getElementById('btnReset').addEventListener('click', () => { if (originalText) { resetTypingState(); focusInput(); } else showToast('⚠️ 请先加载'); });
    document.getElementById('btnHistory').addEventListener('click', () => { renderHistoryList(); document.getElementById('historyModal').style.display = 'flex'; });
    document.getElementById('btnCloseHistory').addEventListener('click', () => document.getElementById('historyModal').style.display = 'none');
    document.getElementById('btnClearHistory').addEventListener('click', () => { if (confirm('确定清空？')) { localStorage.removeItem(HISTORY_KEY); renderHistoryList(); } });

    document.querySelectorAll('#sortTabs .sort-tab').forEach(tab => { tab.addEventListener('click', function () { document.querySelectorAll('#sortTabs .sort-tab').forEach(t => { t.classList.remove('active'); t.style.background = 'transparent'; t.style.color = '#64748b'; }); this.classList.add('active'); this.style.background = '#fff'; this.style.color = '#1e293b'; this.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; currentSortMode = this.dataset.sort; renderHistoryList(); }); });

    document.querySelectorAll('.modal-overlay').forEach(ov => { ov.addEventListener('click', function (e) { if (e.target === this) this.style.display = 'none'; }); });

    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay').forEach(m => { if (m.style.display === 'flex') m.style.display = 'none'; }); } });

    document.addEventListener('touchmove', function (e) { if (!e.target.closest('.original-text') && !e.target.closest('.input-display-section') && !e.target.closest('.modal-dialog')) { e.preventDefault(); } }, { passive: false });

    function init() {
        renderOriginal(); renderUserInput(); updateStats(); updateUIState(); updateModeIndicator(); updateTextInfo();
        setTimeout(() => { if (splashScreen) splashScreen.remove(); }, 2800);
    }
    init();
    console.log('⌨️ 英文打字练习Deepseek版 - 手机优化版');
})();