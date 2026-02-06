import { Settings } from "../settings.js";
import { loadArmyLists, loadProfiles } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";
import { navigate } from "../main.js";

/* =========================
   STATE
========================= */

let state = {
    mode: "interactive",
    armyLists: null,
    profiles: null,
    profileByName: null,
    container: null
};

/* =========================
   NAVIGATION HOOK
========================= */

export function onArmylistsSearchNavigate(params = {}) {
    if (!params.armylistId || !state.container) return;

    state.mode = "direct";
    renderArmyListById(
        state.container.querySelector("#armyListView"),
        params.armylistId
    );
}

/* =========================
   INIT VIEW
========================= */

export async function initArmylistsSearch(container, params = {}) {
    state.container = container;

    container.innerHTML = `
        <div class="armylists-search">
            <input
                id="armylistSearchInput"
                type="text"
                placeholder="${t("armylists.search.placeholder")}"
                autocomplete="off"
            />
            <ul id="autosuggestions" class="autosuggestions"></ul>
            <div id="armyListView"></div>
        </div>
    `;

    if (!state.armyLists) {
        state.armyLists = await loadArmyLists(Settings.version);
    }

    if (!state.profiles) {
        state.profiles = await loadProfiles(Settings.version);
        state.profileByName = {};
        Object.values(state.profiles).forEach(p => {
            state.profileByName[p.name] = p.id;
        });
    }

    const input = container.querySelector("#armylistSearchInput");
    const list = container.querySelector("#autosuggestions");
    const view = container.querySelector("#armyListView");

    if (params.armylistId) {
        renderArmyListById(view, params.armylistId);
    }

    input.addEventListener("focus", () => state.mode = "interactive");

    input.addEventListener("input", () => {
        if (state.mode !== "interactive") return;
        renderAutosuggestions(input.value, list, view);
    });
}

/* =========================
   AUTOSUGGESTIONS
========================= */

function renderAutosuggestions(query, list, view) {
    list.innerHTML = "";
    const q = normalize(query);
    if (!q) return;

    Object.values(state.armyLists)
        .filter(a => normalize(a.name).includes(q))
        .slice(0, 10)
        .forEach(a => {
            const li = document.createElement("li");
            li.textContent = a.name;
            li.onclick = () => {
                list.innerHTML = "";
                renderArmyList(view, a);
            };
            list.appendChild(li);
        });
}

/* =========================
   ARMYLIST RENDERING
========================= */

function renderArmyListById(container, id) {
    const armylist = Object.values(state.armyLists).find(a => a.id === id);
    if (armylist) renderArmyList(container, armylist);
}

function renderArmyList(container, armylist) {
    container.innerHTML = `
        <h3>${armylist.name}</h3>
        <p><strong>Alignment:</strong> ${armylist.alignment}</p>

        <button id="buildArmylistBtn">
            ${t("armylists.build.button")}
        </button>

        ${renderModels(armylist.models)}
    `;

    container.querySelector("#buildArmylistBtn").onclick = () =>
        navigate("armylists", "build", { armylistId: armylist.id });

    container.querySelectorAll(".profile-link").forEach(el => {
        el.onclick = () =>
            navigate("profiles", "search", { profileId: el.dataset.id });
    });
}

/* =========================
   MODELS
========================= */

function renderModels(models = {}) {
    return Object.entries(models).map(([tier, entries]) => `
        <h4>${tier}</h4>
        <ul>
            ${entries.map(p => {
                const id = state.profileByName[p.name];
                return id
                    ? `<li class="profile-link" data-id="${id}">${p.name}</li>`
                    : `<li>${p.name}</li>`;
            }).join("")}
        </ul>
    `).join("");
}

/* =========================
   UTIL
========================= */

function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
