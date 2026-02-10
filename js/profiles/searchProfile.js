import { Settings } from "../settings.js";
import { loadProfiles, loadArmyLists } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */

const state = {
    profiles: null,
    armyLists: null,
    container: null,

    mode: "direct",
    history: [],
    currentProfileId: null
};

/* =========================
   NAVIGATION HOOK
========================= */

export function onProfilesSearchNavigate(params = {}) {
    if (!params.profileId || !state.container) return;

    const profile = getProfileById(params.profileId);
    if (!profile) return;

    state.mode = "direct";
    loadProfile(profile, { pushHistory: true });
}

/* =========================
   INIT VIEW
========================= */

export async function initProfilesSearch(container, params = {}) {
    state.container = container;

    container.innerHTML = `
        <div class="profiles-search">

            <div class="search-wrapper">
                <div class="profile-search-bar">
                    <input
                        id="profileSearchInput"
                        type="text"
                        placeholder="${t("profiles.search.placeholder")}"
                        autocomplete="off"
                    />
                    <button id="profileBackBtn" disabled>←</button>
                    <ul id="autosuggestions" class="autosuggestions"></ul>
                </div>
            </div>

            <div class="profile-separator hidden"></div>
            <div id="profileView"></div>
        </div>
    `;

    if (!state.profiles) {
        state.profiles = await loadProfiles(Settings.version);
    }
    if (!state.armyLists) {
        state.armyLists = await loadArmyLists(Settings.version);
    }

    const input = container.querySelector("#profileSearchInput");
    const list  = container.querySelector("#autosuggestions");
    const back  = container.querySelector("#profileBackBtn");

    input.addEventListener("focus", () => {
        state.mode = "interactive";
    });

    input.addEventListener("input", () => {
        if (state.mode !== "interactive") return;
        renderAutosuggestions(input.value, list);
    });

    back.onclick = () => {
        if (state.history.length <= 1) return;

        state.history.pop();
        const prevId = state.history[state.history.length - 1];
        const profile = getProfileById(prevId);

        state.mode = "direct";
        loadProfile(profile, { pushHistory: false });
    };

    if (params.profileId) {
        const profile = getProfileById(params.profileId);
        if (profile) {
            state.mode = "direct";
            loadProfile(profile, { pushHistory: true });
        }
    }
}

/* =========================
   AUTOSUGGESTIONS
========================= */

function renderAutosuggestions(query, list) {
    list.innerHTML = "";
    list.classList.remove("visible");

    const q = normalize(query);
    if (!q) return;

    const matches = Object.values(state.profiles)
        .filter(p => normalize(p.name).includes(q))
        .slice(0, 10);

    if (!matches.length) return;

    matches.forEach(profile => {
        const li = document.createElement("li");
        li.textContent = profile.name;
        li.onclick = () => {
            state.mode = "direct";
            loadProfile(profile, { pushHistory: true });
        };
        list.appendChild(li);
    });

    list.classList.add("visible");
}


/* =========================
   PROFILE LOADING
========================= */

function loadProfile(profile, { pushHistory }) {
    const input = state.container.querySelector("#profileSearchInput");
    const list  = state.container.querySelector("#autosuggestions");
    const view  = state.container.querySelector("#profileView");
    const sep   = state.container.querySelector(".profile-separator");

    state.currentProfileId = profile.id;

    if (pushHistory) state.history.push(profile.id);
    updateBackButton();

    input.value = profile.name;
    list.innerHTML = "";
    list.classList.remove("visible");
;

    sep.classList.remove("hidden");

    view.innerHTML = "";
    renderProfile(view, profile);

    if (profile.composition) {
        renderComposition(view, profile);
    }
}

/* =========================
   PROFILE RENDERING
========================= */

function renderProfile(container, profile) {
    container.insertAdjacentHTML("beforeend", `
        <h2 class="profile-title">${profile.name}</h2>

        ${accordion("Characteristics")}
        ${twoPane("Wargear")}
        ${twoPane("Heroic Actions")}
        ${twoPane("Options")}
        ${twoPane("Special Rules")}
        ${twoPane("Magical Powers")}
        ${accordion("Additional Information")}
    `);
}

/* =========================
   COMPOSITION
========================= */

function renderComposition(container, profile) {
    container.insertAdjacentHTML("beforeend", `<div class="double-separator"></div>`);

    profile.composition.forEach((name, idx) => {
        const sub = Object.values(state.profiles).find(p => p.name === name);
        if (!sub) return;

        renderProfile(container, sub);

        if (idx < profile.composition.length - 1) {
            container.insertAdjacentHTML("beforeend", `<div class="single-separator"></div>`);
        }
    });
}

/* =========================
   UI HELPERS
========================= */

function accordion(title) {
    return `
        <details class="profile-box">
            <summary>${title}</summary>
            <div class="box-content">Dummy content for ${title}</div>
        </details>
    `;
}

function twoPane(title) {
    return `
        <details class="profile-box">
            <summary>${title}</summary>
            <div class="two-pane">
                <ul class="left"><li>Entry A</li><li>Entry B</li></ul>
                <div class="right">Select an entry</div>
            </div>
        </details>
    `;
}

/* =========================
   UTIL
========================= */

function getProfileById(id) {
    return Object.values(state.profiles).find(p => p.id === id);
}

function updateBackButton() {
    const btn = state.container.querySelector("#profileBackBtn");
    btn.disabled = state.history.length <= 1;
}

function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
