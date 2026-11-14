(function initSiteConfig(globalScope) {
  const existing = globalScope.SP_CONFIG || {};
  const defaultLanguageAvailability = {
    sanskrit: { enabled: true, comingSoon: false },
    spanish: { enabled: false, comingSoon: true },
    portuguese: { enabled: false, comingSoon: true }
  };
  const existingAvailability = existing.languageAvailability || {};
  const mergedAvailability = Object.keys(defaultLanguageAvailability).reduce(function (acc, key) {
    acc[key] = Object.assign({}, defaultLanguageAvailability[key], existingAvailability[key] || {});
    return acc;
  }, {});

  globalScope.SP_CONFIG = Object.assign({
    TEST_MODE: true,
    TEST_PROGRESS_RESET: {
      enabled: true,
      deploymentId: "2026-11-14-shloka-v1"
    },
    languageAvailability: mergedAvailability,
    lockedLanguageMessage: "More magical adventures are coming soon!"
  }, existing);

  if (!globalScope.SP_CONFIG.languageAvailability) {
    globalScope.SP_CONFIG.languageAvailability = mergedAvailability;
  }
  if (!globalScope.SP_CONFIG.lockedLanguageMessage) {
    globalScope.SP_CONFIG.lockedLanguageMessage = "More magical adventures are coming soon!";
  }
  if (!globalScope.SP_CONFIG.TEST_PROGRESS_RESET) {
    globalScope.SP_CONFIG.TEST_PROGRESS_RESET = {
      enabled: true,
      deploymentId: "2026-11-14-shloka-v1"
    };
  }

  globalScope.spGetLanguageAvailability = function spGetLanguageAvailability(languageKey) {
    const key = String(languageKey || "").toLowerCase();
    const map = globalScope.SP_CONFIG && globalScope.SP_CONFIG.languageAvailability
      ? globalScope.SP_CONFIG.languageAvailability
      : mergedAvailability;
    const entry = map[key];
    if (!entry) return { enabled: true, comingSoon: false };
    return {
      enabled: entry.enabled !== false,
      comingSoon: entry.comingSoon !== false
    };
  };

  globalScope.spIsLanguageEnabled = function spIsLanguageEnabled(languageKey) {
    return globalScope.spGetLanguageAvailability(languageKey).enabled;
  };

  globalScope.spGetLockedLanguageMessage = function spGetLockedLanguageMessage() {
    return String((globalScope.SP_CONFIG && globalScope.SP_CONFIG.lockedLanguageMessage) || "More magical adventures are coming soon!");
  };

  if (!globalScope.SP_PROJECT_NAME) globalScope.SP_PROJECT_NAME = "BhashaParichay";
  if (!globalScope.SP_LANGUAGE_NAME) globalScope.SP_LANGUAGE_NAME = "SanskritParichay";
  if (!globalScope.SP_STORAGE_PREFIX) globalScope.SP_STORAGE_PREFIX = "bhashaParichay.sanskrit";
  if (!globalScope.SP_LANGUAGE_HOME_URL) globalScope.SP_LANGUAGE_HOME_URL = "sanskritparichay/";
  if (!globalScope.SP_LANGUAGE_CHOOSER_URL) globalScope.SP_LANGUAGE_CHOOSER_URL = "index.html";

  globalScope.spApplyDeploymentTestReset = function spApplyDeploymentTestReset() {
    try {
      const cfg = globalScope.SP_CONFIG || {};
      const resetCfg = cfg.TEST_PROGRESS_RESET || {};
      const enabled = cfg.TEST_MODE === true && resetCfg.enabled !== false;
      const deploymentId = String(resetCfg.deploymentId || "").trim();
      if (!enabled || !deploymentId) return false;

      const storagePrefix = globalScope.SP_STORAGE_PREFIX || "bhashaParichay.sanskrit";
      const markerKey = storagePrefix + ".testMode.reset.appliedVersion";
      const appliedVersion = localStorage.getItem(markerKey);
      if (appliedVersion === deploymentId) return false;

      const worldOrder = Array.isArray(globalScope.SP_WORLD_ORDER) && globalScope.SP_WORLD_ORDER.length
        ? globalScope.SP_WORLD_ORDER
        : ["alphabet", "animals", "numbers", "colours", "words", "sentences", "stories", "culture"];

      const keysToRemove = [
        storagePrefix + ".alphabetForest.v3",
        storagePrefix + ".alphabetForest.progress",
        storagePrefix + ".alphabetForest.progression.v1",
        storagePrefix + ".alphabetForest.tree.progress",
        storagePrefix + ".alphabetForest.garden.learned",
        storagePrefix + ".home.progress",
        storagePrefix + ".dailyChallenge.progress",
        storagePrefix + ".dailyChallenge.progress.rewards",
        storagePrefix + ".world.unlocks.v1",
        storagePrefix + ".lastWorld",
        storagePrefix + ".shlokaGarden.progress",
        storagePrefix + ".shlokaGarden.dailyReward",
        "klww.home.starQuest.v4",
        "klww.home.starQuest.v3",
        "klww.home.starQuest.v2",
        "klww.home.starQuest"
      ];

      worldOrder.forEach(function (worldKey) {
        keysToRemove.push(storagePrefix + ".world." + worldKey + ".progress");
      });

      keysToRemove.forEach(function (key) {
        localStorage.removeItem(key);
      });
      localStorage.setItem(markerKey, deploymentId);
      return true;
    } catch (_error) {
      return false;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
