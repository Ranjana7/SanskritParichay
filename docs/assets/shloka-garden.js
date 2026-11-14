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

  function buildLoopCues(lineWindows, loopCount, recitationDuration) {
    const cues = [];
    for (let loop = 0; loop < loopCount; loop += 1) {
      const base = loop * recitationDuration;
      lineWindows.forEach(function (windowRef, index) {
        cues.push({
          start: base + (windowRef.start * recitationDuration),
          end: base + (windowRef.end * recitationDuration),
          lineIndex: index
        });
      });
    }
    return cues;
  }

  function buildSceneWindows(loopCount, recitationDuration) {
    const windows = [];
    for (let loop = 0; loop < loopCount; loop += 1) {
      const base = loop * recitationDuration;
      windows.push({ start: base + 0.00 * recitationDuration, end: base + 0.25 * recitationDuration, sceneIndex: 0 });
      windows.push({ start: base + 0.25 * recitationDuration, end: base + 0.50 * recitationDuration, sceneIndex: 1 });
      windows.push({ start: base + 0.50 * recitationDuration, end: base + 0.75 * recitationDuration, sceneIndex: 2 });
      windows.push({ start: base + 0.75 * recitationDuration, end: base + 1.00 * recitationDuration, sceneIndex: 3 });
    }
    return windows;
  }

  const SHLOKA_LIBRARY = [
    {
      id: "sahana-vavatu",
      title: "Sah Nāvavatu",
      description: "A calm study prayer to chant together.",
      learningVideo: "../assets/media/shlokas/sah_navavatu_web.mp4?v=20261114u12",
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
      recitationDuration: 28.65,
      lineWindows: [
        { start: 0.00, end: 0.2164 },
        { start: 0.2164, end: 0.4258 },
        { start: 0.4258, end: 0.6352 },
        { start: 0.6352, end: 0.8803 },
        { start: 0.8803, end: 1.0 }
      ]
    },
    {
      id: "namo-devyai-mahadevyai",
      title: "Namo Devyai Mahādevyai",
      description: "A gentle Devi chant with devotion.",
      learningVideo: "../assets/media/shlokas/namo_devyai_web.mp4?v=20261114u12",
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
      recitationDuration: 19.24,
      lineWindows: [
        { start: 0.00, end: 0.5457 },
        { start: 0.5457, end: 1.00 }
      ]
    },
    {
      id: "coming-soon",
      title: "More Shlokas Coming Soon!",
      description: "More beautiful mantras are blooming soon.",
      thumbnail: "../assets/illustrations/shloka/sahana-scene-2.png",
      comingSoon: true
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
    replayBtn: null,
    closeBtn: null,
    currentCues: [],
    currentSceneWindows: [],
    loopCount: 3
  };

  function resolvePath(path) {
    if (typeof window.spResolveAssetPath === "function") return window.spResolveAssetPath(path);
    return path;
  }

  function getShlokaById(id) {
    return SHLOKA_LIBRARY.find(function (entry) { return entry.id === id; }) || SHLOKA_LIBRARY[0];
  }

  function ensureShlokaState(id) {
    if (id === "coming-soon") return { watched: false, recited: false, practicedLines: {}, completed: false };
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
    if (shloka.comingSoon) return 0;
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
    const playable = SHLOKA_LIBRARY.filter(function (entry) { return !entry.comingSoon; });
    const total = playable.reduce(function (sum, shloka) {
      return sum + getShlokaProgressPercent(shloka);
    }, 0);
    return Math.round(total / Math.max(1, playable.length));
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
    const windows = runtime.currentSceneWindows.length ? runtime.currentSceneWindows : buildSceneWindows(runtime.loopCount, shloka.recitationDuration);
    const match = windows.find(function (windowRef) {
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
    const cues = runtime.currentCues.length ? runtime.currentCues : buildLoopCues(shloka.lineWindows, runtime.loopCount, shloka.recitationDuration);
    const cueIndex = cues.findIndex(function (cue) {
      return timeSec >= cue.start && timeSec < cue.end;
    });
    if (cueIndex === -1 || cueIndex === runtime.currentCueIndex) return;
    runtime.currentCueIndex = cueIndex;
    const cue = cues[cueIndex];
    const line = shloka.lines[cue.lineIndex];
    runtime.subtitleLine.textContent = line.sanskrit;
    runtime.subtitleTranslit.textContent = line.transliteration;
    runtime.subtitleMeaning.textContent = line.meaning;
    highlightLine(cue.lineIndex);
    highlightScene(timeSec, shloka);
    markLinePracticed(shloka, cue.lineIndex);
  }

  function getFirstCueTime(shloka, lineIndex) {
    const cues = runtime.currentCues.length ? runtime.currentCues : buildLoopCues(shloka.lineWindows, runtime.loopCount, shloka.recitationDuration);
    const cue = cues.find(function (entry) { return entry.lineIndex === lineIndex; });
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

  function startVideo(shloka) {
    if (!runtime.video) return;
    runtime.currentCueIndex = -1;
    runtime.video.currentTime = 0;
    runtime.video.play().catch(function () {});

    const progress = ensureShlokaState(shloka.id);
    progress.watched = true;
    progress.recited = true;
    ui.status.textContent = "Chant-along started. Follow the highlighted lines with Mithu.";
    setMascotSpeech("Beautiful! Chant with me line by line.");
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
      if (shloka.comingSoon) {
        badge.textContent = "Soon";
        return;
      }
      const progress = getShlokaProgressPercent(shloka);
      badge.textContent = progress === 100 ? "Complete 🌸" : "Ready";
    });
  }

  function renderPlayer(shloka) {
    if (shloka.comingSoon) return;
    const holder = document.getElementById("shlokaPlayer");
    holder.classList.remove("is-hidden");
    holder.innerHTML = [
      '<div class="shloka-player-head">',
      '  <h3>' + shloka.title + "</h3>",
      '  <p>' + shloka.description + "</p>",
      '  <p id="shlokaMithuNote" class="footer-note">Mithu says: Chant with joy and confidence! 🦜</p>',
      "</div>",
      '<div class="shloka-video-wrap">',
      '  <video id="shlokaVideo" class="shloka-video" playsinline controls preload="metadata"></video>',
      '  <div class="shloka-subtitle">',
      '    <p id="shlokaSubtitleLine" class="line"></p>',
      '    <p id="shlokaSubtitleTranslit" class="translit"></p>',
      '    <p id="shlokaSubtitleMeaning" class="meaning"></p>',
      "  </div>",
      "</div>",
      '<div class="shloka-actions">',
      '  <button type="button" class="button challenge" id="chantAgainBtn">🔄 Chant Again</button>',
      '  <button type="button" class="button ghost" id="closeShlokaPlayerBtn">✖ Close</button>',
      "</div>",
      '<p class="footer-note recite-privacy-note">Chant-along mode only: no microphone, no voice recording.</p>'
    ].join("");

    runtime.subtitleLine = document.getElementById("shlokaSubtitleLine");
    runtime.subtitleTranslit = document.getElementById("shlokaSubtitleTranslit");
    runtime.subtitleMeaning = document.getElementById("shlokaSubtitleMeaning");
    runtime.replayBtn = document.getElementById("chantAgainBtn");
    runtime.closeBtn = document.getElementById("closeShlokaPlayerBtn");
    runtime.currentCueIndex = -1;

    const video = document.getElementById("shlokaVideo");
    runtime.video = video;
    video.src = resolvePath(shloka.learningVideo);
    runtime.subtitleLine.textContent = shloka.lines[0].sanskrit;
    runtime.subtitleTranslit.textContent = shloka.lines[0].transliteration;
    runtime.subtitleMeaning.textContent = shloka.lines[0].meaning;
    runtime.currentCues = [];
    runtime.currentSceneWindows = [];

    video.addEventListener("loadedmetadata", function () {
      const duration = Number(video.duration) || (shloka.recitationDuration * runtime.loopCount);
      const loopCount = Math.max(1, Math.round(duration / shloka.recitationDuration));
      const recitationDuration = duration / loopCount;
      runtime.loopCount = loopCount;
      runtime.currentCues = buildLoopCues(shloka.lineWindows, loopCount, recitationDuration);
      runtime.currentSceneWindows = buildSceneWindows(loopCount, recitationDuration);
    });

    video.addEventListener("timeupdate", function () {
      setSubtitle(video.currentTime, shloka);
      highlightScene(video.currentTime, shloka);
    });

    video.addEventListener("ended", function () {
      const progress = ensureShlokaState(shloka.id);
      progress.completed = true;
      saveState();
      renderProgress();
      updateShlokaCardBadges();
      ui.status.textContent = "🎉 Wonderful chanting! Tap 🔄 Chant Again for another joyful round.";
      setMascotSpeech("Amazing! Your voice is glowing brighter every time.");
      const mithuNote = document.getElementById("shlokaMithuNote");
      if (mithuNote) mithuNote.textContent = "Mithu says: Superb chanting! 🌸 Try one more joyful round.";
      launchCelebration();
    });

    runtime.replayBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      startVideo(shloka);
    }, true);

    runtime.closeBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      if (runtime.video) runtime.video.pause();
      holder.classList.add("is-hidden");
      ui.status.textContent = "Choose a shloka card to begin the next chant.";
      setMascotSpeech(WELCOME_MESSAGE);
    }, true);
  }

  function selectShloka(id) {
    runtime.activeShlokaId = id;
    document.querySelectorAll("[data-shloka-card]").forEach(function (node) {
      node.classList.toggle("is-active", node.getAttribute("data-shloka-card") === id);
    });
    const shloka = getShlokaById(id);
    if (shloka.comingSoon) {
      const player = document.getElementById("shlokaPlayer");
      if (player) player.classList.add("is-hidden");
      ui.status.textContent = "✨ More beautiful shlokas are coming soon!";
      setMascotSpeech(WELCOME_MESSAGE);
      return;
    }
    renderPlayer(shloka);
    renderProgress();
    startVideo(shloka);
    const player = document.getElementById("shlokaPlayer");
    if (player) player.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
        '    <span class="shloka-card-progress" data-shloka-badge="' + entry.id + '">' + (entry.comingSoon ? "Soon" : (progress === 100 ? "Complete 🌸" : "Ready")) + "</span>",
        "  </div>",
        "  <p>" + entry.description + "</p>",
        '  <div class="shloka-card-actions">',
        (entry.comingSoon
          ? ""
          : '    <button class="button challenge" type="button" data-chant="' + entry.id + '">🎵 Let\'s Chant with Mithu!</button>'),
        "  </div>",
        "</div>"
      ].join("");
      cardsHost.appendChild(card);
    });

    cardsHost.querySelectorAll("[data-chant]").forEach(function (btnRef) {
      btnRef.addEventListener("click", function (event) {
        event.stopPropagation();
        selectShloka(btnRef.getAttribute("data-chant"));
      });
    });
    cardsHost.querySelectorAll("[data-shloka-card]").forEach(function (cardRef) {
      cardRef.addEventListener("click", function () {
        selectShloka(cardRef.getAttribute("data-shloka-card"));
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
    ui.text.textContent = "A magical mini-library of Sanskrit shlokas and mantras.";
    ui.meta.textContent = "Choose one shloka, chant with Mithu, celebrate, and chant again.";
    if (ui.subtitle) ui.subtitle.textContent = "Compact cards, one shared player, and joyful unlimited replay.";
    const progressBar = ui.progressFill ? ui.progressFill.parentElement : null;
    if (progressBar) progressBar.style.display = "none";
    if (ui.progressText) ui.progressText.style.display = "none";
    if (ui.meta) ui.meta.style.display = "none";
    if (ui.actionBtn) ui.actionBtn.style.display = "none";

    ui.choices.innerHTML = [
      '<div class="shloka-garden">',
      '  <div class="shloka-catalogue" id="shlokaCards"></div>',
      '  <div class="shloka-player-shell is-hidden" id="shlokaPlayer"></div>',
      "</div>"
    ].join("");

    renderCards();
    ui.status.textContent = "Choose a shloka, chant with Mithu, celebrate, and chant again.";
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
