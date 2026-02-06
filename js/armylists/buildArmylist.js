import { Settings } from "../settings.js";
import { loadArmyLists } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */

let state = {
    mode: "interactive",     // interactive = Autosuggestions aktiv, direct = geladene Armylist
    selectedArmylistId: null, // aktuell ausgewählte Armylist
    armyLists: null,          // geladenes JSON
    container: null          // referenz auf container der view
};

/* =========================
   NAVIGATION HOOK
========================= */

export function onArmylistsBuildNavigate(params = {}) {
    if (!params.armylistId) return;
    if (!state.container) return; // Sicherheit

    state.mode = "direct";
    state.selectedArmylistId = params.armylistId;

    const armyListView = state.container.querySelector("#armyListView");
    renderArmyListById(armyListView, params.armylistId);
}

/* =========================
   INIT VIEW
========================= */

export async function initArmylistsBuild(container, params = {}) {
    state.container = container; // container persistent speichern

    container.innerHTML = `
        <div class="armylists-build">
            <h2>${t("armylists.build.title")}</h2>

            <input
                id="armylistSearchInput"
                type="text"
                placeholder=${t("armylists.build.placeholder")}
                autocomplete="off"
            />

            <ul id="autosuggestions" class="autosuggestions"></ul>

            <div id="armyListView"></div>
        </div>
    `;

    // Daten laden, falls noch nicht geschehen
    if (!state.armyLists) {
        state.armyLists = await loadArmyLists(Settings.version);
    }

    const input = container.querySelector("#armylistSearchInput");
    const list = container.querySelector("#autosuggestions");
    const armyListView = container.querySelector("#armyListView");

    // DIRECT LOAD MODE falls params vorhanden
    if (params.armylistId) {
        state.mode = "direct";
        state.selectedArmylistId = params.armylistId;
        renderArmyListById(armyListView, params.armylistId);
        list.innerHTML = "";
    }

    // Input focus → interactive mode
    input.addEventListener("focus", () => {
        state.mode = "interactive";
    });

    // Live search für Autosuggestions
    input.addEventListener("input", () => {
        if (state.mode !== "interactive") return;
        renderAutosuggestions(input.value, list, armyListView);
    });
}

/* =========================
   AUTOSUGGESTIONS
========================= */

function renderAutosuggestions(query, list, armyListView) {
    list.innerHTML = "";

    const q = normalize(query);
    if (!q) return;

    const matches = Object.values(state.armyLists)
        .filter(p => normalize(p.name).includes(q))
        .slice(0, 10);

    matches.forEach(armylist => {
        const li = document.createElement("li");
        li.textContent = armylist.name;

        li.onclick = () => {
            state.mode = "direct";
            state.selectedArmylistId = armylist.id;
            list.innerHTML = "";
            renderArmyList(armyListView, armylist);
        };

        list.appendChild(li);
    });
}

/* =========================
   ARMYLIST RENDERING
========================= */

function renderArmyListById(container, id) {
    const armylist = Object.values(state.armyLists)
        .find(p => p.id === id);
    if (armylist) renderArmyList(container, armylist);
}

function renderArmyList(container, armylist) {
    container.innerHTML = `
        <h3>${armylist.name}</h3>
        <p><strong>Points:</strong> ${armylist.points}</p>
        <p><strong>Alignment:</strong> ${armylist.alignment}</p>
    `;
}

/* =========================
   UTIL
========================= */

function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
