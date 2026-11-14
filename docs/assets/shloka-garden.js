(function initShlokaGarden() {
  const btn = document.getElementById("challengeBtn");
  const panel = document.getElementById("previewPanel");
  if (!btn || !panel) return;

  const STORAGE_PREFIX = window.SP_STORAGE_PREFIX || "sanskritParichay";
  const SHLOKA_KEY = STORAGE_PREFIX + ".shlokaGarden.progress";
  const SHLOKA_REWARD_KEY = STORAGE_PREFIX + ".shlokaGarden.dailyReward";
  const motion = window.Motion || {};
  const animate = motion.animate || function () {};

  const ui = {
    title: document.getElementById("previewTitle"),
    text: document.getElementById("previewText"),
    meta: document.getElementById("challengeMeta"),
    progressFill: document.getElementById("challengeProgressFill"),
    progressText: document.getElementById("challengeProgressText"),
    choices: document.getElementById("previewChoices"),
    status: document.getElementById("previewStatus"),
    actionBtn: document.getElementById("challengeActionBtn"),
    subtitle: document.getElementById("challengeSubtitle"),
    mascot: document.getElementById("mascot"),
    mascotSpeech: document.getElementById("mascotSpeech"),
    gems: document.getElementById("homeGems")
  };

  const lineTemplate = [
    { sanskrit: "ॐ सह नाववतु ।", transliteration: "Om saha navavatu", meaning: "May we be protected together." },
    { sanskrit: "सह नौ भुनक्तु ।", transliteration: "Saha nau bhunaktu", meaning: "May we be nourished together." },
    { sanskrit: "सह वीर्यं करवावहै ।", transliteration: "Saha viryam karavavahai", meaning: "May we work together with great energy." },
    { sanskrit: "तेजस्वि नावधीतमस्तु मा विद्विषावहै ।", transliteration: "Tejasvi navadhitamastu ma vidvishavahai", meaning: "May our learning shine. May we never dislike one another." },
    { sanskrit: "ॐ शान्तिः शान्तिः शान्तिः ॥", transliteration: "Om shantih shantih shantih", meaning: "Om, peace, peace, peace." }
  ];

  const cueOffsets = [
    { start: 0.0, end: 6.5, lineIndex: 0 },
    { start: 6.5, end: 12.5, lineIndex: 1 },
    { start: 12.5, end: 18.5, lineIndex: 2 },
    { start: 18.5, end: 25.5, lineIndex: 3 },
    { start: 25.5, end: 28.2, lineIndex: 4 }
  ];

  function buildCues(startOffset) {
    return cueOffsets.map(function (cue) {
      return {
        start: startOffset + cue.start,
        end: startOffset + cue.end,
        lineIndex: cue.lineIndex
      };
    });
  }

  const shloka = {
    id: "sahana-vavatu",
    title: "Sahana Vavatu",
    learningVideo: "../assets/media/shlokas/sahana-vavatu-learning-v1.mp4",
    sceneImages: [
      "../assets/illustrations/shloka/sahana-scene-1.png",
      "../assets/illustrations/shloka/sahana-scene-2.png",
      "../assets/illustrations/shloka/sahana-scene-3.png",
      "../assets/illustrations/shloka/sahana-scene-4.png"
    ],
    lines: lineTemplate,
    cues: buildCues(2).concat(buildCues(32))
  };

  const state = loadState();
  const runtime = {
    video: null,
    subtitleLine: null,
    subtitleTranslit: null,
    subtitleMeaning: null,
    sceneNodes: [],
    currentCueIndex: -1,
    lineCards: [],
    reciteBtn: null
  };

  function londonDateKey() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const get = function (type) {
      return (parts.find(function (p) { return p.type === type; }) || {}).value || "";
    };
    return get("year") + "-" + get("month") + "-" + get("day");
  }

  function loadState() {
    const base = {
      watched: false,
      practicedLines: {},
      recited: false,
      completed: [],
      lastRewardDate: ""
    };
    try {
      const parsed = JSON.parse(localStorage.getItem(SHLOKA_KEY) || "{}");
      const reward = JSON.parse(localStorage.getItem(SHLOKA_REWARD_KEY) || "{}");
      base.watched = Boolean(parsed.watched);
      base.practicedLines = parsed.practicedLines && typeof parsed.practicedLines === "object" ? parsed.practicedLines : {};
      base.recited = Boolean(parsed.recited);
      base.completed = Array.isArray(parsed.completed) ? parsed.completed : [];
      base.lastRewardDate = typeof reward.date === "string" ? reward.date : "";
      return base;
    } catch (_error) {
      return base;
    }
  }

  function saveState() {
    localStorage.setItem(SHLOKA_KEY, JSON.stringify({
      watched: state.watched,
      practicedLines: state.practicedLines,
      recited: state.recited,
      completed: state.completed
    }));
    localStorage.setItem(SHLOKA_REWARD_KEY, JSON.stringify({ date: state.lastRewardDate }));
  }

  function setMascotSpeech(text) {
    if (ui.mascotSpeech) ui.mascotSpeech.textContent = text;
  }

  function danceMithu() {
    if (!ui.mascot) return;
    animate(ui.mascot, {
      transform: [
        "translateY(0px) rotate(0deg)",
        "translateY(-9px) rotate(6deg)",
        "translateY(0px) rotate(-6deg)",
        "translateY(0px) rotate(0deg)"
      ]
    }, { duration: 1.2, easing: "ease-in-out" });
  }

  function launchCelebration() {
    danceMithu();
    if (typeof window.spFlowerRain === "function") {
      window.spFlowerRain(panel, { density: 28, durationMs: 2800 });
    }
    if (window.confetti) {
      window.confetti({
        particleCount: 90,
        spread: 68,
        startVelocity: 26,
        ticks: 105,
        origin: { y: 0.68 },
        colors: ["#ffd166", "#ff8fab", "#73d2de", "#95d95e"]
      });
    }
  }

  function isCompleted() {
    return state.completed.indexOf(shloka.id) !== -1;
  }

  function computeProgress() {
    let score = 0;
    if (state.watched) score += 1;
    const lineCount = shloka.lines.length;
    const practicedCount = shloka.lines.reduce(function (acc, _line, index) {
      return acc + (state.practicedLines[index] ? 1 : 0);
    }, 0);
    score += practicedCount / lineCount;
    if (state.recited) score += 1;
    if (isCompleted()) score += 1;
    const percent = Math.round((score / 4) * 100);
    return Math.max(0, Math.min(100, percent));
  }

  function renderProgress() {
    const percent = computeProgress();
    if (ui.progressFill) ui.progressFill.style.width = percent + "%";
    if (ui.progressText) {
      ui.progressText.textContent = isCompleted()
        ? "Practice progress: Complete 🌸"
        : "Practice progress: " + percent + "%";
    }
  }

  function resolvePath(path) {
    if (typeof window.spResolveAssetPath === "function") return window.spResolveAssetPath(path);
    return path;
  }

  function markLinePracticed(index) {
    state.practicedLines[index] = true;
    saveState();
    renderProgress();
  }

  function highlightLine(lineIndex) {
    runtime.lineCards.forEach(function (card, idx) {
      card.classList.toggle("active", idx === lineIndex);
    });
  }

  function setSubtitle(timeSec) {
    const cueIndex = shloka.cues.findIndex(function (cue) {
      return timeSec >= cue.start && timeSec < cue.end;
    });
    if (cueIndex === -1) return;
    if (runtime.currentCueIndex === cueIndex) return;
    runtime.currentCueIndex = cueIndex;
    const cue = shloka.cues[cueIndex];
    const line = shloka.lines[cue.lineIndex];
    runtime.subtitleLine.textContent = line.sanskrit;
    runtime.subtitleTranslit.textContent = line.transliteration;
    runtime.subtitleMeaning.textContent = line.meaning;
    highlightLine(cue.lineIndex);
    highlightScene(cue.lineIndex);
    markLinePracticed(cue.lineIndex);
  }

  function highlightScene(lineIndex) {
    if (!runtime.sceneNodes.length) return;
    const sceneIndex = Math.min(3, Math.max(0, lineIndex % 4));
    runtime.sceneNodes.forEach(function (node, index) {
      node.classList.toggle("active", index === sceneIndex);
    });
  }

  function updateGemCounter() {
    if (!ui.gems || typeof window.spGetRewards !== "function") return;
    const pathOrder = Array.isArray(window.SP_WORLD_ORDER) && window.SP_WORLD_ORDER.length
      ? window.SP_WORLD_ORDER
      : ["alphabet", "animals", "numbers", "colours", "words", "sentences", "stories", "culture"];
    const totals = window.SP_WORLD_TOTALS || {
      alphabet: 9, animals: 3, numbers: 3, colours: 3, words: 3, sentences: 3, stories: 3, culture: 3
    };
    const rewards = window.spGetRewards(pathOrder, totals);
    ui.gems.textContent = String(Number(rewards.gems || 0));
  }

  function rewardOncePerDay() {
    const today = londonDateKey();
    if (state.lastRewardDate === today) return false;
    if (window.SPProgressStore && typeof window.SPProgressStore.awardDailyChallengeGems === "function") {
      window.SPProgressStore.awardDailyChallengeGems(today);
    }
    state.lastRewardDate = today;
    saveState();
    updateGemCounter();
    return true;
  }

  function completePractice() {
    if (!isCompleted()) state.completed.push(shloka.id);
    const rewarded = rewardOncePerDay();
    saveState();
    renderProgress();
    panel.classList.remove("wrong");
    panel.classList.add("correct");
    const rewardText = rewarded ? " You also earned 2 Gems for today." : "";
    ui.status.textContent = "🌸 Shloka complete! Replay anytime and keep chanting." + rewardText;
    setMascotSpeech("Wonderful chanting! Mithu is so proud of you.");
    launchCelebration();
  }

  function scrollIntoView() {
    const header = document.querySelector(".site-header");
    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 82;
    panel.style.scrollMarginTop = headerHeight + 10 + "px";
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startVideo(chantMode) {
    if (!runtime.video) return;
    runtime.currentCueIndex = -1;
    runtime.video.currentTime = 0;
    runtime.video.play().catch(function () {});
    state.watched = true;
    if (chantMode) {
      state.recited = true;
      setMascotSpeech("Chant along with me! Keep your voice gentle and clear.");
      ui.status.textContent = "Chant-along mode started. Follow the highlighted Sanskrit lines.";
    } else {
      setMascotSpeech("Listen, repeat, and enjoy each line with Mithu.");
      ui.status.textContent = "Watch the learning video and follow the subtitles.";
    }
    saveState();
    renderProgress();
  }

  function renderGarden() {
    panel.classList.remove("wrong");
    ui.title.textContent = "Shloka Garden · " + shloka.title;
    ui.text.textContent = "Watch the new 1-minute learning video, follow Sanskrit subtitles, and practise chant-along replays.";
    ui.meta.textContent = "Created from your four contact-sheet illustrations with preserved original children's chanting audio.";
    if (ui.subtitle) ui.subtitle.textContent = "Learn one shloka with video, meaning, and joyful chant-along practice.";
    if (ui.actionBtn) ui.actionBtn.style.display = "none";

    ui.choices.innerHTML = [
      '<div class="shloka-garden">',
      '  <div class="shloka-video-wrap">',
      '    <video id="shlokaVideo" class="shloka-video" playsinline controls preload="metadata"></video>',
      '    <div class="shloka-subtitle">',
      '      <p id="shlokaSubtitleLine" class="line"></p>',
      '      <p id="shlokaSubtitleTranslit" class="translit"></p>',
      '      <p id="shlokaSubtitleMeaning" class="meaning"></p>',
      '    </div>',
      '  </div>',
      '  <div class="shloka-scenes" id="shlokaScenes"></div>',
      '  <div class="shloka-actions">',
      '    <button type="button" class="button primary" id="startShlokaJourneyBtn">▶ Play New Shloka Learning Video (1 min)</button>',
      '    <button type="button" class="button challenge" id="reciteWithMithuBtn" hidden>🎤 Recite with Mithu</button>',
      '    <button type="button" class="button secondary" id="completeShlokaBtn">🌸 Mark Practice Complete</button>',
      '  </div>',
      '  <p class="footer-note recite-privacy-note">Chant-along mode only: no microphone, no voice recording, no automated pronunciation scoring.</p>',
      '  <div class="shloka-lines" id="shlokaLineCards"></div>',
      '</div>'
    ].join("");

    runtime.subtitleLine = document.getElementById("shlokaSubtitleLine");
    runtime.subtitleTranslit = document.getElementById("shlokaSubtitleTranslit");
    runtime.subtitleMeaning = document.getElementById("shlokaSubtitleMeaning");
    runtime.reciteBtn = document.getElementById("reciteWithMithuBtn");
    runtime.currentCueIndex = -1;

    const scenesHost = document.getElementById("shlokaScenes");
    runtime.sceneNodes = [];
    shloka.sceneImages.forEach(function (scenePath, index) {
      const img = document.createElement("img");
      img.className = "shloka-scene" + (index === 0 ? " active" : "");
      img.alt = "Shloka scene " + (index + 1);
      img.src = resolvePath(scenePath);
      scenesHost.appendChild(img);
      runtime.sceneNodes.push(img);
    });

    const lineCards = document.getElementById("shlokaLineCards");
    runtime.lineCards = [];
    shloka.lines.forEach(function (line, index) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "shloka-line-card";
      card.innerHTML = '<span class="sa">' + line.sanskrit + '</span><span class="tr">' + line.transliteration + '</span><span class="en">' + line.meaning + "</span>";
      card.addEventListener("click", function (event) {
        event.stopPropagation();
        if (!runtime.video) return;
        const cue = shloka.cues.find(function (c) { return c.lineIndex === index; });
        if (!cue) return;
        runtime.video.currentTime = cue.start;
        runtime.video.play().catch(function () {});
        runtime.subtitleLine.textContent = line.sanskrit;
        runtime.subtitleTranslit.textContent = line.transliteration;
        runtime.subtitleMeaning.textContent = line.meaning;
        ui.status.textContent = "Line replay started. Repeat with Mithu.";
        setMascotSpeech("Lovely! Repeat this line with me.");
        markLinePracticed(index);
        highlightLine(index);
        highlightScene(index);
      });
      lineCards.appendChild(card);
      runtime.lineCards.push(card);
    });

    const video = document.getElementById("shlokaVideo");
    runtime.video = video;
    video.src = resolvePath(shloka.learningVideo);
    runtime.subtitleLine.textContent = shloka.lines[0].sanskrit;
    runtime.subtitleTranslit.textContent = shloka.lines[0].transliteration;
    runtime.subtitleMeaning.textContent = shloka.lines[0].meaning;

    video.addEventListener("timeupdate", function () {
      setSubtitle(video.currentTime);
    });

    video.addEventListener("ended", function () {
      runtime.reciteBtn.hidden = false;
      runtime.reciteBtn.textContent = "🎤 Recite with Mithu";
      ui.status.textContent = "Great listening! Tap 🎤 Recite with Mithu to chant along from the beginning.";
      setMascotSpeech("Beautiful! Now chant with me from the start.");
    });

    document.getElementById("startShlokaJourneyBtn").addEventListener("click", function (event) {
      event.stopPropagation();
      startVideo(false);
    }, true);

    runtime.reciteBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      startVideo(true);
      runtime.reciteBtn.textContent = "🔁 Recite with Mithu Again";
    }, true);

    document.getElementById("completeShlokaBtn").addEventListener("click", function (event) {
      event.stopPropagation();
      completePractice();
    }, true);

    if (isCompleted()) {
      ui.status.textContent = "🌸 Completed earlier! You can replay and practise again anytime.";
      setMascotSpeech("Welcome back! Let's chant Sahana Vavatu again.");
      runtime.reciteBtn.hidden = false;
      runtime.reciteBtn.textContent = "🔁 Recite with Mithu Again";
    } else {
      ui.status.textContent = "Tap Play New Shloka Learning Video to begin.";
      setMascotSpeech("Let's begin Shloka Garden with Sahana Vavatu.");
    }

    renderProgress();
  }

  btn.textContent = "Shloka Garden";
  btn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    renderGarden();
    scrollIntoView();
  }, true);

  if (ui.actionBtn) {
    ui.actionBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  renderGarden();
})();
