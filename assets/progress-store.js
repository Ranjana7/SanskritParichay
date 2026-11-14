(function initProgressStore(globalScope) {
  const STORAGE_PREFIX = globalScope.SP_STORAGE_PREFIX || "sanskritParichay";
  function storageKey(suffix) {
    return STORAGE_PREFIX + "." + suffix;
  }
  const FOREST_V3_KEY = storageKey("alphabetForest.v3");
  const FOREST_LEGACY_KEY = storageKey("alphabetForest.progress");
  const FOREST_LEGACY_V1_KEY = storageKey("alphabetForest.progression.v1");
  const FOREST_LEGACY_TREE_KEY = storageKey("alphabetForest.tree.progress");
  const FOREST_LEGACY_GARDEN_KEY = storageKey("alphabetForest.garden.learned");
  const HOME_KEY = storageKey("home.progress");
  const LAST_WORLD_KEY = storageKey("lastWorld");
  const CHALLENGE_KEY = storageKey("dailyChallenge.progress");
  const WORLD_UNLOCKS_KEY = storageKey("world.unlocks.v1");
  const LETTER_COUNT = 48;
  const UNLOCK_STAR_TARGET = 50;
  const UNLOCK_GEM_TARGET = 1;
  const CHALLENGE_GEMS_PER_DAY = 2;
  const FOREST_ACTIVITY_IDS = [
    "magical-tree",
    "letter-garden",
    "hear-and-pick",
    "picture-match",
    "arrange-word",
    "flashcard-flip",
    "feed-mithu",
    "letter-tracing",
    "hidden-letter-hunt"
  ];
  const FOREST_LEARNING_IDS = ["magical-tree", "letter-garden"];
  const FOREST_PRACTICE_IDS = FOREST_ACTIVITY_IDS.filter(function (id) { return !FOREST_LEARNING_IDS.includes(id); });
  const WORLD_ACTIVITY_IDS = ["match", "listen", "build"];
  const DEFAULT_WORLD_ORDER = ["alphabet", "animals", "numbers", "colours", "words", "sentences", "stories", "culture"];
  const LEGACY_DONE_MAP = {
    hear: "hear-and-pick",
    picture: "picture-match",
    arrange: "arrange-word",
    flash: "flashcard-flip",
    feed: "feed-mithu",
    trace: "letter-tracing",
    hunt: "hidden-letter-hunt"
  };

  if (typeof globalScope.spApplyDeploymentTestReset === "function") {
    globalScope.spApplyDeploymentTestReset();
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function clampIndex(value, max) {
    if (!Number.isFinite(value)) return 0;
    const floored = Math.floor(value);
    if (floored < 0) return 0;
    if (floored > max) return max;
    return floored;
  }

  function normalizeIndexList(values, max) {
    if (!Array.isArray(values)) return [];
    const unique = [];
    values.forEach(function (value) {
      if (!Number.isFinite(value)) return;
      const normalized = clampIndex(value, max);
      if (!unique.includes(normalized)) unique.push(normalized);
    });
    unique.sort(function (a, b) { return a - b; });
    return unique;
  }

  function createActivityState() {
    return {
      currentIndex: 0,
      completedItems: [],
      rewardedItems: [],
      answers: {},
      attempts: {},
      order: Array.from({ length: LETTER_COUNT }, function (_, index) { return index; }),
      isComplete: false
    };
  }

  function createForestState() {
    const activities = {};
    FOREST_ACTIVITY_IDS.forEach(function (id) {
      activities[id] = createActivityState();
    });
    return {
      schemaVersion: 3,
      activities: activities,
      completionRewarded: {},
      worldCompleted: false,
      xp: 0,
      gems: 0
    };
  }

  function getForestCurrentRewards(forestState) {
    const state = sanitizeForestState(forestState || loadForestState());
    const lifetimeStars = Math.max(0, Math.floor(Number(state.xp || 0)));
    const fallbackGems = FOREST_ACTIVITY_IDS.reduce(function (count, id) {
      return count + (state.completionRewarded && (state.completionRewarded["gem:" + id] || state.completionRewarded[id]) ? 1 : 0);
    }, 0);
    const lifetimeGems = Math.max(fallbackGems, Math.max(0, Math.floor(Number(state.gems || 0))));
    return {
      currentStars: lifetimeStars,
      currentGems: lifetimeGems,
      lifetimeStars: lifetimeStars,
      lifetimeGems: lifetimeGems
    };
  }

  function sanitizeForestState(input) {
    const state = createForestState();
    if (!input || typeof input !== "object") return state;
    const activities = input.activities && typeof input.activities === "object" ? input.activities : {};
    FOREST_ACTIVITY_IDS.forEach(function (id) {
      const source = activities[id] || {};
      const target = state.activities[id];
      target.currentIndex = clampIndex(source.currentIndex, LETTER_COUNT - 1);
      target.completedItems = normalizeIndexList(source.completedItems, LETTER_COUNT - 1);
      target.rewardedItems = normalizeIndexList(source.rewardedItems || source.completedItems, LETTER_COUNT - 1);
      target.answers = source.answers && typeof source.answers === "object" ? source.answers : {};
      target.attempts = source.attempts && typeof source.attempts === "object" ? source.attempts : {};
      target.order = Array.isArray(source.order) && source.order.length === LETTER_COUNT
        ? normalizeIndexList(source.order, LETTER_COUNT - 1)
        : target.order.slice();
      if (target.order.length !== LETTER_COUNT) {
        target.order = Array.from({ length: LETTER_COUNT }, function (_, index) { return index; });
      }
      target.isComplete = Boolean(source.isComplete) || target.completedItems.length >= LETTER_COUNT;
    });
    state.completionRewarded = input.completionRewarded && typeof input.completionRewarded === "object"
      ? input.completionRewarded
      : {};
    state.worldCompleted = Boolean(input.worldCompleted);
    state.xp = Number.isFinite(input.xp) ? Math.max(0, Math.floor(input.xp)) : 0;
    const fallbackGems = FOREST_ACTIVITY_IDS.reduce(function (count, id) {
      return count + (state.completionRewarded && (state.completionRewarded["gem:" + id] || state.completionRewarded[id]) ? 1 : 0);
    }, 0);
    state.gems = Number.isFinite(input.gems)
      ? Math.max(0, Math.floor(input.gems))
      : fallbackGems;
    return state;
  }

  function migrateSingleLegacyForestState(legacy) {
    if (!legacy || typeof legacy !== "object") return null;
    const migrated = createForestState();
    if (Array.isArray(legacy)) {
      migrated.activities["letter-garden"].completedItems = normalizeIndexList(legacy, LETTER_COUNT - 1);
      migrated.activities["letter-garden"].isComplete = migrated.activities["letter-garden"].completedItems.length >= LETTER_COUNT;
      return sanitizeForestState(migrated);
    }
    if (legacy.state && legacy.state.activities) {
      Object.keys(legacy.state.activities).forEach(function (legacyId) {
        const mapped = legacyId === "listen-identify"
          ? "hear-and-pick"
          : legacyId === "letter-matching"
            ? "picture-match"
            : legacyId === "letter-hunt"
              ? "hidden-letter-hunt"
              : legacyId;
        if (!migrated.activities[mapped]) return;
        const source = legacy.state.activities[legacyId] || {};
        migrated.activities[mapped].currentIndex = clampIndex(source.currentLetterIndex, LETTER_COUNT - 1);
        migrated.activities[mapped].completedItems = normalizeIndexList(source.completedLetters, LETTER_COUNT - 1);
        migrated.activities[mapped].isComplete = Boolean(source.isCompleted) || migrated.activities[mapped].completedItems.length >= LETTER_COUNT;
      });
    }
    if (legacy.done && typeof legacy.done === "object") {
      Object.keys(legacy.done).forEach(function (flag) {
        if (!legacy.done[flag]) return;
        const mapped = LEGACY_DONE_MAP[flag];
        if (!mapped || !migrated.activities[mapped]) return;
        migrated.activities[mapped].isComplete = true;
      });
    }
    migrated.xp = Number.isFinite(legacy.stars) ? Math.max(0, Math.floor(legacy.stars)) : 0;
    return sanitizeForestState(migrated);
  }

  function mergeForestStates(baseState, incomingState) {
    const base = sanitizeForestState(baseState);
    const incoming = sanitizeForestState(incomingState);
    const merged = createForestState();
    FOREST_ACTIVITY_IDS.forEach(function (id) {
      const mergedCompleted = normalizeIndexList(
        (base.activities[id].completedItems || []).concat(incoming.activities[id].completedItems || []),
        LETTER_COUNT - 1
      );
      const mergedRewarded = normalizeIndexList(
        (base.activities[id].rewardedItems || []).concat(incoming.activities[id].rewardedItems || []),
        LETTER_COUNT - 1
      );
      merged.activities[id].currentIndex = clampIndex(Math.max(base.activities[id].currentIndex || 0, incoming.activities[id].currentIndex || 0), LETTER_COUNT - 1);
      merged.activities[id].completedItems = mergedCompleted;
      merged.activities[id].rewardedItems = mergedRewarded;
      merged.activities[id].answers = Object.assign({}, base.activities[id].answers || {}, incoming.activities[id].answers || {});
      merged.activities[id].attempts = Object.assign({}, base.activities[id].attempts || {}, incoming.activities[id].attempts || {});
      merged.activities[id].order = Array.isArray(base.activities[id].order) && base.activities[id].order.length === LETTER_COUNT
        ? base.activities[id].order.slice()
        : incoming.activities[id].order.slice();
      merged.activities[id].isComplete = Boolean(base.activities[id].isComplete || incoming.activities[id].isComplete || mergedCompleted.length >= LETTER_COUNT);
    });
    merged.completionRewarded = Object.assign({}, base.completionRewarded || {}, incoming.completionRewarded || {});
    merged.worldCompleted = Boolean(base.worldCompleted || incoming.worldCompleted);
    merged.xp = Math.max(Number(base.xp || 0), Number(incoming.xp || 0));
    return sanitizeForestState(merged);
  }

  function migrateLegacyForestState() {
    const legacyKeys = [
      FOREST_LEGACY_KEY,
      FOREST_LEGACY_V1_KEY,
      FOREST_LEGACY_TREE_KEY,
      FOREST_LEGACY_GARDEN_KEY
    ];
    let merged = null;
    legacyKeys.forEach(function (key) {
      const legacy = readJson(key, null);
      const migrated = migrateSingleLegacyForestState(legacy);
      if (!migrated) return;
      merged = merged ? mergeForestStates(merged, migrated) : migrated;
    });
    if (!merged) return null;
    return sanitizeForestState(merged);
  }

  function loadForestState() {
    const current = readJson(FOREST_V3_KEY, null);
    if (current && typeof current === "object" && current.activities) {
      return sanitizeForestState(current);
    }
    const migrated = migrateLegacyForestState();
    if (migrated) {
      const safeMigrated = sanitizeForestState(migrated);
      writeJson(FOREST_V3_KEY, safeMigrated);
      return safeMigrated;
    }
    return createForestState();
  }

  function getAlphabetJourney(forestState) {
    const state = forestState || loadForestState();
    const activities = state.activities || {};
    const learningCompleted = FOREST_LEARNING_IDS.reduce(function (count, id) {
      return count + (activities[id] && activities[id].isComplete ? 1 : 0);
    }, 0);
    const practiceCompleted = FOREST_PRACTICE_IDS.reduce(function (count, id) {
      return count + (activities[id] && activities[id].isComplete ? 1 : 0);
    }, 0);
    const rewards = getForestCurrentRewards(state);
    const unlockedByRule = rewards.currentStars >= UNLOCK_STAR_TARGET && rewards.currentGems >= UNLOCK_GEM_TARGET;
    return {
      treeComplete: Boolean(activities["magical-tree"] && activities["magical-tree"].isComplete),
      learningCompletedCount: learningCompleted,
      practiceCompletedCount: practiceCompleted,
      unlockedByRule: unlockedByRule,
      unlocked: unlockedByRule,
      unlockedEarned: false,
      stars: rewards.lifetimeStars,
      currentStars: rewards.currentStars,
      currentGems: rewards.currentGems,
      lifetimeGems: rewards.lifetimeGems,
      activities: FOREST_ACTIVITY_IDS.map(function (id) {
        const activity = activities[id] || createActivityState();
        return {
          id: id,
          currentIndex: clampIndex(activity.currentIndex, LETTER_COUNT - 1),
          completedCount: normalizeIndexList(activity.completedItems, LETTER_COUNT - 1).length,
          totalCount: LETTER_COUNT,
          isComplete: Boolean(activity.isComplete)
        };
      })
    };
  }

  function loadWorldProgress(worldKey, totalLessons) {
    const fallback = {
      lessonIndex: 0,
      stars: 0,
      gems: 0,
      completedLessons: [],
      done: { match: false, listen: false, build: false },
      practiceCompleted: { match: false, listen: false, build: false },
      completedActivities: {},
      rewardedActivities: {},
      rewardedGroupBonuses: {},
      rewardedActivityGems: {}
    };
    const raw = readJson(storageKey("world." + worldKey + ".progress"), fallback) || fallback;
    const completedLessons = Array.isArray(raw.completedLessons)
      ? raw.completedLessons.filter(function (value, index, arr) {
          return Number.isInteger(value) && value >= 0 && value < totalLessons && arr.indexOf(value) === index;
        })
      : [];
    const lessonIndex = clampIndex(Number(raw.lessonIndex || 0), Math.max(0, totalLessons - 1));
    const stars = Number.isFinite(raw.stars) ? Math.max(0, Math.floor(raw.stars)) : 0;
    const gems = Number.isFinite(raw.gems) ? Math.max(0, Math.floor(raw.gems)) : 0;
    const done = raw.done && typeof raw.done === "object" ? raw.done : {};
    const persistedPractice = raw.practiceCompleted && typeof raw.practiceCompleted === "object" ? raw.practiceCompleted : {};
    const completedActivities = raw.completedActivities && typeof raw.completedActivities === "object" ? raw.completedActivities : {};
    const rewardedActivities = raw.rewardedActivities && typeof raw.rewardedActivities === "object" ? raw.rewardedActivities : {};
    const rewardedGroupBonuses = raw.rewardedGroupBonuses && typeof raw.rewardedGroupBonuses === "object" ? raw.rewardedGroupBonuses : {};
    const rewardedActivityGems = raw.rewardedActivityGems && typeof raw.rewardedActivityGems === "object" ? raw.rewardedActivityGems : {};
    const practiceCompleted = {};
    WORLD_ACTIVITY_IDS.forEach(function (id) {
      practiceCompleted[id] = Boolean((persistedPractice && persistedPractice[id]) || (done && done[id]));
    });
    Object.keys(done || {}).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(practiceCompleted, id)) return;
      practiceCompleted[id] = Boolean(done[id]);
    });
    Object.keys(persistedPractice || {}).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(practiceCompleted, id)) return;
      practiceCompleted[id] = Boolean(persistedPractice[id]);
    });
    const practiceCompletedCount = Object.keys(practiceCompleted).reduce(function (count, id) {
      return count + (practiceCompleted[id] ? 1 : 0);
    }, 0);
    const currentGems = gems;
    const currentStars = stars;
    return {
      lessonIndex: lessonIndex,
      stars: stars,
      gems: gems,
      completedLessons: completedLessons,
      completedLessonsCount: completedLessons.length,
      totalLessons: totalLessons,
      isComplete: completedLessons.length >= totalLessons,
      practiceCompleted: practiceCompleted,
      practiceCompletedCount: practiceCompletedCount,
      completedActivities: completedActivities,
      rewardedActivities: rewardedActivities,
      rewardedGroupBonuses: rewardedGroupBonuses,
      rewardedActivityGems: rewardedActivityGems,
      currentStars: currentStars,
      currentGems: currentGems,
      unlockEligible: currentStars >= UNLOCK_STAR_TARGET && currentGems >= UNLOCK_GEM_TARGET
    };
  }

  function normalizeWorldOrder(worldOrder) {
    if (Array.isArray(worldOrder) && worldOrder.length) return worldOrder.slice();
    return DEFAULT_WORLD_ORDER.slice();
  }

  function loadUnlockState(worldOrder) {
    const order = normalizeWorldOrder(worldOrder);
    const rawValue = readJson(WORLD_UNLOCKS_KEY, null);
    const raw = rawValue && typeof rawValue === "object" ? rawValue : {};
    const unlocked = Array.isArray(raw.unlocked) ? raw.unlocked.slice() : [];
    const clean = unlocked.filter(function (key, index, arr) {
      return order.includes(key) && arr.indexOf(key) === index;
    });
    if (!clean.includes("alphabet")) clean.unshift("alphabet");
    const spentUnlocksRaw = raw.spentUnlocks && typeof raw.spentUnlocks === "object" ? raw.spentUnlocks : {};
    const spentUnlocks = {};
    Object.keys(spentUnlocksRaw).forEach(function (key) {
      if (!order.includes(key) || key === "alphabet") return;
      if (!spentUnlocksRaw[key]) return;
      spentUnlocks[key] = true;
    });
    const spentCount = Object.keys(spentUnlocks).length;
    const spentStars = Number.isFinite(Number(raw.spentStars))
      ? Math.max(0, Math.floor(Number(raw.spentStars)))
      : spentCount * UNLOCK_STAR_TARGET;
    const spentGems = Number.isFinite(Number(raw.spentGems))
      ? Math.max(0, Math.floor(Number(raw.spentGems)))
      : spentCount * UNLOCK_GEM_TARGET;
    const lastUnlockLifetimeStars = Number.isFinite(Number(raw.lastUnlockLifetimeStars))
      ? Math.max(0, Math.floor(Number(raw.lastUnlockLifetimeStars)))
      : 0;
    const lastUnlockLifetimeGems = Number.isFinite(Number(raw.lastUnlockLifetimeGems))
      ? Math.max(0, Math.floor(Number(raw.lastUnlockLifetimeGems)))
      : 0;
    const lastUnlockNonce = Number.isFinite(Number(raw.lastUnlockNonce))
      ? Math.max(0, Math.floor(Number(raw.lastUnlockNonce)))
      : 0;
    const lastUnlockedWorld = typeof raw.lastUnlockedWorld === "string" ? raw.lastUnlockedWorld : "";
    const lastUnlockedAt = Number.isFinite(Number(raw.lastUnlockedAt))
      ? Math.max(0, Math.floor(Number(raw.lastUnlockedAt)))
      : 0;
    return {
      unlocked: clean,
      spentUnlocks: spentUnlocks,
      spentStars: spentStars,
      spentGems: spentGems,
      lastUnlockLifetimeStars: lastUnlockLifetimeStars,
      lastUnlockLifetimeGems: lastUnlockLifetimeGems,
      lastUnlockNonce: lastUnlockNonce,
      lastUnlockedWorld: lastUnlockedWorld,
      lastUnlockedAt: lastUnlockedAt
    };
  }

  function saveUnlockState(state, worldOrder) {
    const order = normalizeWorldOrder(worldOrder);
    const unlocked = Array.isArray(state && state.unlocked) ? state.unlocked : [];
    const clean = unlocked.filter(function (key, index, arr) {
      return order.includes(key) && arr.indexOf(key) === index;
    });
    if (!clean.includes("alphabet")) clean.unshift("alphabet");
    const spentUnlocksRaw = state && state.spentUnlocks && typeof state.spentUnlocks === "object" ? state.spentUnlocks : {};
    const spentUnlocks = {};
    Object.keys(spentUnlocksRaw).forEach(function (key) {
      if (!order.includes(key) || key === "alphabet") return;
      if (!spentUnlocksRaw[key]) return;
      spentUnlocks[key] = true;
    });
    const spentCount = Object.keys(spentUnlocks).length;
    const spentStars = Number.isFinite(Number(state && state.spentStars))
      ? Math.max(0, Math.floor(Number(state.spentStars)))
      : spentCount * UNLOCK_STAR_TARGET;
    const spentGems = Number.isFinite(Number(state && state.spentGems))
      ? Math.max(0, Math.floor(Number(state.spentGems)))
      : spentCount * UNLOCK_GEM_TARGET;
    writeJson(WORLD_UNLOCKS_KEY, {
      unlocked: clean,
      spentUnlocks: spentUnlocks,
      spentStars: spentStars,
      spentGems: spentGems,
      lastUnlockLifetimeStars: Number.isFinite(Number(state && state.lastUnlockLifetimeStars))
        ? Math.max(0, Math.floor(Number(state.lastUnlockLifetimeStars)))
        : 0,
      lastUnlockLifetimeGems: Number.isFinite(Number(state && state.lastUnlockLifetimeGems))
        ? Math.max(0, Math.floor(Number(state.lastUnlockLifetimeGems)))
        : 0,
      lastUnlockNonce: Number.isFinite(Number(state && state.lastUnlockNonce))
        ? Math.max(0, Math.floor(Number(state.lastUnlockNonce)))
        : 0,
      lastUnlockedWorld: typeof (state && state.lastUnlockedWorld) === "string" ? state.lastUnlockedWorld : "",
      lastUnlockedAt: Number.isFinite(Number(state && state.lastUnlockedAt))
        ? Math.max(0, Math.floor(Number(state.lastUnlockedAt)))
        : 0
    });
    return clean;
  }

  function computeRewardLedger(worldOrder, totalsByWorld) {
    const order = normalizeWorldOrder(worldOrder);
    const totals = totalsByWorld && typeof totalsByWorld === "object" ? totalsByWorld : {};
    const forest = loadForestState();
    const alphabet = getAlphabetJourney(forest);
    let worldStars = 0;
    let worldGems = 0;
    order.forEach(function (worldKey) {
      if (worldKey === "alphabet") return;
      const totalLessons = Number(totals[worldKey] || 3);
      const progress = loadWorldProgress(worldKey, totalLessons);
      worldStars += progress.stars;
      worldGems += progress.gems;
    });
    const home = getHomeRewardState();
    const challengeGems = Number(home.challengeGems || 0);
    const lifetimeStars = Math.max(0, Math.floor(Number(alphabet.stars || 0) + Number(worldStars || 0)));
    const lifetimeGems = Math.max(0, Math.floor(Number(alphabet.lifetimeGems || 0) + Number(worldGems || 0) + challengeGems));
    const unlockState = loadUnlockState(order);
    const spentStars = Math.max(0, Math.floor(Number(unlockState.spentStars || 0)));
    const spentGems = Math.max(0, Math.floor(Number(unlockState.spentGems || 0)));
    const availableStars = Math.max(0, lifetimeStars - spentStars);
    const availableGems = Math.max(0, lifetimeGems - spentGems);
    return {
      lifetimeStars: lifetimeStars,
      lifetimeGems: lifetimeGems,
      spentStars: spentStars,
      spentGems: spentGems,
      availableStars: availableStars,
      availableGems: availableGems,
      challengeGems: challengeGems
    };
  }

  function syncSequentialUnlocks(worldOrder, totalsByWorld) {
    const order = normalizeWorldOrder(worldOrder);
    const unlockState = loadUnlockState(order);
    const previousState = unlockState.unlocked.slice();
    const unlocked = previousState.filter(function (key, index, arr) {
      return key === "alphabet" || (order.includes(key) && arr.indexOf(key) === index);
    });
    if (!unlocked.includes("alphabet")) unlocked.unshift("alphabet");
    const spentUnlocks = unlockState.spentUnlocks && typeof unlockState.spentUnlocks === "object"
      ? Object.assign({}, unlockState.spentUnlocks)
      : {};
    let spentStars = Math.max(0, Math.floor(Number(unlockState.spentStars || 0)));
    let spentGems = Math.max(0, Math.floor(Number(unlockState.spentGems || 0)));
    let lastUnlockLifetimeStars = Math.max(0, Math.floor(Number(unlockState.lastUnlockLifetimeStars || 0)));
    let lastUnlockLifetimeGems = Math.max(0, Math.floor(Number(unlockState.lastUnlockLifetimeGems || 0)));
    let lastUnlockNonce = Math.max(0, Math.floor(Number(unlockState.lastUnlockNonce || 0)));
    let lastUnlockedWorld = typeof unlockState.lastUnlockedWorld === "string" ? unlockState.lastUnlockedWorld : "";
    let lastUnlockedAt = Math.max(0, Math.floor(Number(unlockState.lastUnlockedAt || 0)));
    const rewards = computeRewardLedger(order, totalsByWorld);
    let availableStars = rewards.availableStars;
    let availableGems = rewards.availableGems;
    const earnedSinceLastUnlock = rewards.lifetimeStars > lastUnlockLifetimeStars
      || rewards.lifetimeGems > lastUnlockLifetimeGems;
    let unlockedThisSync = false;

    for (let index = 1; index < order.length; index += 1) {
      const key = order[index];
      if (unlocked.includes(key)) continue;
      const previous = order[index - 1];
      if (!unlocked.includes(previous)) break;
      if (unlockedThisSync) break;
      const canUnlock = earnedSinceLastUnlock
        && availableStars >= UNLOCK_STAR_TARGET
        && availableGems >= UNLOCK_GEM_TARGET;
      if (!canUnlock) break;
      unlocked.push(key);
      spentUnlocks[key] = true;
      spentStars += UNLOCK_STAR_TARGET;
      spentGems += UNLOCK_GEM_TARGET;
      availableStars = Math.max(0, availableStars - UNLOCK_STAR_TARGET);
      availableGems = Math.max(0, availableGems - UNLOCK_GEM_TARGET);
      unlockedThisSync = true;
      lastUnlockLifetimeStars = rewards.lifetimeStars;
      lastUnlockLifetimeGems = rewards.lifetimeGems;
      lastUnlockNonce += 1;
      lastUnlockedWorld = key;
      lastUnlockedAt = Date.now();
    }

    const changed = unlocked.length !== previousState.length
      || unlocked.some(function (key, index) { return previousState[index] !== key; });
    saveUnlockState({
      unlocked: changed ? unlocked : previousState,
      spentUnlocks: spentUnlocks,
      spentStars: spentStars,
      spentGems: spentGems,
      lastUnlockLifetimeStars: lastUnlockLifetimeStars,
      lastUnlockLifetimeGems: lastUnlockLifetimeGems,
      lastUnlockNonce: lastUnlockNonce,
      lastUnlockedWorld: lastUnlockedWorld,
      lastUnlockedAt: lastUnlockedAt
    }, order);
    return unlocked;
  }

  function getProgressSnapshot(worldOrder, totalsByWorld) {
    const order = normalizeWorldOrder(worldOrder);
    const totals = totalsByWorld && typeof totalsByWorld === "object" ? totalsByWorld : {};
    const forest = loadForestState();
    const alphabet = getAlphabetJourney(forest);
    const worlds = {};
    let worldStars = 0;
    let worldGems = 0;
    let worldsExplored = 0;
    let completedWorlds = 0;
    order.forEach(function (worldKey) {
      if (worldKey === "alphabet") return;
      const totalLessons = Number(totals[worldKey] || 3);
      const progress = loadWorldProgress(worldKey, totalLessons);
      worlds[worldKey] = progress;
      worldStars += progress.stars;
      worldGems += progress.gems;
      if (progress.lessonIndex > 0 || progress.completedLessonsCount > 0 || progress.stars > 0 || progress.practiceCompletedCount > 0) {
        worldsExplored += 1;
      }
      if (progress.isComplete) completedWorlds += 1;
    });
    const currentWorld = localStorage.getItem(LAST_WORLD_KEY) || "alphabet";
    const rewardLedger = computeRewardLedger(order, totals);
    const unlockState = loadUnlockState(order);
    return {
      currentWorld: order.includes(currentWorld) ? currentWorld : "alphabet",
      alphabet: alphabet,
      worlds: worlds,
      totals: {
        worldsExplored: worldsExplored + 1,
        worldsCompleted: completedWorlds,
        learningActivitiesCompleted: alphabet.learningCompletedCount,
        practiceActivitiesCompleted: alphabet.practiceCompletedCount,
        forestActivitiesCompleted: alphabet.activities.filter(function (activity) { return activity.isComplete; }).length,
        stars: rewardLedger.lifetimeStars,
        availableStars: rewardLedger.availableStars
      },
      rewards: {
        stars: rewardLedger.availableStars,
        gems: rewardLedger.availableGems,
        availableStars: rewardLedger.availableStars,
        availableGems: rewardLedger.availableGems,
        lifetimeStars: rewardLedger.lifetimeStars,
        lifetimeGems: rewardLedger.lifetimeGems,
        spentStars: rewardLedger.spentStars,
        spentGems: rewardLedger.spentGems,
        unlockNonce: Number(unlockState.lastUnlockNonce || 0),
        lastUnlockedWorld: unlockState.lastUnlockedWorld || ""
      }
    };
  }

  function isWorldUnlocked(worldKey, worldOrder, testMode, totalsByWorld) {
    if (testMode) return true;
    const order = normalizeWorldOrder(worldOrder);
    if (!order.includes(worldKey)) return false;
    const unlocked = syncSequentialUnlocks(order, totalsByWorld);
    return unlocked.includes(worldKey);
  }

  function syncHomeAggregate(worldOrder, totalsByWorld) {
    const snapshot = getProgressSnapshot(worldOrder, totalsByWorld);
    const existing = getHomeRewardState();
    const completedWorldKeys = Object.keys(snapshot.worlds).filter(function (worldKey) {
      return snapshot.worlds[worldKey].isComplete;
    });
    const rewards = snapshot.rewards && typeof snapshot.rewards === "object" ? snapshot.rewards : {};
    const challengeGems = Number(existing.challengeGems || rewards.challengeGems || 0);
    const lifetimeGems = Math.max(0, Math.floor(Number(rewards.lifetimeGems || existing.lifetimeGems || existing.gems || 0)));
    const availableGems = Math.max(0, Math.floor(Number(rewards.availableGems || 0)));
    const availableStars = Math.max(0, Math.floor(Number(rewards.availableStars || 0)));
    const merged = {
      gems: availableGems,
      challengeGems: challengeGems,
      completed: completedWorldKeys,
      availableStars: availableStars,
      availableGems: availableGems,
      lifetimeStars: Math.max(0, Math.floor(Number(rewards.lifetimeStars || snapshot.totals.stars || 0))),
      lifetimeGems: lifetimeGems
    };
    writeJson(HOME_KEY, merged);
    return merged;
  }

  function getHomeRewardState() {
    const existing = readJson(HOME_KEY, { gems: 0, completed: [] }) || { gems: 0, completed: [] };
    const challengeGems = Number.isFinite(Number(existing.challengeGems))
      ? Math.max(0, Math.floor(Number(existing.challengeGems)))
      : 0;
    const legacyXp = Number.isFinite(Number(existing.xp))
      ? Math.max(0, Math.floor(Number(existing.xp)))
      : 0;
    const gems = Number.isFinite(Number(existing.gems))
      ? Math.max(0, Math.floor(Number(existing.gems)))
      : legacyXp;
    return {
      gems: gems,
      challengeGems: challengeGems,
      completed: Array.isArray(existing.completed) ? existing.completed.slice() : [],
      availableStars: Number.isFinite(Number(existing.availableStars))
        ? Math.max(0, Math.floor(Number(existing.availableStars)))
        : 0,
      availableGems: Number.isFinite(Number(existing.availableGems))
        ? Math.max(0, Math.floor(Number(existing.availableGems)))
        : gems,
      lifetimeStars: Number.isFinite(Number(existing.lifetimeStars))
        ? Math.max(0, Math.floor(Number(existing.lifetimeStars)))
        : 0,
      lifetimeGems: Number.isFinite(Number(existing.lifetimeGems))
        ? Math.max(0, Math.floor(Number(existing.lifetimeGems)))
        : gems
    };
  }

  function awardDailyChallengeGems(dateKey) {
    const key = CHALLENGE_KEY + ".rewards";
    const rewards = readJson(key, { days: {}, totalGems: 0 }) || { days: {}, totalGems: 0 };
    if (!rewards.days || typeof rewards.days !== "object") rewards.days = {};
    if (dateKey && rewards.days[dateKey]) return false;
    if (dateKey) rewards.days[dateKey] = true;
    rewards.totalGems = Math.max(0, Math.floor(Number(rewards.totalGems || 0))) + CHALLENGE_GEMS_PER_DAY;
    writeJson(key, rewards);
    const home = getHomeRewardState();
    home.challengeGems = rewards.totalGems;
    writeJson(HOME_KEY, {
      gems: Math.max(0, Math.floor(Number(home.gems || 0))),
      challengeGems: home.challengeGems,
      completed: home.completed,
      availableStars: Math.max(0, Math.floor(Number(home.availableStars || 0))),
      availableGems: Math.max(0, Math.floor(Number(home.availableGems || home.gems || 0))),
      lifetimeStars: Math.max(0, Math.floor(Number(home.lifetimeStars || 0))),
      lifetimeGems: Math.max(0, Math.floor(Number(home.lifetimeGems || home.gems || 0)))
    });
    return true;
  }

  function resetProgress(worldOrder) {
    const order = normalizeWorldOrder(worldOrder);
    localStorage.removeItem(FOREST_V3_KEY);
    localStorage.removeItem(FOREST_LEGACY_KEY);
    localStorage.removeItem(FOREST_LEGACY_V1_KEY);
    localStorage.removeItem(FOREST_LEGACY_TREE_KEY);
    localStorage.removeItem(FOREST_LEGACY_GARDEN_KEY);
    localStorage.removeItem(HOME_KEY);
    localStorage.removeItem(CHALLENGE_KEY);
    order.forEach(function (worldKey) {
      localStorage.removeItem(storageKey("world." + worldKey + ".progress"));
    });
    saveUnlockState({
      unlocked: ["alphabet"],
      spentUnlocks: {},
      spentStars: 0,
      spentGems: 0,
      lastUnlockLifetimeStars: 0,
      lastUnlockLifetimeGems: 0,
      lastUnlockNonce: 0,
      lastUnlockedWorld: "",
      lastUnlockedAt: 0
    }, order);
    localStorage.setItem(LAST_WORLD_KEY, "alphabet");
    return true;
  }

  function resetWorldProgress(worldKey, worldOrder, totalsByWorld) {
    const order = normalizeWorldOrder(worldOrder);
    const totals = totalsByWorld && typeof totalsByWorld === "object" ? totalsByWorld : {};
    if (!order.includes(worldKey)) return false;
    if (worldKey === "alphabet") {
      const state = sanitizeForestState(loadForestState());
      FOREST_ACTIVITY_IDS.forEach(function (activityId) {
        const prev = state.activities[activityId] || createActivityState();
        const next = createActivityState();
        next.rewardedItems = normalizeIndexList(prev.rewardedItems || [], LETTER_COUNT - 1);
        state.activities[activityId] = next;
      });
      state.worldCompleted = false;
      writeJson(FOREST_V3_KEY, state);
    } else {
      const totalLessons = Number(totals[worldKey] || 3);
      const progress = loadWorldProgress(worldKey, totalLessons);
      writeJson(storageKey("world." + worldKey + ".progress"), {
        lessonIndex: 0,
        stars: Number(progress.stars || 0),
        gems: Number(progress.gems || 0),
        completedLessons: [],
        done: { match: false, listen: false, build: false },
        practiceCompleted: { match: false, listen: false, build: false },
        completedActivities: {},
        rewardedActivities: progress.rewardedActivities || {},
        rewardedGroupBonuses: progress.rewardedGroupBonuses || {},
        rewardedActivityGems: progress.rewardedActivityGems || {}
      });
    }
    syncSequentialUnlocks(order, totals);
    syncHomeAggregate(order, totals);
    return true;
  }

  globalScope.SPProgressStore = {
    keys: {
      FOREST_V3_KEY: FOREST_V3_KEY,
      FOREST_LEGACY_KEY: FOREST_LEGACY_KEY,
      FOREST_LEGACY_V1_KEY: FOREST_LEGACY_V1_KEY,
      FOREST_LEGACY_TREE_KEY: FOREST_LEGACY_TREE_KEY,
      FOREST_LEGACY_GARDEN_KEY: FOREST_LEGACY_GARDEN_KEY,
      HOME_KEY: HOME_KEY,
      LAST_WORLD_KEY: LAST_WORLD_KEY,
      CHALLENGE_KEY: CHALLENGE_KEY,
      WORLD_UNLOCKS_KEY: WORLD_UNLOCKS_KEY
    },
    loadForestState: loadForestState,
    getAlphabetJourney: getAlphabetJourney,
    getProgressSnapshot: getProgressSnapshot,
    isWorldUnlocked: isWorldUnlocked,
    syncHomeAggregate: syncHomeAggregate,
    syncSequentialUnlocks: syncSequentialUnlocks,
    resetProgress: resetProgress,
    resetWorldProgress: resetWorldProgress,
    awardDailyChallengeGems: awardDailyChallengeGems
  };
})(typeof window !== "undefined" ? window : globalThis);
