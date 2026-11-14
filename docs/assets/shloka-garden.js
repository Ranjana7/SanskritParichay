(function initShlokaGarden() {
  const btn = document.getElementById("challengeBtn");
  const panel = document.getElementById("previewPanel");
  if (!btn || !panel) return;

  const STORAGE_PREFIX = window.SP_STORAGE_PREFIX || "sanskritParichay";
  const SHLOKA_KEY = STORAGE_PREFIX + ".shlokaGarden.progress.v2";
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
  const WELCOME_MESSAGE = "Namaste, little explorer! 🌟\n\nI'm Mithu! Let's discover Sanskrit together through magical worlds, fun games, beautiful shlokas and exciting adventures!\n\nReady to explore?";

  function buildSahanaCues(offset) {
    return [
      { start: offset + 0.0, end: offset + 6.2, lineIndex: 0 },
      { start: offset + 6.2, end: offset + 12.2, lineIndex: 1 },
      { start: offset + 12.2, end: offset + 18.2, lineIndex: 2 },
      { start: offset + 18.2, end: offset + 25.2, lineIndex: 3 },
      { start: offset + 25.2, end: offset + 28.2, lineIndex: 4 }
    ];
  }

  function buildNamoCues(offset) {
    return [
      { start: offset + 0.0, end: offset + 14.1, lineIndex: 0 },
      { start: offset + 14.1, end: offset + 28.2, lineIndex: 1 }
    ];
  }

  const SHLOKA_LIBRARY = [
    {
      id: "sahana-vavatu",
      title: "Sah Nāvavatu",
      description: "Learn a peaceful prayer for studying together with kindness and joy.",
      learningVideo: "../assets/media/shlokas/sahana-vavatu-learning-v2.mp4",
      thumbnail: "../assets/illustrations/shloka/sahana-scene-1.png",
      sceneImages: [
        "../assets/illustrations/shloka/sahana-scene-1.png",
        "../assets/illustrations/shloka/sahana-scene-2.png",
        "../assets/illustrations/shloka/sahana-scene-3.png",
        "../assets/illustrations/shloka/sahana-scene-4.png"
      ],
      lines: [
        { sanskrit: "ॐ सह नाववतु ।", transliteration: "Om saha navavatu", meaning: "May we be protected together." },
        { sanskrit: "सह नौ भुनक्तु ।", transliteration: "Saha nau bhunaktu", meaning: "May we be nourished together." },
        { sanskrit: "सह वीर्यं करवावहै ।", transliteration: "Saha viryam karavavahai", meaning: "May we work together with great energy." },
        { sanskrit: "तेजस्वि नावधीतमस्तु मा विद्विषावहै ।", transliteration: "Tejasvi navadhitamastu ma vidvishavahai", meaning: "May our learning shine, and may we stay kind to each other." },
        { sanskrit: "ॐ शान्तिः शान्तिः शान्तिः ॥", transliteration: "Om shantih shantih shantih", meaning: "Om, peace, peace, peace." }
      ],
      cues: buildSahanaCues(0).concat(buildSahanaCues(29.0)),
      sceneWindows: [
        { start: 0, end: 14.05, sceneIndex: 0 },
        { start: 14.05, end: 28.1, sceneIndex: 1 },
        { start: 28.1, end: 42.15, sceneIndex: 2 },
        { start: 42.15, end: 57.2, sceneIndex: 3 }
      ]
    },
    {
      id: "namo-devyai-mahadevyai",
      title: "Namo Devyai Mahādevyai",
      description: "Chant a beautiful Devi shloka with devotion, calm focus, and gratitude.",
      learningVideo: "../assets/media/shlokas/namo-devyai-mahadevyai-learning-v1.mp4",
      thumbnail: "../assets/illustrations/shloka/namo-scene-1.png",
      sceneImages: [
        "../assets/illustrations/shloka/namo-scene-1.png",
        "../assets/illustrations/shloka/namo-scene-2.png",
        "../assets/illustrations/shloka/namo-scene-3.png",
        "../assets/illustrations/shloka/namo-scene-4.png"
      ],
      lines: [
        { sanskrit: "नमो देव्यै महादेव्यै शिवायै सततं नमः ।", transliteration: "Namo devyai mahadevyai shivayai satatam namah", meaning: "Salutations always to the Divine Great Goddess, the auspicious one." },
        { sanskrit: "नमः प्रकृत्यै भद्रायै नियताः प्रणताः स्म ताम् ॥", transliteration: "Namah prakrityai bhadrayai niyatah pranatah sma tam", meaning: "Salutations to holy Prakriti; we bow to Her with steady devotion." }
      ],
      cues: buildNamoCues(0).concat(buildNamoCues(29.0)),
      sceneWindows: [
        { start: 0, end: 14.05, sceneIndex: 0 },
        { start: 14.05, end: 28.1, sceneIndex: 1 },
        { start: 28.1, end: 42.15, sceneIndex: 2 },
        { start: 42.15, end: 57.2, sceneIndex: 3 }
      ]
    }
  ];

  const state = loadState();
  const runtime = {
    activeShlokaId: SHLOKA_LIBRARY[0].id,
    video: null,
    subtitleLine: null,
    subtitleTranslit: null,
    subtitleMeaning: null,
    sceneNodes: [],
    currentCueIndex: -1,
    lineCards: [],
    reciteBtn: null
  };

  function resolvePath(path) {
    if (typeof window.spResolveAssetPath === "function") return window.spResolveAssetPath(path);
    return path;
  }

  function getShlokaById(id) {
    return SHLOKA_LIBRARY.find(function (entry) { return entry.id === id; }) || SHLOKA_LIBRARY[0];
  }

  function ensureShlokaState(id) {
    if (!state.shlokas[id]) {
      state.shlokas[id] = { watched: false, recited: false, practicedLines: {}, completed: false };
    }
    return state.shlokas[id];
  }

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
    const base = { shlokas: {}, lastRewardDate: "" };
    try {
      const parsed = JSON.parse(localStorage.getItem(SHLOKA_KEY) || "{}");
      const reward = JSON.parse(localStorage.getItem(SHLOKA_REWARD_KEY) || "{}");
      if (parsed && typeof parsed === "object" && parsed.shlokas && typeof parsed.shlokas === "object") {
        base.shlokas = parsed.shlokas;
      }
      base.lastRewardDate = typeof reward.date === "string" ? reward.date : "";
    } catch (_error) {
      return base;
    }
    return base;
  }

  function saveState() {
    localStorage.setItem(SHLOKA_KEY, JSON.stringify({ shlokas: state.shlokas }));
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

  function getShlokaProgressPercent(shloka) {
    const progress = ensureShlokaState(shloka.id);
    let score = 0;
    if (progress.watched) score += 1;
    const lineCount = shloka.lines.length;
    const practicedCount = shloka.lines.reduce(function (acc, _line, index) {
      return acc + (progress.practicedLines[index] ? 1 : 0);
    }, 0);
    score += practicedCount / Math.max(1, lineCount);
    if (progress.recited) score += 1;
    if (progress.completed) score += 1;
    return Math.max(0, Math.min(100, Math.round((score / 4) * 100)));
  }

  function getOverallProgressPercent() {
    const total = SHLOKA_LIBRARY.reduce(function (sum, shloka) {
      return sum + getShlokaProgressPercent(shloka);
    }, 0);
    return Math.round(total / SHLOKA_LIBRARY.length);
  }

  function renderProgress() {
    const active = getShlokaById(runtime.activeShlokaId);
    const activeProgress = getShlokaProgressPercent(active);
    const overallProgress = getOverallProgressPercent();
    if (ui.progressFill) ui.progressFill.style.width = overallProgress + "%";
    if (ui.progressText) {
      ui.progressText.textContent = activeProgress === 100
        ? "Shloka progress: Complete 🌸 | Garden: " + overallProgress + "%"
        : "Shloka progress: " + activeProgress + "% | Garden: " + overallProgress + "%";
    }
  }

  function highlightLine(lineIndex) {
    runtime.lineCards.forEach(function (card, idx) {
      card.classList.toggle("active", idx === lineIndex);
    });
  }

  function highlightScene(timeSec, shloka) {
    const match = shloka.sceneWindows.find(function (windowRef) {
      return timeSec >= windowRef.start && timeSec < windowRef.end;
    });
    const sceneIndex = match ? match.sceneIndex : 0;
    runtime.sceneNodes.forEach(function (node, idx) {
      node.classList.toggle("active", idx === sceneIndex);
    });
  }

  function markLinePracticed(shloka, index) {
    const progress = ensureShlokaState(shloka.id);
    progress.practicedLines[index] = true;
    saveState();
    renderProgress();
    updateShlokaCardBadges();
  }

  function setSubtitle(timeSec, shloka) {
    const cueIndex = shloka.cues.findIndex(function (cue) {
      return timeSec >= cue.start && timeSec < cue.end;
    });
    if (cueIndex === -1 || cueIndex === runtime.currentCueIndex) return;
    runtime.currentCueIndex = cueIndex;
    const cue = shloka.cues[cueIndex];
    const line = shloka.lines[cue.lineIndex];
    runtime.subtitleLine.textContent = line.sanskrit;
    runtime.subtitleTranslit.textContent = line.transliteration;
    runtime.subtitleMeaning.textContent = line.meaning;
    highlightLine(cue.lineIndex);
    highlightScene(timeSec, shloka);
    markLinePracticed(shloka, cue.lineIndex);
  }

  function getFirstCueTime(shloka, lineIndex) {
    const cue = shloka.cues.find(function (entry) { return entry.lineIndex === lineIndex; });
    return cue ? cue.start : 0;
  }

  function completePractice(shloka) {
    const progress = ensureShlokaState(shloka.id);
    progress.completed = true;
    const rewarded = rewardOncePerDay();
    saveState();
    renderProgress();
    updateShlokaCardBadges();
    panel.classList.remove("wrong");
    panel.classList.add("correct");
    ui.status.textContent = rewarded
      ? "🌸 " + shloka.title + " complete! You earned 2 Gems for today."
      : "🌸 " + shloka.title + " complete! Replay anytime with Mithu.";
    setMascotSpeech("Wonderful! Your chanting is glowing with confidence.");
    launchCelebration();
  }

  function startVideo(shloka, chantMode) {
    if (!runtime.video) return;
    runtime.currentCueIndex = -1;
    runtime.video.currentTime = 0;
    runtime.video.play().catch(function () {});

    const progress = ensureShlokaState(shloka.id);
    progress.watched = true;
    if (chantMode) {
      progress.recited = true;
      ui.status.textContent = "Chant-along mode started. Follow highlighted lines and recite with Mithu.";
      setMascotSpeech("Beautiful! Chant with me line by line.");
    } else {
      ui.status.textContent = "Watch and learn " + shloka.title + " with subtitles and meaning.";
      setMascotSpeech("Let's watch " + shloka.title + " together.");
    }
    saveState();
    renderProgress();
    updateShlokaCardBadges();
  }

  function renderSceneStrip(shloka) {
    const scenesHost = document.getElementById("shlokaScenes");
    runtime.sceneNodes = [];
    scenesHost.innerHTML = "";
    shloka.sceneImages.forEach(function (scenePath, index) {
      const img = document.createElement("img");
      img.className = "shloka-scene" + (index === 0 ? " active" : "");
      img.alt = shloka.title + " scene " + (index + 1);
      img.src = resolvePath(scenePath);
      scenesHost.appendChild(img);
      runtime.sceneNodes.push(img);
    });
  }

  function renderLineCards(shloka) {
    const lineCards = document.getElementById("shlokaLineCards");
    runtime.lineCards = [];
    lineCards.innerHTML = "";
    shloka.lines.forEach(function (line, index) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "shloka-line-card";
      card.innerHTML = '<span class="sa">' + line.sanskrit + '</span><span class="tr">' + line.transliteration + '</span><span class="en">' + line.meaning + "</span>";
      card.addEventListener("click", function (event) {
        event.stopPropagation();
        if (!runtime.video) return;
        runtime.video.currentTime = getFirstCueTime(shloka, index);
        runtime.video.play().catch(function () {});
        runtime.subtitleLine.textContent = line.sanskrit;
        runtime.subtitleTranslit.textContent = line.transliteration;
        runtime.subtitleMeaning.textContent = line.meaning;
        ui.status.textContent = "Line replay started. Repeat this line with Mithu.";
        setMascotSpeech("Great focus! Repeat this line with me.");
        markLinePracticed(shloka, index);
        highlightLine(index);
      });
      lineCards.appendChild(card);
      runtime.lineCards.push(card);
    });
  }

  function updateShlokaCardBadges() {
    SHLOKA_LIBRARY.forEach(function (shloka) {
      const badge = document.querySelector('[data-shloka-badge="' + shloka.id + '"]');
      if (!badge) return;
      const progress = getShlokaProgressPercent(shloka);
      badge.textContent = progress === 100 ? "Complete 🌸" : progress + "%";
    });
  }

  function renderPlayer(shloka) {
    const holder = document.getElementById("shlokaPlayer");
    holder.innerHTML = [
      '<div class="shloka-player-head">',
      '  <h3>' + shloka.title + "</h3>",
      '  <p>' + shloka.description + "</p>",
      "</div>",
      '<div class="shloka-video-wrap">',
      '  <video id="shlokaVideo" class="shloka-video" playsinline controls preload="metadata"></video>',
      '  <div class="shloka-subtitle">',
      '    <p id="shlokaSubtitleLine" class="line"></p>',
      '    <p id="shlokaSubtitleTranslit" class="translit"></p>',
      '    <p id="shlokaSubtitleMeaning" class="meaning"></p>',
      "  </div>",
      "</div>",
      '<div class="shloka-scenes" id="shlokaScenes"></div>',
      '<div class="shloka-actions">',
      '  <button type="button" class="button primary" id="startShlokaJourneyBtn">▶ Watch and Learn</button>',
      '  <button type="button" class="button challenge" id="reciteWithMithuBtn">🎤 Recite with Mithu</button>',
      '  <button type="button" class="button secondary" id="completeShlokaBtn">🌸 Mark Practice Complete</button>',
      "</div>",
      '<p class="footer-note recite-privacy-note">Chant-along mode only: no microphone, no voice recording, no automatic scoring.</p>',
      '<div class="shloka-lines" id="shlokaLineCards"></div>'
    ].join("");

    runtime.subtitleLine = document.getElementById("shlokaSubtitleLine");
    runtime.subtitleTranslit = document.getElementById("shlokaSubtitleTranslit");
    runtime.subtitleMeaning = document.getElementById("shlokaSubtitleMeaning");
    runtime.reciteBtn = document.getElementById("reciteWithMithuBtn");
    runtime.currentCueIndex = -1;

    renderSceneStrip(shloka);
    renderLineCards(shloka);

    const video = document.getElementById("shlokaVideo");
    runtime.video = video;
    video.src = resolvePath(shloka.learningVideo);
    runtime.subtitleLine.textContent = shloka.lines[0].sanskrit;
    runtime.subtitleTranslit.textContent = shloka.lines[0].transliteration;
    runtime.subtitleMeaning.textContent = shloka.lines[0].meaning;

    video.addEventListener("timeupdate", function () {
      setSubtitle(video.currentTime, shloka);
      highlightScene(video.currentTime, shloka);
    });

    video.addEventListener("ended", function () {
      ui.status.textContent = "Lovely chanting! Tap 🎤 Recite with Mithu to replay and chant together again.";
      setMascotSpeech("Amazing! Replay and chant with me anytime.");
    });

    document.getElementById("startShlokaJourneyBtn").addEventListener("click", function (event) {
      event.stopPropagation();
      startVideo(shloka, false);
    }, true);

    runtime.reciteBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      startVideo(shloka, true);
      runtime.reciteBtn.textContent = "🔁 Recite with Mithu Again";
    }, true);

    document.getElementById("completeShlokaBtn").addEventListener("click", function (event) {
      event.stopPropagation();
      completePractice(shloka);
    }, true);
  }

  function selectShloka(id, autostartRecite) {
    runtime.activeShlokaId = id;
    document.querySelectorAll("[data-shloka-card]").forEach(function (node) {
      node.classList.toggle("is-active", node.getAttribute("data-shloka-card") === id);
    });
    const shloka = getShlokaById(id);
    renderPlayer(shloka);
    renderProgress();
    if (autostartRecite) startVideo(shloka, true);
  }

  function renderCards() {
    const cardsHost = document.getElementById("shlokaCards");
    cardsHost.innerHTML = "";
    SHLOKA_LIBRARY.forEach(function (entry) {
      const progress = getShlokaProgressPercent(entry);
      const card = document.createElement("article");
      card.className = "shloka-card";
      card.setAttribute("data-shloka-card", entry.id);
      card.innerHTML = [
        '<img class="shloka-card-thumb" src="' + resolvePath(entry.thumbnail) + '" alt="' + entry.title + ' thumbnail">',
        '<div class="shloka-card-content">',
        '  <div class="shloka-card-head">',
        "    <h3>" + entry.title + "</h3>",
        '    <span class="shloka-card-progress" data-shloka-badge="' + entry.id + '">' + (progress === 100 ? "Complete 🌸" : progress + "%") + "</span>",
        "  </div>",
        "  <p>" + entry.description + "</p>",
        '  <div class="shloka-card-actions">',
        '    <button class="button secondary" type="button" data-watch="' + entry.id + '">▶ Watch and Learn</button>',
        '    <button class="button challenge" type="button" data-recite="' + entry.id + '">🎤 Recite with Mithu</button>',
        "  </div>",
        "</div>"
      ].join("");
      cardsHost.appendChild(card);
    });

    cardsHost.querySelectorAll("[data-watch]").forEach(function (btnRef) {
      btnRef.addEventListener("click", function (event) {
        event.stopPropagation();
        selectShloka(btnRef.getAttribute("data-watch"), false);
        startVideo(getShlokaById(btnRef.getAttribute("data-watch")), false);
      });
    });
    cardsHost.querySelectorAll("[data-recite]").forEach(function (btnRef) {
      btnRef.addEventListener("click", function (event) {
        event.stopPropagation();
        selectShloka(btnRef.getAttribute("data-recite"), true);
      });
    });
  }

  function scrollIntoView() {
    const header = document.querySelector(".site-header");
    const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 82;
    panel.style.scrollMarginTop = headerHeight + 10 + "px";
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderGarden() {
    panel.classList.remove("wrong");
    ui.title.textContent = "Shloka Garden";
    ui.text.textContent = "A growing collection of Sanskrit shlokas and mantras for children.";
    ui.meta.textContent = "Watch, chant, replay, and track progress for each shloka.";
    if (ui.subtitle) ui.subtitle.textContent = "Watch and Learn or Recite with Mithu. Unlimited replay for every shloka.";
    if (ui.actionBtn) ui.actionBtn.style.display = "none";

    ui.choices.innerHTML = [
      '<div class="shloka-garden">',
      '  <div class="shloka-catalogue" id="shlokaCards"></div>',
      '  <div class="shloka-player-shell" id="shlokaPlayer"></div>',
      "</div>"
    ].join("");

    renderCards();
    selectShloka(runtime.activeShlokaId, false);
    ui.status.textContent = "Choose a shloka card to begin. Mithu will guide each line.";
    setMascotSpeech(WELCOME_MESSAGE);
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

  SHLOKA_LIBRARY.forEach(function (entry) { ensureShlokaState(entry.id); });
  saveState();
  renderGarden();
})();
