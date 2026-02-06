import { Settings } from "../settings.js";
import { loadProfiles, loadArmyLists } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";
import { navigate } from "../main.js";

/* =========================
   STATE
========================= */

let state = {
    mode: "interactive",
    selectedProfileId: null,
    profiles: null,
    armyLists: null,
    container: null
};

/* =========================
   NAVIGATION HOOK
========================= */

export function onProfilesSearchNavigate(params = {}) {
    if (!params.profileId || !state.container) return;

    state.mode = "direct";
    state.selectedProfileId = params.profileId;

    const profileView = state.container.querySelector("#profileView");
    renderProfileById(profileView, params.profileId);
}

/* =========================
   INIT VIEW
========================= */

export async function initProfilesSearch(container, params = {}) {
    state.container = container;

    container.innerHTML = `
        <div class="profiles-search">
            <input
                id="profileSearchInput"
                type="text"
                placeholder="${t("profiles.search.placeholder")}"
                autocomplete="off"
            />
            <ul id="autosuggestions" class="autosuggestions"></ul>
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
    const list = container.querySelector("#autosuggestions");
    const profileView = container.querySelector("#profileView");

    if (params.profileId) {
        state.mode = "direct";
        renderProfileById(profileView, params.profileId);
    }

    input.addEventListener("focus", () => state.mode = "interactive");

    input.addEventListener("input", () => {
        if (state.mode !== "interactive") return;
        renderAutosuggestions(input.value, list, profileView);
    });
}

/* =========================
   AUTOSUGGESTIONS
========================= */

function renderAutosuggestions(query, list, profileView) {
    list.innerHTML = "";
    const q = normalize(query);
    if (!q) return;

    Object.values(state.profiles)
        .filter(p => normalize(p.name).includes(q))
        .slice(0, 10)
        .forEach(profile => {
            const li = document.createElement("li");
            li.textContent = profile.name;
            li.onclick = () => {
                list.innerHTML = "";
                renderProfile(profileView, profile);
            };
            list.appendChild(li);
        });
}

/* =========================
   PROFILE RENDERING
========================= */

function renderProfileById(container, id) {
    const profile = Object.values(state.profiles).find(p => p.id === id);
    if (profile) renderProfile(container, profile);
}

function renderProfile(container, profile) {
    const usedIn = findArmylistsContainingProfile(profile.name);

    container.innerHTML = `
        <h3>${profile.name}</h3>
        <p><strong>Points:</strong> ${profile.points}</p>
        <p><strong>Alignment:</strong> ${profile.alignment}</p>

        <h4>${t("profiles.usedInArmylists")}</h4>
        <ul class="linked-armylists">
            ${
                usedIn.length
                    ? usedIn.map(a =>
                        `<li data-id="${a.id}">${a.name}</li>`
                      ).join("")
                    : `<li>${t("profiles.notUsed")}</li>`
            }
        </ul>
    `;

    container.querySelectorAll(".linked-armylists li[data-id]")
        .forEach(li => {
            li.onclick = () =>
                navigate("armylists", "search", { armylistId: li.dataset.id });
        });
}

/* =========================
   ARMYLIST LOOKUP
========================= */

function findArmylistsContainingProfile(profileName) {
    return Object.values(state.armyLists).filter(armylist =>
        Object.values(armylist.models || {}).some(group =>
            group.some(model => model.name === profileName)
        )
    );
}

/* =========================
   UTIL
========================= */

function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
