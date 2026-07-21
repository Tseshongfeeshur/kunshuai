(function () {
    var D = function (id) {
        return document.getElementById(id);
    };
    var originalTextEl = D('originalText'),
        userInputDisplayEl = D('userInputDisplay'),
        inputDisplayWrapper = D('inputDisplayWrapper'),
        inputDisplaySection = D('inputDisplaySection'),
        virtualInputZone = D('virtualInputZone'),
        hiddenEditable = D('hiddenEditable'),
        tapArea = D('tapArea'),
        tapText = D('tapText'),
        statTimeEl = D('statTime'),
        statWPMEl = D('statWPM'),
        statAccuracyEl = D('statAccuracy'),
        statProgressEl = D('statProgress'),
        modeIndicator = D('modeIndicator'),
        textInfo = D('textInfo'),
        btnResetSmall = D('btnResetSmall'),
        timeLimitHint = D('timeLimitHint'),
        challengeBanner = D('challengeBanner'),
        partnerTag = D('partnerTag'),
        toastContainer = D('toastContainer'),
        splashScreen = D('splashScreen'),
        originalHeader = D('originalHeader'),
        statsBar = D('statsBar'),
        fileInput = D('fileInput'),
        dialogOverlay = D('dialogOverlay'),
        dialogBox = D('dialogBox'),
        statsDialogBtns = D('statsDialogBtns');

    var originalText = '',
        normalizedText = '',
        userInput = '',
        actualKeystrokes = 0,
        correctKeystrokes = 0,
        autoSkippedPositions = [],
        startTime = null,
        timerInterval = null,
        timeCheckInterval = null,
        isFinished = false,
        isActive = false,
        useLowerCaseMode = false,
        modeSelected = false,
        challengeMode = false,
        warningSoundPlayed = false,
        consecutiveErrors = 0,
        currentPartner = null,
        disabledPartners = [],
        currentPassword = '',
        excSwapPartner = null,
        simpleMode = false,
        simpleBonus = null;
    var CONSECUTIVE_ERROR_THRESHOLD = 4;
    var dialogUsedIndices = {},
        failDialogUsedIndices = {};

    var partnerEmojis = {
        'KG': '👮🍍',
        '云汐': '🪣🌸',
        'Q太郎': '🍔🦍',
        '任寂阳': '💻🧣',
        '南宫乘风': '🎵🎸',
        '楚鸢': '🖌️🎨',
        '刘天天': '🐶🐱',
        '南宫雅琪': '⛓️👤'
    };
    var partners = {
        'KG': {
            name: 'KG',
            timeLimit: 60,
            wpmTarget: 29,
            accTarget: 80,
            textLength: 200,
            errorSkip: true,
            desc: 'KG是一个可靠的队友，能为风格激进的伙伴默默善后。他打字出错时，不需要再重打正确的字符，系统将自动跳过该字符，继续打下一个字符。但准确率会照常计算错误。'
        },
        '云汐': {
            name: '云汐',
            timeLimit: 110,
            wpmTarget: 22,
            accTarget: 80,
            textLength: 200,
            desc: '云汐的共情力能抚平焦躁。她的计时时限为110秒，WPM只需大于等于22。'
        },
        'Q太郎': {
            name: 'Q太郎',
            timeLimit: 60,
            wpmTarget: 29,
            accTarget: 80,
            textLength: 200,
            skipPunctuation: true,
            desc: '在世界各地流浪长大的Q太郎掌握着多门语言，但每一门都口音浓重，口齿不清——包括英语。遇到逗号、句号和空格时，他打任何字符都算对，但计算准确率时不算在内。'
        },
        '任寂阳': {
            name: '任寂阳',
            timeLimit: 60,
            wpmTarget: 29,
            accTarget: 80,
            textLength: 200,
            autoPass: true,
            desc: '精通计算机工程技术、打字极度熟练的任寂阳，可以直接带你通关这个游艺项目，但你需要给他50枚艾雨柔硬币作为交换。'
        },
        '南宫乘风': {
            name: '南宫乘风',
            timeLimit: 60,
            wpmTarget: 29,
            accTarget: 80,
            textLength: 200,
            customKeys: 'sdfghjk',
            desc: '比起打字，南宫乘风更擅长弹奏键盘乐器。她面临的不是包含全部字母的示例文本，而是仅包含sdfghjk这7个小写字母随机排列的长串文本。'
        },
        '楚鸢': {
            name: '楚鸢',
            timeLimit: 60,
            wpmTarget: 29,
            accTarget: 80,
            textLength: 120,
            desc: '楚鸢不擅长文化课的应试，面对过长的文本总是非常头疼。她所面临的示例文本仅有约120字符。'
        },
        '刘天天': {
            name: '刘天天',
            timeLimit: 60,
            wpmTarget: 29,
            accTarget: 68,
            textLength: 200,
            desc: '拼写出错是小学生作业本上常见的事情。刘天天的准确率只需大于等于68%即可。'
        },
        '南宫雅琪': {
            name: '南宫雅琪',
            timeLimit: 60,
            wpmTarget: 29,
            accTarget: 80,
            textLength: 200,
            customText: true,
            desc: '桀骜不驯、不依不饶的南宫雅琪拒绝服从调剂，不打示例文本，而是采用自己粘贴或上传的文本。粘贴或上传的文本必须大于等于200字符，必须只包含英文字母、英文逗号、英文句号和空格，必须包含全部26个英文字母。'
        }
    };

    var simpleBonuses = {
        acc68: {
            type: 'acc68',
            text: '已使用简单券🎫，准确率只需大于等于68%即可',
            apply: function (p) {
                p.accTarget = 68;
            }
        },
        short120: {
            type: 'short120',
            text: '已使用简单券🎫，示例文本仅有约120字符',
            apply: function (p) {
                p.textLength = 120;
            }
        },
        time110: {
            type: 'time110',
            text: '已使用简单券🎫，计时时限为110秒，WPM只需大于等于22',
            apply: function (p) {
                p.timeLimit = 110;
                p.wpmTarget = 22;
            }
        },
        kgSkip: {
            type: 'kgSkip',
            text: '已使用简单券🎫，打字出错时，不需要再重打正确的字符，系统将自动跳过该字符，继续打下一个字符，但准确率会照常计算错误',
            apply: function (p) {
                p.errorSkip = true;
            }
        }
    };
    function getSimpleBonusOptions(partner) {
        var o = [];
        if (partner === 'KG') o = [simpleBonuses.acc68, simpleBonuses.short120, simpleBonuses.time110];
        else if (partner === '云汐') o = [simpleBonuses.acc68, simpleBonuses.short120, simpleBonuses.kgSkip];
        else if (partner === '楚鸢') o = [simpleBonuses.acc68, simpleBonuses.kgSkip, simpleBonuses.time110];
        else if (partner === '刘天天') o = [simpleBonuses.kgSkip, simpleBonuses.short120, simpleBonuses.time110];
        else if (partner === 'Q太郎' || partner === '南宫乘风' || partner === '南宫雅琪') o = [simpleBonuses.acc68, simpleBonuses.short120, simpleBonuses.time110, simpleBonuses.kgSkip];
        return o;
    }
    function applySimpleBonus(partner, pd) {
        if (!simpleMode || partner === '任寂阳') return;
        var opts = getSimpleBonusOptions(partner);
        if (opts.length === 0) return;
        simpleBonus = opts[Math.floor(Math.random() * opts.length)];
        simpleBonus.apply(pd);
    }

    var gameDialogData = {
        'KG': {
            normal: {
                '艾雨柔': '让我们成为默契的打字搭档吧！',
                'KG': '即便出错了也没关系，警察叔叔守护着你哦。放心去做吧。'
            },
            urgent: {
                '艾雨柔': '啊啊啊！！来不及了，快一点啊！！',
                'KG': '别慌，警察叔叔在努力！'
            }
        },
        '云汐': {
            normal: {
                '艾雨柔': '放心，我不会让你受到伤害的！',
                '云汐': '雨柔姐，请加油！'
            },
            urgent: {
                '艾雨柔': '啊啊啊！！时间快要到了！！',
                '云汐': '没，没事的雨柔姐！放，放轻松！'
            }
        },
        'Q太郎': {
            normal: {
                '艾雨柔': 'XB之魂在键盘上熊熊燃烧！',
                'Q太郎': '康康俺们大力组合滴厉害！'
            },
            urgent: {
                '艾雨柔': '快一点…！时间要来不及了…！',
                'Q太郎': '锥后鸡喵也4忒关间滴！让俺赖泥砖橘4叭！'
            }
        },
        '南宫乘风': {
            normal: {
                '艾雨柔': '这就是摇滚的节奏吗！',
                '南宫乘风': '打字和弹奏和弦也没有什么两样嘛！'
            },
            urgent: {
                '艾雨柔': '乘风姐！！快要来不及了！！',
                '南宫乘风': '别怕！有我在，没问题的！！'
            }
        },
        '楚鸢': {
            normal: {
                '艾雨柔': '是时候展现我们女子组的默契了！',
                '楚鸢': '只要我想的话也是能做到的！'
            },
            urgent: {
                '艾雨柔': '冷静一点，好好呼吸！',
                '楚鸢': '啊啊啊……！！忘记呼吸了……！！'
            }
        },
        '刘天天': {
            normal: {
                '艾雨柔': '你看，"爪子"要这样放哦。',
                '刘天天': '雨柔姐姐，加油喵！我会支持帅气的雨柔姐姐喵！'
            },
            urgent: {
                '艾雨柔': '越是最后几秒钟，越要沉着冷静！',
                '刘天天': '我发誓要保护雨柔姐姐的喵！一决胜负吧汪！'
            }
        },
        '南宫雅琪': {
            normal: {
                '艾雨柔': '南宫雅琪，请不要偷懒…！',
                '南宫雅琪': '艾雨柔，你可得好好打字啊！别让人家死掉了啦！'
            },
            urgent: {
                '艾雨柔': '我在努力！请你安静一点，不要催了好吗！',
                '南宫雅琪': '啊呀呀！人家要死掉了啦！！艾雨柔你打得快点啊！！'
            }
        }
    };
    function getGameDialog(partner, speaker) {
        if (!gameDialogData[partner]) return null;
        var isUrgent = false;
        if (startTime) {
            var elapsed = (Date.now() - startTime) / 1000;
            var remaining = getTimeLimit() - elapsed;
            isUrgent = remaining <= 10 && remaining > 0;
        }
        var dialogs = isUrgent ? gameDialogData[partner].urgent : gameDialogData[partner].normal;
        return dialogs[speaker] || null;
    }

    function showGameBubble(speaker) {
        var existingBubble = document.querySelector('.game-dialog-bubble');
        if (existingBubble) existingBubble.remove();
        var text = getGameDialog(currentPartner, speaker);
        if (!text) return;
        var bg = getSpeakerColor(speaker);
        var tc = getSpeakerTextColor(speaker);
        var bubble = document.createElement('div');
        bubble.className = 'game-dialog-bubble';
        bubble.innerHTML = '<span class="bubble-speaker" style="color:' + tc + ';background:' + bg + ';padding:2px 8px;border-radius:8px;display:inline-block;">' + escapeHTML(speaker) + '</span> <span class="bubble-text">' + escapeHTML(text) + '</span>';
        var removeBubble = function (e) {
            e.stopPropagation();
            e.preventDefault();
            if (bubble.parentNode) bubble.remove();
            setTimeout(function () {
                hiddenEditable.focus();
            },
                50);
        };
        bubble.addEventListener('mousedown', removeBubble);
        bubble.addEventListener('touchstart', removeBubble, {
            passive: false
        });
        document.body.appendChild(bubble);
        setTimeout(function () {
            if (bubble.parentNode) bubble.remove();
        },
            3500);
        setTimeout(function () {
            hiddenEditable.focus();
        },
            100);
    }

    function setupGameDialogButtons() {
        while (statsDialogBtns.firstChild) statsDialogBtns.removeChild(statsDialogBtns.firstChild);
        if (!currentPartner || currentPartner === '任寂阳') return;
        var partnerName = currentPartner;
        var ayrColor = getSpeakerColor('艾雨柔');
        var ayrTextColor = getSpeakerTextColor('艾雨柔');
        var ptColor = getSpeakerColor(partnerName);
        var ptTextColor = getSpeakerTextColor(partnerName);
        var btnAyr = document.createElement('button');
        btnAyr.className = 'btn btn-xs';
        btnAyr.style.cssText = 'background:' + ayrColor + ';color:' + ayrTextColor + ';border:none;';
        btnAyr.textContent = '💬艾雨柔';
        var btnPartner = document.createElement('button');
        btnPartner.className = 'btn btn-xs';
        btnPartner.style.cssText = 'background:' + ptColor + ';color:' + ptTextColor + ';border:none;';
        btnPartner.textContent = '💬' + partnerName;
        btnAyr.ontouchstart = function (e) {
            e.stopPropagation();
            e.preventDefault();
            showGameBubble('艾雨柔');
            return false;
        };
        btnAyr.onmousedown = function (e) {
            e.stopPropagation();
            e.preventDefault();
            showGameBubble('艾雨柔');
            return false;
        };
        btnPartner.ontouchstart = function (e) {
            e.stopPropagation();
            e.preventDefault();
            showGameBubble(partnerName);
            return false;
        };
        btnPartner.onmousedown = function (e) {
            e.stopPropagation();
            e.preventDefault();
            showGameBubble(partnerName);
            return false;
        };
        statsDialogBtns.appendChild(btnAyr);
        statsDialogBtns.appendChild(btnPartner);
    }

    var failDialogData = {
        'KG': [[{
            speaker: '艾雨柔',
            text: '诶…啊啊……不要……'
        },
        {
            speaker: 'KG',
            text: '咕……啊啊啊……！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和KG被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: 'KG',
            text: '看来……已经不行了啊……'
        },
        {
            speaker: '艾雨柔',
            text: '怎么会这样……！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和KG被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: 'KG',
            text: '对不起……呀，警察叔叔也……无能为力了……'
        },
        {
            speaker: '艾雨柔',
            text: '就到此……为止了吗……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和KG被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '艾雨柔',
            text: '无法……呼吸了……'
        },
        {
            speaker: 'KG',
            text: '至少……先从我开始……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和KG被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }]],
        '云汐': [[{
            speaker: '云汐',
            text: '对…不起……雨柔…姐……'
        },
        {
            speaker: '艾雨柔',
            text: '振作一点啊…云汐……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和云汐被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '云汐',
            text: '啊呜呜……我…做不到了……'
        },
        {
            speaker: '艾雨柔',
            text: '云汐……！坚持住……！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和云汐被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '云汐',
            text: '呜……！不行了！'
        },
        {
            speaker: '艾雨柔',
            text: '快躲起来……！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和云汐被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }]],
        'Q太郎': [[{
            speaker: 'Q太郎',
            text: '被摆力亿道噻！！'
        },
        {
            speaker: '艾雨柔',
            text: '不要啊…！Q太郎先生…！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和Q太郎被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: 'Q太郎',
            text: '对不住，艾雨柔……！鸡鞭4俺，也……！'
        },
        {
            speaker: '艾雨柔',
            text: '就到此……为止了吗……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和Q太郎被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: 'Q太郎',
            text: '燃尽力……'
        },
        {
            speaker: '艾雨柔',
            text: '不要站起来啊，Q太郎先生……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和Q太郎被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }]],
        '南宫乘风': [[{
            speaker: '南宫乘风',
            text: '不好，轻敌了！！可恶！！'
        },
        {
            speaker: '艾雨柔',
            text: '怎么会这样……！乘风姐！！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和南宫乘风被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '南宫乘风',
            text: '可恶！雨柔…对不起！！'
        },
        {
            speaker: '艾雨柔',
            text: '嘎啊啊…！！乘风姐快跑啊！！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和南宫乘风被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '艾雨柔',
            text: '无…无法呼吸了……'
        },
        {
            speaker: '南宫乘风',
            text: '喂，什么…！不要啊……！！！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和南宫乘风被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }]],
        '楚鸢': [[{
            speaker: '楚鸢',
            text: '即使只有雨柔也…！快跑！！'
        },
        {
            speaker: '艾雨柔',
            text: '动，动不了了…！！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和楚鸢被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '楚鸢',
            text: '动不了……救救我……老师……'
        },
        {
            speaker: '艾雨柔',
            text: '怎么会这样……不要啊…！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和楚鸢被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '楚鸢',
            text: '呜……使不出力气了……'
        },
        {
            speaker: '艾雨柔',
            text: '楚鸢……对不起……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和楚鸢被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }]],
        '刘天天': [[{
            speaker: '刘天天',
            text: '发生什么了喵？好恐怖汪！'
        },
        {
            speaker: '艾雨柔',
            text: '快藏到我身后！！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和刘天天被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '刘天天',
            text: '呜……好想回家……好害怕喵……'
        },
        {
            speaker: '艾雨柔',
            text: '对不起……我没能保护你……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和刘天天被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '刘天天',
            text: '呜…好痛啊…雨柔姐姐……'
        },
        {
            speaker: '艾雨柔',
            text: '刘天天，不要看…闭上眼睛……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和刘天天被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }]],
        '南宫雅琪': [[{
            speaker: '南宫雅琪',
            text: '什么…！？人家…怎么能在这种地方倒下…！！'
        },
        {
            speaker: '艾雨柔',
            text: '不…！来不及了……！！'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和南宫雅琪被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '南宫雅琪',
            text: '人家不要死在这里啊…！！绝对……！！'
        },
        {
            speaker: '艾雨柔',
            text: '我也…不想死啊……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和南宫雅琪被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }], [{
            speaker: '南宫雅琪',
            text: '糟了啦！人家完蛋了啦！艾雨柔，快想想办法！！'
        },
        {
            speaker: '艾雨柔',
            text: '我还能…怎样呢……'
        },
        {
            speaker: null,
            text: '潮水般的冰冷字符从屏幕中喷涌而出。像素的碎片刮过视网膜，电流的噪音填满耳道……',
            isRed: true
        },
        {
            speaker: null,
            text: '我和南宫雅琪被裹挟进这不断翻涌的数据洪流中，下沉，窒息，在最后一帧白光里失去彼此的形状……',
            isRed: true
        }]]
    };
    function getRandomFailDialog(partner) {
        var dialogs = failDialogData[partner];
        if (!dialogs) return null;
        if (!failDialogUsedIndices[partner]) failDialogUsedIndices[partner] = [];
        var used = failDialogUsedIndices[partner];
        var available = dialogs.map(function (_, i) {
            return i;
        }).filter(function (i) {
            return !used.includes(i);
        });
        if (available.length === 0) {
            failDialogUsedIndices[partner] = [];
            return dialogs[Math.floor(Math.random() * dialogs.length)];
        }
        var idx = available[Math.floor(Math.random() * available.length)];
        used.push(idx);
        failDialogUsedIndices[partner] = used;
        return dialogs[idx].map(function (line) {
            return {
                speaker: line.speaker,
                text: line.isRed ? '<span style="color:#ef4444;">' + line.text + '</span>' : line.text
            };
        });
    }

    var dialogData = {
        'KG': {
            special: function (pwd) {
                return pwd.includes('1st') ? [{
                    speaker: 'KG',
                    text: '和小雨柔搭档吗……听起来不错呢~'
                },
                {
                    speaker: '艾雨柔',
                    text: '这个游艺项目就交给我们吧！其他的……就拜托大家了！'
                },
                {
                    speaker: 'KG',
                    text: '各位，如果发现了任寂阳，一定要小心。'
                }] : null;
            },
            normal: [[{
                speaker: 'KG',
                text: '和小雨柔搭档吗……听起来不错呢~'
            },
            {
                speaker: '艾雨柔',
                text: '我们真是越来越合拍了呢。'
            }], [{
                speaker: 'KG',
                text: 'ok，我会帮忙的……'
            },
            {
                speaker: '艾雨柔',
                text: '一起来努力吧！'
            }], [{
                speaker: 'KG',
                text: '好啊，警察叔叔会一直在你身边。'
            },
            {
                speaker: '艾雨柔',
                text: '突然说出了很帅气的话呢。'
            }], [{
                speaker: 'KG',
                text: '收到，保证完成任务~'
            },
            {
                speaker: '艾雨柔',
                text: '这就是警察的风范吗，感觉很可靠啊。'
            }], [{
                speaker: 'KG',
                text: '没问题，请尽管对警察叔叔发号施令吧。'
            },
            {
                speaker: '艾雨柔',
                text: '那我就不客气了！'
            }]]
        },
        '云汐': {
            special: function (pwd) {
                if (pwd.includes('1st')) return [{
                    speaker: '云汐',
                    text: '好…好的！我会努力帮上忙的……'
                },
                {
                    speaker: '艾雨柔',
                    text: '这个游艺项目就交给我们吧！其他的……就拜托大家了！'
                },
                {
                    speaker: '云汐',
                    text: '找到任寂阳的话，请不要对他太粗暴……'
                }];
                if (pwd.includes('cry')) return [{
                    speaker: '云汐',
                    text: '…………'
                },
                {
                    speaker: '云汐',
                    text: '可以……'
                }];
                return null;
            },
            normal: [[{
                speaker: '云汐',
                text: '这，这是打字吗？我不太擅长用电脑，但我会努力的！'
            },
            {
                speaker: '艾雨柔',
                text: '没关系，有我在呢，我们一起加油吧！'
            }], [{
                speaker: '云汐',
                text: '好的呀，我会尽力帮助雨柔姐的！'
            },
            {
                speaker: '艾雨柔',
                text: '我会保护你的哦。'
            }], [{
                speaker: '云汐',
                text: '好哦！是时候拿出勇气来了！'
            },
            {
                speaker: '艾雨柔',
                text: '很有干劲嘛！'
            }], [{
                speaker: '云汐',
                text: '嗯嗯，我信任雨柔姐！'
            },
            {
                speaker: '艾雨柔',
                text: '让我们彼此托付一切吧！'
            }]]
        },
        'Q太郎': {
            special: function (pwd) {
                return pwd.includes('1st') ? [{
                    speaker: 'Q太郎',
                    text: '妹问题噻！俺滴肌肉亿经等8鸡力噻！'
                },
                {
                    speaker: '艾雨柔',
                    text: '这个游艺项目就交给我们吧！其他的……就拜托大家了！'
                },
                {
                    speaker: 'Q太郎',
                    text: '达驾，14康到力任寂阳楞小汁，亿腚腰修心呐！'
                }] : null;
            },
            normal: [[{
                speaker: 'Q太郎',
                text: '叫给俺叭！俺给恁康康，俺滴肌肉84徒油7表噻！'
            },
            {
                speaker: '艾雨柔',
                text: '拜托你了，Q太郎先生！'
            }], [{
                speaker: 'Q太郎',
                text: '俺打介个项目，尊嘟假嘟？'
            },
            {
                speaker: '艾雨柔',
                text: '会赢的！'
            }], [{
                speaker: 'Q太郎',
                text: '俺卡8会酥滴噻！8管遇到撒子，俺嘟跟他干！'
            },
            {
                speaker: '艾雨柔',
                text: '施展你的力量吧，Q太郎先生！'
            }], [{
                speaker: 'Q太郎',
                text: '猴哇！恁9康着叭——俺滴XB撅悟！'
            },
            {
                speaker: '艾雨柔',
                text: '请多指教了！'
            }], [{
                speaker: 'Q太郎',
                text: '俺会8介当层XB比赛，认曾因队滴！'
            },
            {
                speaker: '艾雨柔',
                text: '我的气势也不会输的！'
            }]]
        },
        '南宫乘风': {
            special: function (pwd) {
                return pwd.includes('1st') ? [{
                    speaker: '南宫乘风',
                    text: '好啊！区区游艺项目，就安心交给我吧！'
                },
                {
                    speaker: '艾雨柔',
                    text: '这个游艺项目就让我们来吧！其他的……就拜托大家了！'
                },
                {
                    speaker: '南宫乘风',
                    text: '大家，如果见到那个毛线帽豆芽菜，一定要小心啊！他诡计多端，千万不要相信他！'
                }] : null;
            },
            normal: [[{
                speaker: '南宫乘风',
                text: '好嘞雨柔！就让你见识见识，我技术派的一面吧！'
            },
            {
                speaker: '艾雨柔',
                text: '键盘乐器的技术用在打字吗？也许很酷哦！'
            }], [{
                speaker: '南宫乘风',
                text: '是需要专注于手的项目吧？我可是很协调的哦！'
            },
            {
                speaker: '艾雨柔',
                text: '我们一起加油吧！'
            }], [{
                speaker: '南宫乘风',
                text: '来吧雨柔！让电脑体会一下摇滚的魅力吧！'
            },
            {
                speaker: '艾雨柔',
                text: '键盘是很脆弱的，请轻一点！'
            }], [{
                speaker: '南宫乘风',
                text: '咱们俩一起，肯定没问题的！'
            },
            {
                speaker: '艾雨柔',
                text: '我们一起通关吧！'
            }], [{
                speaker: '南宫乘风',
                text: '只要拿出专注力与灵活性就行了吧！'
            },
            {
                speaker: '艾雨柔',
                text: '速战速决吧，乘风姐！'
            }]]
        },
        '楚鸢': {
            special: null,
            normal: [[{
                speaker: '楚鸢',
                text: '我明白了，我不会辜负雨柔的期待的！'
            },
            {
                speaker: '艾雨柔',
                text: '你很勇敢哦，楚鸢！'
            }], [{
                speaker: '楚鸢',
                text: '打字吗？虽然是生活中常见的事情，但这可不是在玩呢！'
            },
            {
                speaker: '艾雨柔',
                text: '为了我们的生命，一起拼尽全力吧！'
            }], [{
                speaker: '楚鸢',
                text: '抓紧我的手，我们一起生存下去吧！'
            },
            {
                speaker: '艾雨柔',
                text: '只要有伙伴在，什么都不可怕了呢。'
            }], [{
                speaker: '楚鸢',
                text: '我会让那些人偶悔改的！'
            },
            {
                speaker: '艾雨柔',
                text: '也不要太激动了哦，用平常心面对吧。'
            }], [{
                speaker: '楚鸢',
                text: '我一定不会辜负老师的遗志！'
            },
            {
                speaker: '艾雨柔',
                text: '带着牺牲者的那份希望，上吧！'
            }]]
        },
        '刘天天': {
            special: function (pwd) {
                return pwd.includes('1st') ? [{
                    speaker: '刘天天',
                    text: '虽，虽然很害怕，但我会加油的汪！！'
                },
                {
                    speaker: '艾雨柔',
                    text: '这个游艺项目就让我们来吧！其他的……就拜托大家了！'
                },
                {
                    speaker: '刘天天',
                    text: '要是看见阴暗角色，一定要狠狠地教训他汪！'
                }] : null;
            },
            normal: [[{
                speaker: '刘天天',
                text: '嗯喵！我会保护雨柔姐姐的汪！'
            },
            {
                speaker: '艾雨柔',
                text: '很棒哦，刘天天是坚强的大人了。'
            }], [{
                speaker: '刘天天',
                text: '好耶！雨柔姐姐教我学打字喵！'
            },
            {
                speaker: '艾雨柔',
                text: '我会保护好你的哦！'
            }], [{
                speaker: '刘天天',
                text: '好耶！和雨柔姐姐一起去赢星星汪！'
            },
            {
                speaker: '艾雨柔',
                text: '拉住手，跟紧我的步伐！'
            }], [{
                speaker: '刘天天',
                text: '虽然很可怕，但这样的游戏也没有什么大不了的汪！'
            },
            {
                speaker: '艾雨柔',
                text: '放心好了，有我在你不会受伤的。'
            }], [{
                speaker: '刘天天',
                text: '不要低估小喵，猫爪可是很锋利的哦！'
            },
            {
                speaker: '艾雨柔',
                text: '打字应该是需要灵活哦……但只要有决心就是最棒的！'
            }]]
        },
        '南宫雅琪': {
            special: function (pwd) {
                return pwd.includes('1st') ? [{
                    speaker: '南宫雅琪',
                    text: '呵，想借用人家的力量吗？你唯独眼光不错啊，艾雨柔！'
                },
                {
                    speaker: '艾雨柔',
                    text: '这个游艺项目就让我们来吧！其他的……就拜托大家了！'
                },
                {
                    speaker: '南宫雅琪',
                    text: '虽然没有人家在，但你们不要放过任寂阳那家伙啊！绑起来审问什么的，全都用在他身上吧！'
                }] : null;
            },
            normal: [[{
                speaker: '南宫雅琪',
                text: '呵…是时候拿出老子背着狱警偷偷打字写小说的实力了。感到荣幸吧，艾雨柔！'
            },
            {
                speaker: '艾雨柔',
                text: '你还有这样的爱好吗？真没想到……'
            }], [{
                speaker: '南宫雅琪',
                text: '哼…区区打字的才能，人家也是有的啦。高兴吧，艾雨柔！'
            },
            {
                speaker: '艾雨柔',
                text: '…这是真的吗？'
            }], [{
                speaker: '南宫雅琪',
                text: '只要在电脑键盘上把字打完就行了吧？对于老子这样的模范囚犯，可谓是轻轻松松啊！'
            },
            {
                speaker: '艾雨柔',
                text: '最好是这样……'
            }], [{
                speaker: '南宫雅琪',
                text: '只不过是打字而已，简单哇？简单呀！！艾雨柔，快跟人家一起说简单。'
            },
            {
                speaker: '艾雨柔',
                text: '看人介有实力！'
            }], [{
                speaker: '南宫雅琪',
                text: '话先说在前头，你可不要小看老子啊！以人家的家里蹲之力，能在限定区域里服刑个好几年呢！'
            },
            {
                speaker: '艾雨柔',
                text: '知道了，一起快点打完快点出去好吧？'
            }]]
        },
        '任寂阳': {
            special: null,
            normal: null
        }
    };
    function getDialogForPartner(partner, pwd) {
        var dd = dialogData[partner];
        if (!dd) return null;
        if (dd.special) {
            var sp = dd.special(pwd);
            if (sp) return sp;
        }
        if (dd.normal && dd.normal.length > 0) {
            if (!dialogUsedIndices[partner]) dialogUsedIndices[partner] = [];
            var used = dialogUsedIndices[partner];
            var available = dd.normal.map(function (_, i) {
                return i;
            }).filter(function (i) {
                return !used.includes(i);
            });
            if (available.length === 0) {
                dialogUsedIndices[partner] = [];
                return dd.normal[Math.floor(Math.random() * dd.normal.length)];
            }
            var idx = available[Math.floor(Math.random() * available.length)];
            used.push(idx);
            dialogUsedIndices[partner] = used;
            return dd.normal[idx];
        }
        return null;
    }

    function getSpeakerColor(speaker) {
        var c = {
            '艾雨柔': '#3b82f6',
            'KG': '#f59e0b',
            '云汐': '#10b981',
            'Q太郎': '#ef4444',
            '任寂阳': '#7c3aed',
            '南宫乘风': '#1f2937',
            '楚鸢': '#ec4899',
            '刘天天': '#92400e',
            '南宫雅琪': '#9ca3af'
        };
        return c[speaker] || '#7c3aed';
    }
    function getSpeakerTextColor(speaker) {
        if (speaker === '南宫乘风') return '#fff';
        if (speaker === '南宫雅琪') return '#1f2937';
        return '#fff';
    }

    function showDialogSequence(lines, callback) {
        var currentIdx = 0,
            charIdx = 0,
            currentParsed = null,
            isTyping = false,
            typingTimer = null,
            hasHTML = false;
        function renderDialog() {
            var line = lines[currentIdx];
            currentParsed = {
                speaker: line.speaker,
                text: line.text,
                isThought: false
            };
            var match = line.text.match(/^（(.+)）$/);
            if (match) {
                currentParsed.speaker = null;
                currentParsed.text = match[1];
                currentParsed.isThought = true;
            }
            hasHTML = /<[^>]+>/.test(currentParsed.text);
            var nameTagHTML = '';
            if (currentParsed.speaker) {
                var bg = getSpeakerColor(currentParsed.speaker);
                var tc = getSpeakerTextColor(currentParsed.speaker);
                nameTagHTML = '<div class="dialog-name-tag" style="background:' + bg + ';color:' + tc + ';">' + escapeHTML(currentParsed.speaker) + '</div>';
            }
            var textClass = currentParsed.isThought ? 'blue-text' : '';
            dialogBox.innerHTML = nameTagHTML + '<div class="dialog-text-box" id="dialogTextContent"><span class="' + textClass + '"></span></div><div class="dialog-continue-hint" id="dialogHint">▼ 点击继续</div>';
            charIdx = 0;
            isTyping = true;
            if (hasHTML) {
                finishTypingHTML();
            } else {
                typeNextChar();
            }
        }
        function typeNextChar() {
            if (!isTyping) return;
            var span = document.getElementById('dialogTextContent');
            if (!span) return;
            span = span.querySelector('span');
            if (!span) return;
            if (charIdx < currentParsed.text.length) {
                span.textContent += currentParsed.text[charIdx];
                charIdx++;
                typingTimer = setTimeout(typeNextChar, 15);
            } else {
                isTyping = false;
                if (typingTimer) clearTimeout(typingTimer);
            }
        }
        function finishTypingHTML() {
            isTyping = false;
            if (typingTimer) clearTimeout(typingTimer);
            var span = document.getElementById('dialogTextContent');
            if (span) {
                span = span.querySelector('span');
                if (span) span.innerHTML = currentParsed.text;
            }
        }
        function finishTyping() {
            if (isTyping) {
                isTyping = false;
                if (typingTimer) clearTimeout(typingTimer);
                var span = document.getElementById('dialogTextContent');
                if (span) {
                    span = span.querySelector('span');
                    if (span) {
                        if (hasHTML) {
                            span.innerHTML = currentParsed.text;
                        } else {
                            span.textContent = currentParsed.text;
                        }
                    }
                }
            }
        }
        function nextLine() {
            if (isTyping) {
                finishTyping();
                return;
            }
            currentIdx++;
            if (currentIdx >= lines.length) {
                dialogOverlay.style.display = 'none';
                if (callback) callback();
                return;
            }
            renderDialog();
        }
        dialogOverlay.style.display = 'flex';
        renderDialog();
        dialogBox.onclick = nextLine;
    }
    function showConfirmDialog(speaker, message, onConfirm, onCancel) {
        var nameTagHTML = '';
        if (speaker) {
            var bg = getSpeakerColor(speaker);
            var tc = getSpeakerTextColor(speaker);
            nameTagHTML = '<div class="dialog-name-tag" style="background:' + bg + ';color:' + tc + ';">' + escapeHTML(speaker) + '</div>';
        }
        dialogBox.innerHTML = nameTagHTML + '<div class="dialog-text-box" style="cursor:default;padding-top:' + (speaker ? '24px' : '16px') + ';"><span>' + message + '</span></div><div class="dialog-buttons"><button class="btn btn-primary btn-sm" id="btnDlgConfirm">确定</button><button class="btn btn-outline btn-sm" id="btnDlgCancel">取消</button></div>';
        dialogOverlay.style.display = 'flex';
        document.getElementById('btnDlgConfirm').addEventListener('click',
            function () {
                dialogOverlay.style.display = 'none';
                if (onConfirm) onConfirm();
            });
        document.getElementById('btnDlgCancel').addEventListener('click',
            function () {
                dialogOverlay.style.display = 'none';
                if (onCancel) onCancel();
            });
    }

    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    var audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) audioCtx = new AudioCtx();
        return audioCtx;
    }
    function playBeep(freq, dur, type, vol) {
        try {
            type = type || 'square';
            vol = vol || 0.08;
            var ctx = getAudioCtx();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + dur);
        } catch (e) { }
    }
    function soundChallengeStart() {
        playBeep(400, 0.08);
        setTimeout(function () {
            playBeep(600, 0.08);
        },
            80);
        setTimeout(function () {
            playBeep(900, 0.12);
        },
            160);
    }
    function soundWarningTick() {
        playBeep(200, 0.06);
        setTimeout(function () {
            playBeep(180, 0.04);
        },
            100);
    }
    function soundSuccess() {
        [523, 659, 784, 1047].forEach(function (f, i) {
            setTimeout(function () {
                playBeep(f, 0.15);
            },
                i * 100);
        });
    }
    function soundFailure() {
        playBeep(300, 0.2, 'sawtooth');
        setTimeout(function () {
            playBeep(200, 0.3, 'sawtooth');
        },
            180);
        setTimeout(function () {
            playBeep(120, 0.4, 'sawtooth');
        },
            350);
    }
    function soundConsecutiveError() {
        playBeep(800, 0.05);
        setTimeout(function () {
            playBeep(600, 0.05);
        },
            60);
        setTimeout(function () {
            playBeep(900, 0.06);
        },
            120);
    }
    function triggerRedFlash() {
        var o = document.createElement('div');
        o.className = 'red-flash-overlay';
        document.body.appendChild(o);
        setTimeout(function () {
            if (o.parentNode) o.remove();
        },
            700);
    }
    function triggerScreenShake() {
        document.body.classList.add('screen-shake');
        setTimeout(function () {
            document.body.classList.remove('screen-shake');
        },
            600);
    }

    function escapeHTML(s) {
        var d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }
    function showToast(m) {
        var t = document.createElement('div');
        t.className = 'toast';
        t.textContent = m;
        toastContainer.appendChild(t);
        setTimeout(function () {
            if (t.parentNode) t.remove();
        },
            1800);
    }
    function formatTime(s) {
        var m = Math.floor(s / 60),
            sec = Math.floor(s % 60);
        return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    }

    function isQPunctuation(c) {
        var code = c.charCodeAt(0);
        return code === 32 || code === 44 || code === 46;
    }
    function isWhitespace(c) {
        var code = c.charCodeAt(0);
        if (partners[currentPartner] && partners[currentPartner].skipPunctuation && isQPunctuation(c)) return true;
        if (code === 32) return false;
        return !((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57));
    }
    function normalizeChar(c) {
        var code = c.charCodeAt(0);
        return (code >= 65 && code <= 90) ? String.fromCharCode(code + 32) : c;
    }
    function normalizeText(t) {
        var r = '';
        for (var i = 0; i < t.length; i++) r += normalizeChar(t[i]);
        return r;
    }
    function countValidChars(s) {
        var n = 0;
        for (var i = 0; i < s.length; i++) {
            var code = s.charCodeAt(i);
            if (partners[currentPartner] && partners[currentPartner].skipPunctuation && isQPunctuation(s[i])) continue;
            if (!((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57) || (code === 32))) continue;
            n++;
        }
        return n;
    }
    function getCorrectValidCount() {
        return correctKeystrokes;
    }
    function calcAccuracy() {
        if (actualKeystrokes === 0) return 100;
        return Math.min(100, Math.round((correctKeystrokes / actualKeystrokes) * 100));
    }
    function getComparisonText() {
        return useLowerCaseMode ? normalizedText : originalText;
    }
    function findNextValid(start, text) {
        var p = start;
        while (p < text.length && isWhitespace(text[p])) p++;
        return (p < text.length && !isWhitespace(text[p])) ? p : -1;
    }
    function isValidText(t) {
        return countValidChars(t) > 0;
    }
    function getTimeLimit() {
        return currentPartner ? partners[currentPartner].timeLimit : 60;
    }
    function getWpmTarget() {
        return currentPartner ? partners[currentPartner].wpmTarget : 29;
    }
    function getAccTarget() {
        return currentPartner ? partners[currentPartner].accTarget : 80;
    }

    function updateChallengeUI() {
        challengeBanner.style.display = challengeMode ? 'inline-flex' : 'none';
    }
    function updatePartnerTag() {
        if (currentPartner) {
            partnerTag.style.display = 'inline-flex';
            partnerTag.textContent = partnerEmojis[currentPartner] + ' ' + currentPartner;
        } else {
            partnerTag.style.display = 'none';
        }
    }

    function showTypingUI() {
        inputDisplaySection.style.display = 'block';
        virtualInputZone.style.display = 'flex';
        statsBar.style.display = 'flex';
        originalHeader.style.display = 'flex';
        originalTextEl.style.fontFamily = 'var(--font-mono)';
        originalTextEl.style.fontSize = '0.78rem';
        originalTextEl.style.lineHeight = '1.35';
        originalTextEl.style.textAlign = 'left';
        timeLimitHint.textContent = '/ ' + getTimeLimit() + 's';
        setupGameDialogButtons();
    }
    function hideTypingUI() {
        inputDisplaySection.style.display = 'none';
        virtualInputZone.style.display = 'none';
        statsBar.style.display = 'none';
        originalHeader.style.display = 'none';
        while (statsDialogBtns.firstChild) statsDialogBtns.removeChild(statsDialogBtns.firstChild);
        var bubble = document.querySelector('.game-dialog-bubble');
        if (bubble) bubble.remove();
    }

    function renderOriginal() {
        if (!originalText) {
            hideTypingUI();
            originalTextEl.innerHTML = '<div style="text-align:center;padding:16px 10px;color:#d1d5db;line-height:1.4;"><div style="font-size:1.8rem;margin-bottom:4px;">🦆⌨️</div><div style="font-size:1rem;font-weight:700;color:#fbbf24;margin-bottom:3px;">⭐游艺项目【六指打字魔】</div><div style="font-size:0.7rem;color:#9ca3af;">难度:<span style="color:#f59e0b;">普通</span></div><div style="font-size:0.7rem;color:#fbbf24;">通关奖励:⭐⭐通关筹码×2</div><hr style="border-color:#1f2937;margin:6px 0;"><div style="font-size:0.68rem;color:#9ca3af;text-align:left;line-height:1.4;padding:0 2px;"><p style="margin:2px 0;"><b style="color:#d1d5db;">规则:</b>玩家须输入主持人给出的进入口令，并在规定的时间内用手机/电脑键盘完成该英文打字任务。</p><p style="margin:2px 0;">文本为英文打字练习文本，长度约200字符，由系统算法生成，无实际内容意义。</p><p style="margin:2px 0;">模式为<b style="color:#ef4444;">严格匹配模式</b>，字符包含26个英文字母大小写、空格、英文逗号、英文句号，需完全按要求打出。</p><p style="margin:3px 0;padding:4px 6px;background:rgba(239,68,68,0.1);border-left:2px solid #ef4444;border-radius:3px;"><b style="color:#ef4444;">通关条件:</b>在<b style="color:#fbbf24;">60秒</b>计时时间内完成英文打字任务，<b style="color:#fbbf24;">WPM（每分钟单词数）大于等于29</b>，<b style="color:#fbbf24;">准确率（错误按键数/总按键数）大于等于80%</b></p></div><div style="font-size:0.6rem;color:#6b7280;margin:8px 0 4px;">【暂不挑战的话，点击左上角退出该网页，并直接跑路点别的】</div><button class="btn btn-primary" id="btnEmptyChallenge" style="padding:10px 28px;font-size:0.9rem;font-weight:800;letter-spacing:0.05em;background:linear-gradient(135deg,#dc2626,#991b1b);box-shadow:0 0 16px rgba(220,38,38,0.5);border:1px solid rgba(239,68,68,0.5);">⚔️ 挑 战</button></div>';
            setTimeout(function () {
                var bc = document.getElementById('btnEmptyChallenge');
                if (bc) bc.addEventListener('click',
                    function () {
                        showPasswordModal();
                    });
            },
                100);
            return;
        }
        showTypingUI();
        updateTextInfo();
        var html = '';
        var chars = originalText.split('');
        var len = userInput.length;
        for (var i = 0; i < chars.length; i++) {
            var cls = 'char ';
            if (i < len) cls += 'correct';
            else if (i === len) cls += 'current';
            else cls += 'pending';
            if (autoSkippedPositions.includes(i)) cls += ' auto-skipped';
            if (chars[i] === '\n') html += '<span class="' + cls + '">⏎</span><br>';
            else if (chars[i] === ' ') html += '<span class="' + cls + '" style="border-bottom:1px dotted #374151;"> </span>';
            else html += '<span class="' + cls + '">' + escapeHTML(chars[i]) + '</span>';
        }
        originalTextEl.innerHTML = html;
        if (isActive && !isFinished && len < chars.length) {
            var el = originalTextEl.querySelector('.char.current');
            if (el) el.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
    function renderUserInput() {
        if (!originalText && userInput.length === 0) {
            userInputDisplayEl.innerHTML = '';
            return;
        }
        var html = '';
        for (var i = 0; i < userInput.length; i++) {
            var ch = userInput[i];
            if (ch === '\n') html += '<span class="char correct-char">⏎</span><br>';
            else if (ch === ' ') html += '<span class="char correct-char" style="border-bottom:1px dotted #6b7280;"> </span>';
            else html += '<span class="char correct-char">' + escapeHTML(ch) + '</span>';
        }
        if (isActive && !isFinished) html += '<span class="cursor-blink"> </span>';
        userInputDisplayEl.innerHTML = html;
    }
    function updateStats() {
        statProgressEl.textContent = userInput.length + '/' + originalText.length;
        if (startTime && userInput.length > 0 && !isFinished) {
            var e = (Date.now() - startTime) / 1000;
            statTimeEl.textContent = formatTime(e);
            var tl = getTimeLimit();
            var remaining = tl - e;
            if (remaining <= 10 && remaining > 0) {
                statTimeEl.classList.add('timer-warning');
                if (!warningSoundPlayed && remaining <= 10) {
                    warningSoundPlayed = true;
                    soundWarningTick();
                }
                if (remaining <= 10 && Math.floor(remaining) !== Math.floor(remaining + 0.3)) {
                    soundWarningTick();
                }
            } else {
                statTimeEl.classList.remove('timer-warning');
            }
            statWPMEl.textContent = e > 0 ? Math.round((correctKeystrokes / 5) / (e / 60)) : 0;
            var a = calcAccuracy();
            statAccuracyEl.textContent = a;
            statAccuracyEl.className = 'stat-value ' + (a >= getAccTarget() ? 'green' : 'red');
        } else if (!startTime) {
            statTimeEl.textContent = '00:00';
            statWPMEl.textContent = '0';
            statAccuracyEl.textContent = '100';
            statAccuracyEl.className = 'stat-value green';
            statTimeEl.classList.remove('timer-warning');
        }
    }
    function updateUIState() {
        inputDisplayWrapper.classList.remove('active', 'finished', 'error-flash', 'challenge-active');
        if (isFinished) inputDisplayWrapper.classList.add('finished');
        else if (isActive) {
            inputDisplayWrapper.classList.add('active');
            if (challengeMode) inputDisplayWrapper.classList.add('challenge-active');
        }
        if (!originalText) tapText.textContent = '点击「挑战」开始';
        else if (!modeSelected) tapText.textContent = '准备中...';
        else if (!isActive && !isFinished) tapText.textContent = '点击此处开始打字';
        else if (isFinished) tapText.textContent = '⏰ 时间到！';
        else tapText.textContent = '⌨️ 正在输入...';
        tapArea.style.display = (isActive && !isFinished) ? 'none' : 'flex';
        btnResetSmall.style.display = (isActive || isFinished) ? 'inline-flex' : 'none';
        timeLimitHint.style.display = (originalText && modeSelected) ? 'inline' : 'none';
    }
    function flashError() {
        inputDisplayWrapper.classList.add('error-flash');
        setTimeout(function () {
            inputDisplayWrapper.classList.remove('error-flash');
        },
            200);
    }
    function startTimer() {
        if (!timerInterval) {
            startTime = Date.now();
            warningSoundPlayed = false;
            consecutiveErrors = 0;
            timerInterval = setInterval(updateStats, 300);
            timeCheckInterval = setInterval(checkTimeLimit, 500);
        }
    }
    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (timeCheckInterval) {
            clearInterval(timeCheckInterval);
            timeCheckInterval = null;
        }
        statTimeEl.classList.remove('timer-warning');
    }
    function checkTimeLimit() {
        if (isFinished || !startTime) return;
        if ((Date.now() - startTime) / 1000 >= getTimeLimit()) finishTyping(true);
    }

    function processChar(key) {
        if (isFinished || !originalText || !modeSelected) return;
        var comp = getComparisonText();
        var pos = userInput.length;
        if (pos >= comp.length) {
            finishTyping(false);
            return;
        }
        if (!isActive) {
            isActive = true;
            startTimer();
            updateUIState();
        }
        if (key.length !== 1) return;
        var charCode = key.charCodeAt(0);
        if (charCode < 32 && charCode !== 10 && charCode !== 13) return;
        if (partners[currentPartner] && partners[currentPartner].skipPunctuation && isQPunctuation(key)) {
            return;
        }
        var pk = useLowerCaseMode ? normalizeChar(key) : key;
        var target = comp[pos];
        if (partners[currentPartner] && partners[currentPartner].skipPunctuation && isQPunctuation(target)) {
            userInput += originalText[pos];
            autoSkippedPositions.push(pos);
            renderOriginal();
            renderUserInput();
            updateStats();
            if (userInput.length >= comp.length) finishTyping(false);
            else checkTrailing();
            return;
        }
        if (pk === target) {
            consecutiveErrors = 0;
            userInput += originalText[pos];
            actualKeystrokes++;
            correctKeystrokes++;
            renderOriginal();
            renderUserInput();
            updateStats();
            if (userInput.length >= comp.length) finishTyping(false);
            else checkTrailing();
            return;
        }
        if (partners[currentPartner] && partners[currentPartner].errorSkip) {
            consecutiveErrors = 0;
            userInput += originalText[pos];
            actualKeystrokes += 2;
            correctKeystrokes += 1;
            autoSkippedPositions.push(pos);
            flashError();
            var ce = originalTextEl.querySelector('.char.current');
            if (ce) {
                ce.classList.add('error-flash');
                setTimeout(function () {
                    ce.classList.remove('error-flash');
                },
                    350);
            }
            renderOriginal();
            renderUserInput();
            updateStats();
            if (userInput.length >= comp.length) finishTyping(false);
            else checkTrailing();
            return;
        }
        if (isWhitespace(target)) {
            var next = findNextValid(pos, comp);
            if (next > pos && pk === comp[next]) {
                consecutiveErrors = 0;
                userInput += originalText.substring(pos, next) + originalText[next];
                for (var i = pos; i < next; i++) autoSkippedPositions.push(i);
                actualKeystrokes++;
                correctKeystrokes++;
                renderOriginal();
                renderUserInput();
                updateStats();
                if (userInput.length >= comp.length) finishTyping(false);
                else checkTrailing();
                return;
            }
            var aw = true;
            for (var i = pos; i < comp.length; i++) if (!isWhitespace(comp[i])) {
                aw = false;
                break;
            }
            if (aw) {
                consecutiveErrors = 0;
                var tr = '';
                for (var i = pos; i < originalText.length; i++) if (isWhitespace(getComparisonText()[i] || originalText[i])) {
                    tr += originalText[i];
                    autoSkippedPositions.push(i);
                }
                if (tr.length > 0) {
                    userInput += tr;
                    renderOriginal();
                    renderUserInput();
                    updateStats();
                }
                finishTyping(false);
                return;
            }
        }
        actualKeystrokes++;
        consecutiveErrors++;
        flashError();
        if (consecutiveErrors >= CONSECUTIVE_ERROR_THRESHOLD) {
            soundConsecutiveError();
            consecutiveErrors = 0;
        }
        var ce = originalTextEl.querySelector('.char.current');
        if (ce) {
            ce.classList.add('error-flash');
            setTimeout(function () {
                ce.classList.remove('error-flash');
            },
                350);
        }
        updateStats();
    }
    function checkTrailing() {
        if (isFinished) return;
        var comp = getComparisonText();
        var pos = userInput.length;
        if (pos >= comp.length) {
            finishTyping(false);
            return;
        }
        var aw = true;
        for (var i = pos; i < comp.length; i++) if (!isWhitespace(comp[i])) {
            aw = false;
            break;
        }
        if (aw && pos > 0) {
            var tr = '';
            for (var i = pos; i < originalText.length; i++) if (isWhitespace(getComparisonText()[i] || originalText[i])) {
                tr += originalText[i];
                autoSkippedPositions.push(i);
            }
            if (tr.length > 0) {
                userInput += tr;
                renderOriginal();
                renderUserInput();
                updateStats();
            }
            finishTyping(false);
        }
    }
    function handleBackspace() {
        if (isFinished || userInput.length === 0) return;
        userInput = userInput.slice(0, -1);
        autoSkippedPositions = autoSkippedPositions.filter(function (p) {
            return p < userInput.length;
        });
        consecutiveErrors = 0;
        renderOriginal();
        renderUserInput();
        updateStats();
    }

    function finishTyping(isTimeout) {
        if (isFinished) return;
        isFinished = true;
        isActive = false;
        stopTimer();
        updateUIState();
        renderOriginal();
        renderUserInput();
        updateStats();
        var elapsed = (Date.now() - startTime) / 1000,
            acc = calcAccuracy(),
            wpm = elapsed > 0 ? Math.round((correctKeystrokes / 5) / (elapsed / 60)) : 0,
            tl = getTimeLimit(),
            actualTimeout = isTimeout || elapsed > tl,
            isPassed = !actualTimeout && wpm >= getWpmTarget() && acc >= getAccTarget(),
            totalChars = originalText.length,
            progressPct = totalChars > 0 ? Math.round((userInput.length / totalChars) * 100) : 0;
        statTimeEl.textContent = formatTime(Math.min(elapsed, tl));
        statWPMEl.textContent = wpm;
        statAccuracyEl.textContent = acc;
        statTimeEl.classList.remove('timer-warning');
        if (isPassed) {
            soundSuccess();
        } else {
            soundFailure();
            setTimeout(function () {
                triggerRedFlash();
            },
                200);
            setTimeout(function () {
                triggerScreenShake();
            },
                250);
        }
        var resultData = {
            isPassed: isPassed,
            wpm: wpm,
            acc: acc,
            actualTimeout: actualTimeout,
            tl: tl,
            totalChars: totalChars,
            progressPct: progressPct,
            elapsed: elapsed
        };
        if (!isPassed && currentPartner && failDialogData[currentPartner]) {
            var failDialog = getRandomFailDialog(currentPartner);
            if (failDialog) {
                showDialogSequence(failDialog,
                    function () {
                        showResultModal(resultData);
                    });
                return;
            }
        }
        showResultModal(resultData);
    }

    function showResultModal(data) {
        var isPassed = data.isPassed,
            wpm = data.wpm,
            acc = data.acc,
            actualTimeout = data.actualTimeout,
            tl = data.tl,
            totalChars = data.totalChars,
            progressPct = data.progressPct,
            elapsed = data.elapsed;
        var d = document.getElementById('resultDialog');
        var icon, title, gradeColor;
        if (isPassed) {
            icon = '🏆';
            title = '🎉 通关成功！';
            gradeColor = '#fbbf24';
        } else if (actualTimeout) {
            icon = '⏰';
            title = '⏰ 时间耗尽...';
            gradeColor = '#ef4444';
        } else if (wpm < getWpmTarget()) {
            icon = '🐢';
            title = '速度不足...';
            gradeColor = '#f59e0b';
        } else {
            icon = '🎯';
            title = '准确率不足...';
            gradeColor = '#ef4444';
        }
        var failReasons = [];
        if (actualTimeout) failReasons.push('⏰ 超过' + tl + '秒时间限制（完成进度:' + progressPct + '%）');
        if (wpm < getWpmTarget()) failReasons.push('⚡ WPM未达' + getWpmTarget() + '（当前:' + wpm + '）');
        if (acc < getAccTarget()) failReasons.push('🎯 准确率未达' + getAccTarget() + '%（当前:' + acc + '%）');
        var excText = '';
        if (isPassed && excSwapPartner) {
            if (excSwapPartner === 'Q太郎') {
                excText = '<p style="color:#f59e0b;font-size:0.7rem;">💰 完成交换，支付10枚艾雨柔硬币，获得10枚Q太郎硬币</p>';
            } else if (excSwapPartner === '南宫乘风') {
                excText = '<p style="color:#f59e0b;font-size:0.7rem;">💰 完成交换，支付10枚艾雨柔硬币，获得10枚南宫乘风硬币</p>';
            }
        }
        var simpleTag = simpleMode && currentPartner !== '任寂阳' ? '<p class="simple-green">已使用简单券🎫</p>' : '';
        d.innerHTML = '<div style="text-align:center;"><div style="font-size:2.5rem;">' + icon + '</div><h3 style="color:' + gradeColor + ';">' + title + '</h3>' + (currentPartner ? '<p style="color:#a78bfa;font-size:0.7rem;">伙伴: ' + (partnerEmojis[currentPartner] || '') + ' ' + currentPartner + '</p>' : '') + (isPassed ? '<p style="color:#10b981;font-weight:700;">⭐ 获得通关筹码×2</p>' : '') + excText + simpleTag + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin:8px 0;"><div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:8px 4px;"><div style="font-size:1.1rem;font-weight:700;color:#fbbf24;">' + wpm + '</div><small style="color:#9ca3af;font-size:0.6rem;">WPM</small></div><div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:8px 4px;"><div style="font-size:1.1rem;font-weight:700;color:' + (acc >= getAccTarget() ? '#10b981' : '#ef4444') + ';">' + acc + '%</div><small style="color:#9ca3af;font-size:0.6rem;">准确率</small></div><div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:8px 4px;"><div style="font-size:1.1rem;font-weight:700;color:' + (actualTimeout ? '#ef4444' : '#9ca3af') + ';">' + formatTime(Math.min(elapsed, tl)) + '</div><small style="color:#9ca3af;font-size:0.6rem;">用时</small></div><div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:8px 4px;"><div style="font-size:1.1rem;font-weight:700;color:#9ca3af;">' + totalChars + '</div><small style="color:#9ca3af;font-size:0.6rem;">字符</small></div></div>' + (isPassed ? '' : '<div style="background:rgba(239,68,68,0.1);border-radius:6px;padding:6px;margin:6px 0;text-align:left;font-size:0.65rem;color:#ef4444;"><b>未通过原因:</b><br>' + failReasons.join('<br>') + '</div>') + '<div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" id="btnRetry">🔄 再次挑战</button><button class="btn btn-outline btn-sm" id="btnBackToStart">🏠 返回首页</button></div></div>';
        document.getElementById('resultModal').style.display = 'flex';
        document.getElementById('btnRetry').addEventListener('click',
            function () {
                document.getElementById('resultModal').style.display = 'none';
                excSwapPartner = null;
                startChallenge();
            });
        document.getElementById('btnBackToStart').addEventListener('click',
            function () {
                document.getElementById('resultModal').style.display = 'none';
                excSwapPartner = null;
                resetAll();
            });
    }

    function resetTypingState() {
        userInput = '';
        actualKeystrokes = 0;
        correctKeystrokes = 0;
        autoSkippedPositions = [];
        warningSoundPlayed = false;
        consecutiveErrors = 0;
        startTime = null;
        isFinished = false;
        isActive = false;
        stopTimer();
        hiddenEditable.textContent = '';
        renderOriginal();
        renderUserInput();
        updateStats();
        updateUIState();
        statTimeEl.textContent = '00:00';
        statWPMEl.textContent = '0';
        statAccuracyEl.textContent = '100';
        statAccuracyEl.className = 'stat-value green';
        statProgressEl.textContent = '0/' + originalText.length;
        statTimeEl.classList.remove('timer-warning');
    }
    function resetAll() {
        originalText = '';
        normalizedText = '';
        userInput = '';
        actualKeystrokes = 0;
        correctKeystrokes = 0;
        autoSkippedPositions = [];
        startTime = null;
        isFinished = false;
        isActive = false;
        modeSelected = false;
        useLowerCaseMode = false;
        challengeMode = false;
        warningSoundPlayed = false;
        consecutiveErrors = 0;
        currentPartner = null;
        disabledPartners = [];
        currentPassword = '';
        excSwapPartner = null;
        simpleMode = false;
        simpleBonus = null;
        updateChallengeUI();
        updatePartnerTag();
        stopTimer();
        hiddenEditable.textContent = '';
        hideTypingUI();
        renderOriginal();
        renderUserInput();
        updateStats();
        updateUIState();
        updateModeIndicator();
        updateTextInfo();
        statTimeEl.textContent = '00:00';
        statWPMEl.textContent = '0';
        statAccuracyEl.textContent = '100';
        statAccuracyEl.className = 'stat-value green';
        statProgressEl.textContent = '0/0';
        statTimeEl.classList.remove('timer-warning');
        btnResetSmall.style.display = 'none';
        timeLimitHint.style.display = 'none';
        document.getElementById('resultModal').style.display = 'none';
        document.querySelectorAll('.red-flash-overlay').forEach(function (el) {
            el.remove();
        });
        document.body.classList.remove('screen-shake');
        dialogOverlay.style.display = 'none';
        var bubble = document.querySelector('.game-dialog-bubble');
        if (bubble) bubble.remove();
    }
    function loadText(text) {
        var c = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        c = c.replace(/\n{3,}$/g, '\n\n');
        if (!isValidText(c)) {
            resetAll();
            showToast('⚠️ 文本无效');
            return false;
        }
        originalText = c;
        normalizedText = normalizeText(c);
        userInput = '';
        actualKeystrokes = 0;
        correctKeystrokes = 0;
        autoSkippedPositions = [];
        warningSoundPlayed = false;
        consecutiveErrors = 0;
        startTime = null;
        isFinished = false;
        isActive = false;
        modeSelected = false;
        useLowerCaseMode = false;
        stopTimer();
        hiddenEditable.textContent = '';
        renderOriginal();
        renderUserInput();
        updateStats();
        updateUIState();
        updateModeIndicator();
        updateTextInfo();
        btnResetSmall.style.display = 'none';
        timeLimitHint.style.display = 'none';
        statTimeEl.classList.remove('timer-warning');
        timeLimitHint.textContent = '/ ' + getTimeLimit() + 's';
        showToast('✅ 已生成 ' + originalText.length + ' 字符');
        return true;
    }
    function selectMode(lc) {
        useLowerCaseMode = lc;
        modeSelected = true;
        updateModeIndicator();
        resetTypingState();
        updateUIState();
        timeLimitHint.style.display = 'inline';
        showToast('🎯 严格匹配模式 - 限时' + getTimeLimit() + '秒！伙伴:' + (currentPartner || '无'));
        setTimeout(function () {
            focusInput();
        },
            400);
    }

    function updateModeIndicator() {
        modeIndicator.innerHTML = '';
        if (modeSelected && originalText) {
            modeIndicator.style.display = 'inline-flex';
            modeIndicator.style.background = 'rgba(239,68,68,0.2)';
            modeIndicator.style.color = '#ef4444';
            var txt = document.createElement('span');
            txt.textContent = '📝 严格匹配';
            modeIndicator.appendChild(txt);
            if (simpleMode && currentPartner !== '任寂阳') {
                var st = document.createElement('span');
                st.className = 'simple-mode-tag';
                st.textContent = '🎫简单券';
                modeIndicator.appendChild(st);
            }
        } else {
            modeIndicator.style.display = 'none';
        }
    }
    function updateTextInfo() {
        if (originalText) textInfo.textContent = originalText.length + '字符（' + countValidChars(originalText) + '有效）';
        else textInfo.textContent = '';
    }
    function focusInput() {
        if (isFinished) return;
        if (!originalText) {
            showToast('⚠️ 请先点击挑战');
            return;
        }
        if (!modeSelected) {
            showToast('⚠️ 系统准备中...');
            return;
        }
        hiddenEditable.focus();
    }

    virtualInputZone.addEventListener('click', focusInput);
    inputDisplayWrapper.addEventListener('click', focusInput);
    hiddenEditable.addEventListener('focus',
        function () {
            if (!isActive && !isFinished && originalText && modeSelected) updateUIState();
        });
    hiddenEditable.addEventListener('beforeinput',
        function (e) {
            e.preventDefault();
            if (isFinished) return;
            if (!originalText || !modeSelected) {
                hiddenEditable.textContent = '';
                return;
            }
            if (e.inputType === 'deleteContentBackward' || e.inputType === 'deleteContentForward') {
                handleBackspace();
                hiddenEditable.textContent = '';
                return;
            }
            if (e.inputType === 'insertText' && e.data) {
                for (var i = 0; i < e.data.length; i++) {
                    if (isFinished) break;
                    processChar(e.data[i]);
                }
                hiddenEditable.textContent = '';
                return;
            }
            hiddenEditable.textContent = '';
        });
    hiddenEditable.addEventListener('compositionstart',
        function () {
            hiddenEditable.dataset.composing = 'true';
        });
    hiddenEditable.addEventListener('compositionend',
        function (e) {
            hiddenEditable.dataset.composing = 'false';
            if (e.data) {
                for (var i = 0; i < e.data.length; i++) {
                    if (isFinished) break;
                    processChar(e.data[i]);
                }
            }
            hiddenEditable.textContent = '';
        });
    hiddenEditable.addEventListener('input',
        function (e) {
            if (hiddenEditable.textContent && hiddenEditable.dataset.composing !== 'true') {
                for (var i = 0; i < hiddenEditable.textContent.length; i++) {
                    if (isFinished) break;
                    processChar(hiddenEditable.textContent[i]);
                }
                hiddenEditable.textContent = '';
            }
        });
    hiddenEditable.addEventListener('keydown',
        function (e) {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                e.preventDefault();
                handleBackspace();
            }
        });

    var WORD_BANK = {
        articles: ['a', 'an', 'the'],
        conjunctions: ['and', 'but', 'or', 'yet', 'so'],
        prepositions: ['in', 'on', 'at', 'by', 'to', 'of', 'for', 'with', 'from'],
        pronouns: ['I', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her'],
        verbs: ['is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did', 'go', 'goes', 'make', 'makes', 'take', 'takes', 'give', 'know', 'think', 'see', 'come', 'find', 'keep', 'get', 'let', 'put', 'run', 'say', 'use'],
        adjectives: ['good', 'new', 'old', 'big', 'small', 'great', 'high', 'long', 'quick', 'happy', 'brave', 'quiet', 'bright', 'dark', 'wild', 'young', 'kind', 'true', 'free', 'clear', 'strong'],
        adverbs: ['very', 'just', 'quite', 'always', 'never', 'often', 'quickly', 'well', 'much', 'now', 'then', 'here', 'there'],
        nouns: ['time', 'day', 'night', 'world', 'life', 'hand', 'part', 'place', 'week', 'year', 'work', 'way', 'thing', 'name', 'home', 'water', 'light', 'mind', 'end', 'fact', 'group', 'number', 'job'],
        pangramWords: ['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog', 'wizard', 'jump', 'vex', 'zephyr', 'sphinx', 'quartz', 'judge', 'myth', 'jazz', 'excel', 'quiz', 'zebra', 'jungle', 'voyage', 'exotic', 'puzzle', 'majesty', 'galaxy', 'zenith', 'vortex', 'breeze']
    };
    function pick(a) {
        return a[Math.floor(Math.random() * a.length)]
    }
    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1)
    }
    function hasAllLetters(t) {
        var s = new Set();
        for (var i = 0; i < t.length; i++) {
            var ch = t[i].toLowerCase();
            if (ch >= 'a' && ch <= 'z') s.add(ch);
        }
        return s.size === 26;
    }
    function getMissingLetters(t) {
        var p = new Set();
        for (var i = 0; i < t.length; i++) {
            var ch = t[i].toLowerCase();
            if (ch >= 'a' && ch <= 'z') p.add(ch);
        }
        var m = [];
        for (var i = 97; i <= 122; i++) {
            var l = String.fromCharCode(i);
            if (!p.has(l)) m.push(l);
        }
        return m;
    }
    function getInjectWords(ml) {
        var m = {
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
        var w = [];
        for (var i = 0; i < ml.length; i++) {
            if (m[ml[i]]) w.push(pick(m[ml[i]]));
        }
        return w;
    }
    function generateSampleText(tl) {
        if (tl < 27) tl = 27;
        var temps = [function () {
            return pick(WORD_BANK.articles) + ' ' + pick(WORD_BANK.adjectives) + ' ' + pick(WORD_BANK.nouns) + ' ' + pick(WORD_BANK.verbs) + ' ' + pick(WORD_BANK.prepositions) + ' ' + pick(WORD_BANK.articles) + ' ' + pick(WORD_BANK.adjectives) + ' ' + pick(WORD_BANK.nouns);
        },
        function () {
            return pick(WORD_BANK.pronouns) + ' ' + pick(WORD_BANK.verbs) + ' ' + pick(WORD_BANK.adverbs) + ' ' + pick(WORD_BANK.adjectives) + ' ' + pick(WORD_BANK.conjunctions) + ' ' + pick(WORD_BANK.verbs) + ' ' + pick(WORD_BANK.adjectives) + ' ' + pick(WORD_BANK.nouns);
        },
        function () {
            return pick(WORD_BANK.articles) + ' ' + pick(WORD_BANK.pangramWords) + ' ' + pick(WORD_BANK.nouns) + ' ' + pick(WORD_BANK.verbs) + ' ' + pick(WORD_BANK.prepositions) + ' ' + pick(WORD_BANK.articles) + ' ' + pick(WORD_BANK.pangramWords) + ' ' + pick(WORD_BANK.nouns);
        }];
        var ss = [],
            total = 0,
            att = 0;
        while (total < tl - 20 && att < 300) {
            att++;
            var s = pick(temps)();
            if (Math.random() < 0.5) s = capitalize(s);
            var sp = s + '.';
            ss.push(sp);
            total = ss.join(' ').length;
        }
        while (ss.length > 1 && total > tl + 20) {
            ss.pop();
            total = ss.join(' ').length;
        }
        var text = ss.join(' ');
        if (!hasAllLetters(text)) {
            var iw = getInjectWords(getMissingLetters(text));
            if (iw.length > 0) {
                var extra = ' Also: ' + iw.join(' ') + '.';
                if (total + extra.length <= tl + 20) text = text + extra;
            }
        }
        text = text.trim();
        if (text.length > 0 && text[0] >= 'a' && text[0] <= 'z') text = capitalize(text);
        if (!text.endsWith('.')) text += '.';
        return text;
    }
    function generateCustomKeyText(keys, len) {
        var t = '';
        for (var i = 0; i < len; i++) t += keys[Math.floor(Math.random() * keys.length)];
        return t;
    }

    function showPasswordModal() {
        var d = document.getElementById('passwordDialog');
        d.innerHTML = '<div style="text-align:center;"><div style="font-size:2rem;margin-bottom:6px;">🔐</div><h3>进入口令</h3><p style="font-size:0.7rem;color:#9ca3af;margin:6px 0;">请输入20位口令（仅英文字母和数字）</p><input type="text" id="passwordInput" maxlength="20" placeholder="输入20位口令..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" style="width:100%;border:1px solid #374151;border-radius:6px;padding:8px;font-family:monospace;font-size:0.85rem;outline:none;background:rgba(0,0,0,0.3);color:#d1d5db;text-align:center;letter-spacing:0.1em;"><p id="passwordError" style="font-size:0.6rem;color:#ef4444;margin-top:6px;display:none;"></p><div style="display:flex;gap:6px;justify-content:center;margin-top:10px;"><button class="btn btn-outline btn-sm" id="btnPwdCancel">取消</button><button class="btn btn-primary btn-sm" id="btnPwdConfirm">确认</button></div></div>';
        document.getElementById('passwordModal').style.display = 'flex';
        var input = document.getElementById('passwordInput');
        setTimeout(function () {
            input.focus();
        },
            300);
        document.getElementById('btnPwdCancel').addEventListener('click',
            function () {
                document.getElementById('passwordModal').style.display = 'none';
                resetAll();
            });
        document.getElementById('btnPwdConfirm').addEventListener('click',
            function () {
                processPassword(input.value);
            });
        input.addEventListener('keydown',
            function (e) {
                if (e.key === 'Enter') processPassword(input.value);
            });
    }

    function processPassword(pwd) {
        var errorEl = document.getElementById('passwordError');
        if (pwd.length !== 20 || /[^a-zA-Z0-9]/.test(pwd)) {
            errorEl.textContent = '口令错误，进入失败';
            errorEl.style.display = 'block';
            return;
        }
        currentPassword = pwd;
        disabledPartners = [];
        simpleMode = pwd.toLowerCase().indexOf('sim') !== -1;
        simpleBonus = null;
        var s1 = pwd.substring(0, 2).toLowerCase(),
            s2 = pwd.substring(2, 4).toLowerCase(),
            s3 = pwd.substring(4, 6).toLowerCase(),
            s4 = pwd.substring(6, 8).toLowerCase(),
            s5 = pwd.substring(8, 10).toLowerCase(),
            s6 = pwd.substring(10, 12).toLowerCase(),
            s7 = pwd.substring(12, 14).toLowerCase(),
            s8 = pwd.substring(14, 16).toLowerCase(),
            s9 = pwd.substring(16, 18).toLowerCase(),
            s10 = pwd.substring(18, 20).toLowerCase();
        if (['1k', 'k1'].includes(s1)) disabledPartners.push('KG');
        if (['2y', 'y2'].includes(s2)) disabledPartners.push('云汐');
        if (['3q', 'q3'].includes(s3)) disabledPartners.push('Q太郎');
        if (['4r', 'r4'].includes(s4)) disabledPartners.push('任寂阳');
        if (['5f', 'f5'].includes(s5)) disabledPartners.push('南宫乘风');
        if (['6c', 'c6'].includes(s6)) disabledPartners.push('楚鸢');
        if (['7l', 'l7'].includes(s7)) disabledPartners.push('刘天天');
        if (['8n', 'n8'].includes(s8)) disabledPartners.push('南宫雅琪');
        if (s9 === 'sb') {
            document.getElementById('passwordModal').style.display = 'none';
            showSpecialResult('😛', '你被骗了', '#ef4444', false);
            return;
        }
        if (s10 === 'zk') {
            document.getElementById('passwordModal').style.display = 'none';
            showSpecialResult('💻', '项目管理员 张卡不雅古', '#fbbf24', true);
            return;
        }
        document.getElementById('passwordModal').style.display = 'none';
        showPartnerSelect();
    }

    function showSpecialResult(icon, msg, color, isSuccess) {
        if (isSuccess) {
            soundSuccess();
        } else {
            soundFailure();
            setTimeout(function () {
                triggerRedFlash();
            },
                200);
            setTimeout(function () {
                triggerScreenShake();
            },
                250);
        }
        var d = document.getElementById('specialResultDialog');
        d.innerHTML = '<div style="text-align:center;"><div style="font-size:4rem;">' + icon + '</div><h3 style="color:' + color + ';font-size:1.2rem;">' + msg + '</h3>' + (isSuccess ? '<p style="color:#10b981;font-weight:700;">⭐ 获得通关筹码×2</p>' : '') + '<div style="display:flex;gap:6px;justify-content:center;margin-top:12px;"><button class="btn btn-primary btn-sm" id="btnSpecialRetry">🔄 重新输入</button><button class="btn btn-outline btn-sm" id="btnSpecialHome">🏠 返回首页</button></div></div>';
        document.getElementById('specialResultModal').style.display = 'flex';
        document.getElementById('btnSpecialRetry').addEventListener('click',
            function () {
                document.getElementById('specialResultModal').style.display = 'none';
                showPasswordModal();
            });
        document.getElementById('btnSpecialHome').addEventListener('click',
            function () {
                document.getElementById('specialResultModal').style.display = 'none';
                resetAll();
            });
    }

    function showPartnerSelect() {
        var d = document.getElementById('partnerSelectDialog');
        var allNames = ['KG', '云汐', 'Q太郎', '任寂阳', '南宫乘风', '楚鸢', '刘天天', '南宫雅琪'];
        var availableNames = allNames.filter(function (n) {
            return !disabledPartners.includes(n);
        });
        var gridStyle = 'display:flex;flex-direction:column;gap:4px;';
        var simpleNotice = simpleMode ? '<p style="color:#10b981;font-size:0.6rem;margin:4px 0;">🎫 已使用简单券</p>' : '';
        var btnsHTML = availableNames.map(function (p) {
            return '<button class="btn btn-partner" data-partner="' + p + '">' + partnerEmojis[p] + ' ' + p + '</button>';
        }).join('');
        d.innerHTML = '<div style="text-align:center;"><div style="font-size:1.5rem;margin-bottom:4px;">🦆</div><h3>选择队友</h3><p style="font-size:0.7rem;color:#9ca3af;margin-bottom:4px;">请选择与你（艾雨柔）共同挑战该游艺项目的伙伴！</p>' + simpleNotice + '<div style="' + gridStyle + '">' + btnsHTML + '</div>' + (availableNames.length === 0 ? '<p style="color:#ef4444;">所有模式均被禁用</p>' : '') + '</div>';
        document.getElementById('partnerSelectModal').style.display = 'flex';
        if (availableNames.length === 0) return;
        d.querySelectorAll('.btn-partner').forEach(function (btn) {
            btn.addEventListener('click',
                function () {
                    showPartnerConfirm(this.dataset.partner);
                });
        });
    }

    function showPartnerConfirm(partner) {
        var pd = partners[partner];
        var desc = pd.desc || '';
        var confirmText = partner === '任寂阳' ? '<p style="font-size:0.7rem;color:#fbbf24;margin:6px 0;"><b>【确定】</b>要选择<b>' + partner + '</b>作为伙伴吗？</p><p style="font-size:0.6rem;color:#6b7280;margin:4px 0;">（不选择的话，像惯用操作一样，直接跑路点别的）</p>' : '<p style="font-size:0.7rem;color:#fbbf24;margin:6px 0;">确定要选择<b>' + partner + '</b>作为伙伴吗？</p><p style="font-size:0.6rem;color:#6b7280;margin:4px 0;">不选择的话，点击取消并直接点别的</p>';
        var d = document.getElementById('partnerConfirmDialog');
        d.innerHTML = '<div style="text-align:center;"><div style="font-size:2rem;margin-bottom:4px;">' + partnerEmojis[partner] + '</div><h3>' + partner + '</h3><p style="font-size:0.72rem;color:#d1d5db;line-height:1.5;margin:8px 0;text-align:left;">' + desc + '</p>' + confirmText + '<div style="display:flex;gap:6px;justify-content:center;margin-top:8px;"><button class="btn btn-outline btn-sm" id="btnPCancel">取消</button><button class="btn btn-primary btn-sm" id="btnPConfirm">确定</button></div></div>';
        document.getElementById('partnerConfirmModal').style.display = 'flex';
        document.getElementById('btnPCancel').addEventListener('click',
            function () {
                document.getElementById('partnerConfirmModal').style.display = 'none';
            });
        document.getElementById('btnPConfirm').addEventListener('click',
            function () {
                document.getElementById('partnerConfirmModal').style.display = 'none';
                document.getElementById('partnerSelectModal').style.display = 'none';
                startGameWithPartner(partner);
            });
    }

    function startGameWithPartner(partner) {
        currentPartner = partner;
        updatePartnerTag();
        challengeMode = true;
        updateChallengeUI();
        var pd = partners[partner];
        applySimpleBonus(partner, pd);
        if (pd.autoPass) {
            showDialogSequence([{
                speaker: '任寂阳',
                text: '这个时候，突然想起求我了吗，艾雨柔？这可不像你啊。'
            },
            {
                speaker: null,
                text: '（虽然不想承认，但我确实对这项打字任务非常没有信心……为什么懂电脑的人偏偏是他啊？）'
            },
            {
                speaker: '任寂阳',
                text: '当然可以，我们可是重要的伙伴啊，我会保护好你的。'
            },
            {
                speaker: '任寂阳',
                text: '——你以为我会这么说吗？'
            },
            {
                speaker: null,
                text: '（…………）'
            },
            {
                speaker: '任寂阳',
                text: '呵呵，可以倒是可以，但你得拿出像样的诚意来。比如，<span style="color:#ef4444;">给我50枚个人硬币</span>来换取这一次"通关"怎么样？'
            }],
                function () {
                    showConfirmDialog(null, '确定支付50枚艾雨柔硬币吗？',
                        function () {
                            showDialogSequence([{
                                speaker: '任寂阳',
                                text: '好啊，艾雨柔……为了活下来竟然做到这一步么。'
                            },
                            {
                                speaker: '任寂阳',
                                text: '就让你看看吧……因感冒发烧而错过NOI金牌的实力！'
                            }],
                                function () {
                                    showAutoPassResult();
                                });
                        },
                        function () {
                            showPartnerSelect();
                        });
                });
            return;
        }
        soundChallengeStart();
        var hasExc = currentPassword.includes('exc') && (partner === 'Q太郎' || partner === '南宫乘风');
        if (hasExc) {
            var preDialog = [];
            if (simpleMode && simpleBonus && partner !== '任寂阳') {
                preDialog.push({
                    speaker: null,
                    text: '<span style="color:#10b981;">' + simpleBonus.text + '</span>'
                });
            }
            var excMsg = partner === 'Q太郎' ? '嘿，艾雨柔哇！跟俺亿队滴话，腰8腰顺道儿叫唤<span style="color:#ef4444;">10枚个银阴逼（交换10枚个人硬币）</span>？' : '哦，是雨柔啊！跟我组队的话，要不要顺便<span style="color:#ef4444;">交换10枚个人硬币</span>啊？';
            function startGameAfterExc() {
                var dialog = getDialogForPartner(partner, currentPassword);
                if (dialog && dialog.length > 0) {
                    showDialogSequence(dialog,
                        function () {
                            actuallyStartGame(pd);
                        });
                } else {
                    actuallyStartGame(pd);
                }
            }
            if (preDialog.length > 0) {
                showDialogSequence(preDialog,
                    function () {
                        showConfirmDialog(partner, excMsg,
                            function () {
                                excSwapPartner = partner;
                                startGameAfterExc();
                            },
                            function () {
                                startGameAfterExc();
                            });
                    });
            } else {
                showConfirmDialog(partner, excMsg,
                    function () {
                        excSwapPartner = partner;
                        startGameAfterExc();
                    },
                    function () {
                        startGameAfterExc();
                    });
            }
            return;
        }
        var dialog = getDialogForPartner(partner, currentPassword);
        if (simpleMode && simpleBonus && partner !== '任寂阳') {
            var simplePrepend = [{
                speaker: null,
                text: '<span style="color:#10b981;">' + simpleBonus.text + '</span>'
            }];
            if (dialog) {
                dialog = simplePrepend.concat(dialog);
            } else {
                dialog = simplePrepend;
            }
        }
        if (dialog && dialog.length > 0) {
            showDialogSequence(dialog,
                function () {
                    actuallyStartGame(pd);
                });
        } else {
            actuallyStartGame(pd);
        }
    }

    function actuallyStartGame(pd) {
        if (pd.customText) {
            showCustomTextModal();
            return;
        }
        if (pd.customKeys) {
            var text = generateCustomKeyText(pd.customKeys, pd.textLength);
            if (loadText(text)) {
                setTimeout(function () {
                    selectMode(false);
                },
                    300);
            }
            return;
        }
        var text = generateSampleText(pd.textLength);
        if (loadText(text)) {
            setTimeout(function () {
                selectMode(false);
            },
                300);
        }
    }
    function startChallenge() {
        showPasswordModal();
    }

    function showAutoPassResult() {
        soundSuccess();
        var d = document.getElementById('resultDialog');
        d.innerHTML = '<div style="text-align:center;"><div style="font-size:3rem;">💻</div><h3 style="color:#fbbf24;">任寂阳带你直接通关！</h3><p style="color:#a78bfa;font-size:0.7rem;">伙伴: ' + partnerEmojis['任寂阳'] + ' 任寂阳</p><p style="color:#10b981;font-weight:700;">⭐ 获得通关筹码×2</p><p style="color:#f59e0b;font-size:0.7rem;">💰 支付50枚艾雨柔硬币</p><div style="display:flex;gap:6px;justify-content:center;margin-top:8px;"><button class="btn btn-primary btn-sm" id="btnRetry">🔄 再次挑战</button><button class="btn btn-outline btn-sm" id="btnBackToStart">🏠 返回首页</button></div></div>';
        document.getElementById('resultModal').style.display = 'flex';
        document.getElementById('btnRetry').addEventListener('click',
            function () {
                document.getElementById('resultModal').style.display = 'none';
                startChallenge();
            });
        document.getElementById('btnBackToStart').addEventListener('click',
            function () {
                document.getElementById('resultModal').style.display = 'none';
                resetAll();
            });
    }

    function showCustomTextModal() {
        var d = document.getElementById('customTextDialog');
        var pd = partners[currentPartner];
        var minLen = pd ? pd.textLength : 200;
        d.innerHTML = '<div style="text-align:center;"><h3>📋 自定义文本</h3><p style="font-size:0.68rem;color:#9ca3af;">请选择粘贴或上传文本（≥' + minLen + '字符）</p><div style="display:flex;gap:6px;justify-content:center;margin:10px 0;"><button class="btn btn-outline btn-sm" id="btnPasteCustom">📋 粘贴</button><button class="btn btn-outline btn-sm" id="btnUploadCustom">📁 上传</button></div><textarea id="customTextarea" rows="4" style="width:100%;border:1px solid #374151;border-radius:6px;padding:8px;font-family:monospace;font-size:0.75rem;background:rgba(0,0,0,0.3);color:#d1d5db;display:none;"></textarea><p id="customTextError" style="font-size:0.6rem;color:#ef4444;margin-top:4px;display:none;"></p><div style="display:flex;gap:6px;justify-content:center;margin-top:8px;"><button class="btn btn-ghost btn-sm" id="btnCustomCancel">取消</button><button class="btn btn-primary btn-sm" id="btnCustomConfirm" style="display:none;">✅ 确认</button></div></div>';
        document.getElementById('customTextModal').style.display = 'flex';
        var ta = document.getElementById('customTextarea');
        document.getElementById('btnPasteCustom').addEventListener('click',
            function () {
                ta.style.display = 'block';
                ta.focus();
            });
        document.getElementById('btnUploadCustom').addEventListener('click',
            function () {
                fileInput.click();
            });
        document.getElementById('btnCustomCancel').addEventListener('click',
            function () {
                document.getElementById('customTextModal').style.display = 'none';
                showPartnerSelect();
            });
        document.getElementById('btnCustomConfirm').addEventListener('click',
            function () {
                if (ta.value.length >= minLen) {
                    document.getElementById('customTextModal').style.display = 'none';
                    if (loadText(ta.value)) {
                        setTimeout(function () {
                            selectMode(false);
                        },
                            300);
                    }
                }
            });
        ta.addEventListener('input',
            function () {
                var err = document.getElementById('customTextError');
                var btn = document.getElementById('btnCustomConfirm');
                if (ta.value.length < minLen) {
                    err.textContent = '文本不足' + minLen + '字符（当前:' + ta.value.length + '字符）';
                    err.style.display = 'block';
                    btn.style.display = 'none';
                } else {
                    err.style.display = 'none';
                    btn.style.display = 'inline-flex';
                }
            });
        fileInput.addEventListener('change',
            function () {
                var f = this.files[0];
                if (!f) return;
                var r = new FileReader();
                r.onload = function (e) {
                    ta.value = e.target.result;
                    ta.style.display = 'block';
                    var err = document.getElementById('customTextError');
                    var btn = document.getElementById('btnCustomConfirm');
                    if (ta.value.length < minLen) {
                        err.textContent = '文本不足' + minLen + '字符';
                        err.style.display = 'block';
                        btn.style.display = 'none';
                    } else {
                        err.style.display = 'none';
                        btn.style.display = 'inline-flex';
                    }
                };
                r.readAsText(f, 'UTF-8');
                this.value = '';
            });
    }

    document.getElementById('btnReset').addEventListener('click',
        function () {
            if (isActive && !isFinished) {
                document.getElementById('confirmBackModal').style.display = 'flex';
            } else if (originalText) {
                resetAll();
            } else {
                showToast('⚠️ 请先点击挑战');
            }
        });
    document.getElementById('btnConfirmBack').addEventListener('click',
        function () {
            document.getElementById('confirmBackModal').style.display = 'none';
            resetAll();
        });
    document.getElementById('btnConfirmCancel').addEventListener('click',
        function () {
            document.getElementById('confirmBackModal').style.display = 'none';
        });
    btnResetSmall.addEventListener('click',
        function () {
            resetTypingState();
            focusInput();
        });
    document.querySelectorAll('.modal-overlay').forEach(function (ov) {
        ov.addEventListener('click',
            function (e) {
                if (e.target === this) this.style.display = 'none';
            });
    });
    document.addEventListener('keydown',
        function (e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(function (m) {
                    if (m.style.display === 'flex') m.style.display = 'none';
                });
            }
        });
    document.addEventListener('touchmove',
        function (e) {
            if (!e.target.closest('.original-text') && !e.target.closest('.input-display-section') && !e.target.closest('.modal-dialog')) {
                e.preventDefault();
            }
        },
        {
            passive: false
        });

    function init() {
        hideTypingUI();
        renderOriginal();
        renderUserInput();
        updateStats();
        updateUIState();
        updateModeIndicator();
        updateTextInfo();
        timeLimitHint.style.display = 'none';
        setTimeout(function () {
            if (splashScreen) splashScreen.remove();
        },
            6000);
    }
    init();
    console.log('🦆 众手杀·六指打字魔 - Q太郎描述修改版');
})();