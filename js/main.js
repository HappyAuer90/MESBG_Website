import { Settings, initSettingsUI } from "./settings.js";
import { t } from "./utility/i18n.js";
import { applyThemeColors } from "./utility/theme.js";
import { initGlobalDebugButton, removeGlobalDebugButton, updateGlobalDebugButton } from "./debug.js";

const debug = true; // Set to true to enable debug features


/* =========================
   IMPORT VIEWS
========================= */

import { initRulesManual} from "./rules/rulesManual.js";
import { initRulesAll} from "./rules/showAllRules.js";

import { initProfilesSearch, onProfilesSearchNavigate } from "./profiles/searchProfile.js";
import { initProfilesExpert } from "./profiles/expertSearch.js";
import { initProfilesAll } from "./profiles/showAllProfiles.js";

import { initArmylistsSearch, onArmylistsSearchNavigate } from "./armylists/searchArmylist.js";
/* import { initArmylistsBuild, onArmylistsBuildNavigate } from "./armylists/buildarmylist/renderPage.js";*/
import { initArmylistsAll } from "./armylists/showAllArmylists.js";


/* =========================
   GLOBAL STATE
========================= */

const content = document.getElementById("content");
const subNav = document.getElementById("subCategories");
const mainNav = document.getElementById("mainCategories");
const titleEl = document.getElementById("appTitle");

Settings.load();
applyTranslations();
applyThemeColors();
if (debug) {
    initGlobalDebugButton();
} else {
    removeGlobalDebugButton();
}

function updateTitle() {
    const baseTitle = t("main.title");
    const version = Settings.version || "";
    titleEl.textContent = version ? `${baseTitle} (Version: ${version})` : baseTitle;
}

function applyTranslations() {
    document.documentElement.lang = Settings.language;

    document.querySelectorAll("[data-i18n-key]").forEach(el => {
        const key = el.getAttribute("data-i18n-key");
        const translated = t(key);

        if (!translated) return;

        const target = el.getAttribute("data-i18n-attr") || "textContent";

        if (target === "textContent") {
            el.textContent = translated;
        } else {
            el.setAttribute(target, translated);
        }
    });

    updateLanguageButton();
    updateGlobalDebugButton();
    updateTitle();
}

function updateLanguageButton() {
    const btn = document.getElementById("languageToggleBtn");
    if (!btn) return;

    const isGerman = Settings.language === "de";
    btn.textContent = isGerman ? "🇩🇪" : "🇬🇧";
    btn.setAttribute("aria-label", isGerman ? t("accessibility.switchToEnglish") : t("accessibility.switchToGerman"));
    btn.setAttribute("title", isGerman ? t("accessibility.switchToEnglish") : t("accessibility.switchToGerman"));
}

const MAIN_CATEGORIES = {
    rules: {
        labelKey: "main.rules"
    },
    profiles: {
        labelKey: "main.profiles"
    },
    armylists: {
        labelKey: "main.armylists"
    },
};

const VIEWS = {
    
    rules: {
        manual: {
            labelKey: "main.showRulesManual",
            init: initRulesManual,
            container: null
        },
        all: {
            labelKey: "main.showAllRules",
            init: initRulesAll,
            container: null
        }
    },
    profiles: {
        search: {
            labelKey: "main.searchProfile",
            init: initProfilesSearch,
            onNavigate: onProfilesSearchNavigate,
            container: null
        },
        expert: {
            labelKey: "main.expertSearch",
            init: initProfilesExpert,
            container: null
        },
        all: {
            labelKey: "main.showAllProfiles",
            init: initProfilesAll,
            container: null
        }
    },
    armylists: {
        search: {
            labelKey: "main.searchArmylist",
            init: initArmylistsSearch,
            onNavigate: onArmylistsSearchNavigate,
            container: null
        },
       /* build: {
            labelKey: "main.buildArmylist",
            init: initArmylistsBuild,
            onNavigate: onArmylistsBuildNavigate,
            container: null
        },*/
        all: {
            labelKey: "main.showAllArmylists",
            init: initArmylistsAll,
            container: null
        }
    }
};

let activeMain = null;
let activeSub = null;

const tabHistory = {
    stack: [],
    index: -1
};

export function navigate(main, sub, params = {}, options = {}) {
    
    if (activeMain && activeSub) {
        const old = VIEWS[activeMain][activeSub].container;
        if (old) old.style.display = "none";
    }

    const view = VIEWS[main][sub];

    if (!view.container) {
        view.container = document.createElement("div");
        view.container.className = `view ${main}-${sub}`;
        content.appendChild(view.container);
        view.init(view.container, params);
    }

    if (view.onNavigate) {
        view.onNavigate(params);
    }

    view.container.style.display = "block";

    activeMain = main;
    activeSub = sub;

    // =========================
// GLOBAL TAB HISTORY
// =========================

if (!options.fromHistory) {

    // Forward-History abschneiden
    tabHistory.stack = tabHistory.stack.slice(0, tabHistory.index + 1);

    tabHistory.stack.push({ main, sub, params });
    tabHistory.index++;
}
    renderMainNav();
    renderSubNav();

}
export function navigateBack() {

    if (tabHistory.index > 0) {
        tabHistory.index--;

        const entry = tabHistory.stack[tabHistory.index];

        navigate(entry.main, entry.sub, entry.params, {
            fromHistory: true
        });
    }
}

export function navigateForward() {

    if (tabHistory.index < tabHistory.stack.length - 1) {
        tabHistory.index++;

        const entry = tabHistory.stack[tabHistory.index];

        navigate(entry.main, entry.sub, entry.params, {
            fromHistory: true
        });
    }
}
function renderMainNav() {
    mainNav.innerHTML = "";

    Object.entries(MAIN_CATEGORIES).forEach(([key, cfg]) => {
        const btn = document.createElement("button");
        btn.dataset.main = key;
        btn.textContent = t(cfg.labelKey);
        btn.classList.toggle("active", key === activeMain);

        btn.onclick = () => {
            const firstSub = Object.keys(VIEWS[key])[0];
            navigate(key, firstSub);
        };

        mainNav.appendChild(btn);
    });
}


function renderSubNav() {
    subNav.innerHTML = "";

    Object.entries(VIEWS[activeMain]).forEach(([key, cfg]) => {
        const btn = document.createElement("button");
        btn.textContent = t(cfg.labelKey);
        btn.classList.toggle("active", key === activeSub);
        btn.onclick = () => navigate(activeMain, key);
        subNav.appendChild(btn);
    });
}
updateTitle();

document.getElementById("languageToggleBtn").onclick = () => {
    Settings.language = Settings.language === "de" ? "en" : "de";
    Settings.save();
    location.reload();
};

document.getElementById("settingsBtn").onclick = () => {
    document.getElementById("settingsModal").classList.remove("hidden");
    initSettingsUI();
};

document.getElementById("globalBackBtn").onclick = () => {
    navigateBack();
};

document.getElementById("globalForwardBtn").onclick = () => {
    navigateForward();
};

navigate("rules", "manual");
