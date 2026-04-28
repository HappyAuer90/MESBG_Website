import { Settings, initSettingsUI } from "./settings.js";
import { t } from "./utility/i18n.js";
import { applyThemeColors } from "./utility/theme.js";


/* =========================
   IMPORT VIEWS
========================= */

import { initProfilesSearch, onProfilesSearchNavigate } from "./profiles/searchProfile.js";
import { initProfilesExpert } from "./profiles/expertSearch.js";
import { initProfilesAll } from "./profiles/showAllProfiles.js";

import { initRulesAll} from "./rules/showAllRules.js";

import { initArmylistsSearch, onArmylistsSearchNavigate } from "./armylists/searchArmylist.js";
import { initArmylistsBuild, onArmylistsBuildNavigate } from "./armylists/buildarmylist/renderPage.js";
import { initArmylistsAll } from "./armylists/showAllArmylists.js";

import { initMatchedPlay} from "./scenarios/matchedPlay.js";

import { initWarriorSimulations} from "./simulations/warriors.js";


/* =========================
   GLOBAL STATE
========================= */

Settings.load();
applyThemeColors();

const content = document.getElementById("content");
const subNav = document.getElementById("subCategories");
const mainNav = document.getElementById("mainCategories");
const titleEl = document.getElementById("appTitle");

const MAIN_CATEGORIES = {
    profiles: {
        labelKey: "main.profiles"
    },
    rules: {
        labelKey: "main.rules"
    },
    armylists: {
        labelKey: "main.armylists"
    },
    /*scenarios: {
        labelKey: "main.scenarios"
    },
    simulations: {
        labelKey: "main.simulations"
    }*/
};

const VIEWS = {
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
    rules: {
        all: {
            labelKey: "main.showAllRules",
            init: initRulesAll,
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
        build: {
            labelKey: "main.buildArmylist",
            init: initArmylistsBuild,
            onNavigate: onArmylistsBuildNavigate,
            container: null
        },
        all: {
            labelKey: "main.showAllArmylists",
            init: initArmylistsAll,
            container: null
        }
    }/*,
    scenarios: {
        matchedPlay: {
            labelKey: "main.matchedPlay",
            init: initMatchedPlay,
            container: null
        }
    },
    simulations: {
        warrior: {
            labelKey: "main.warriorSimulations",
            init: initWarriorSimulations,
            container: null
        }
    }*/
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
titleEl.textContent = t("main.title");

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

navigate("profiles", "search");
