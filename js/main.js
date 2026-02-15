import { Settings, initSettingsUI } from "./settings.js";
import { t } from "./utility/i18n.js";
import { applyThemeColors } from "./utility/theme.js";


/* =========================
   IMPORT VIEWS
========================= */

import { initProfilesSearch, onProfilesSearchNavigate } from "./profiles/searchProfile.js";
import { initProfilesExpert } from "./profiles/expertSearch.js";
import { initProfilesAll } from "./profiles/showAllProfiles.js";

import { initArmylistsSearch, onArmylistsSearchNavigate } from "./armylists/searchArmylist.js";
import { initArmylistsAll } from "./armylists/showAllArmylists.js";
import { initArmylistsBuild } from "./armylists/buildArmylist.js";

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
    armylists: {
        labelKey: "main.armylists"
    }
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
    armylists: {
        search: {
            labelKey: "main.searchArmylist",
            init: initArmylistsSearch,
            onNavigate: onArmylistsSearchNavigate,
            container: null
        },
        all: {
            labelKey: "main.showAllArmylists",
            init: initArmylistsAll,
            container: null
        },
        build: {
            labelKey: "main.buildArmylist",
            init: initArmylistsBuild,
            container: null
        }
    }
};

let activeMain = null;
let activeSub = null;

export function navigate(main, sub, params = {}) {
    
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

    renderMainNav();
renderSubNav();

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

navigate("profiles", "search");
