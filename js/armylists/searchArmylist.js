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
    container: null,

    history: [],
    currentArmylistId: null
};


/* =========================
   NAVIGATION HOOK
========================= */

export async function onArmylistsSearchNavigate(params = {}) {

    if (!params.armylistId || !state.container) return;

    if (!state.armyLists) {
        state.armyLists = await loadArmyLists(Settings.version);
    }

    state.mode = "direct";
    loadArmylistById(params.armylistId, { pushHistory: true });
}




/* =========================
   INIT VIEW
========================= */

export async function initArmylistsSearch(container, params = {}) {
    state.container = container;

    container.innerHTML = `
        <div class="armylists-search">
            <div class="armylist-search-wrapper">
                <div class="armylist-search-bar">
                    <input
                        id="armylistSearchInput"
                        type="text"
                        placeholder="${t("armylists.search.placeholder")}"
                        autocomplete="off"
                    />
                    <button id="armylistBackBtn" disabled>←</button>
                    <ul id="autosuggestions" class="armylist-autosuggestions"></ul>
                </div>
            </div>

            <div class="armylist-separator hidden"></div>
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
    const back = container.querySelector("#armylistBackBtn");

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

        state.mode = "direct";
        loadArmylistById(prevId, { pushHistory: false });
    };

    if (params.armylistId) {
        state.mode = "direct";
        loadArmylistById(params.armylistId, { pushHistory: true });
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

    const matches = Object.values(state.armyLists)
        .filter(a => normalize(a.name).includes(q))
        .slice(0, 10);

    if (!matches.length) return;

    matches.forEach(a => {
        const li = document.createElement("li");
        li.textContent = a.name;

        li.onclick = () => {
            state.mode = "direct";
            loadArmylist(a, { pushHistory: true });
        };

        list.appendChild(li);
    });

    list.classList.add("armylist-visible");
}
function loadArmylist(armylist, { pushHistory }) {

    const input = state.container.querySelector("#armylistSearchInput");
    const list = state.container.querySelector("#autosuggestions");
    const view = state.container.querySelector("#armyListView");
    const sep = state.container.querySelector(".armylist-separator");

    state.currentArmylistId = armylist.id;

    if (pushHistory) state.history.push(armylist.id);
    updateBackButton();

    input.value = armylist.name;
    list.innerHTML = "";
    list.classList.remove("armylist-visible");

    sep.classList.remove("hidden");

    renderArmyList(view, armylist);
}
function loadArmylistById(id, options) {
    const armylist = Object.values(state.armyLists)
        .find(a => a.id === id);

    if (armylist) {
        loadArmylist(armylist, options);
    }
}
function updateBackButton() {
    const btn = state.container.querySelector("#armylistBackBtn");
    if (!btn) return;

    btn.disabled = state.history.length <= 1;
}


/* =========================
   ARMYLIST RENDERING
========================= */

function renderArmyList(container, armylist) {

    container.innerHTML = `
        <div class="armylist-header">
            <h1 class="armylist-title">${armylist.name}</h1>
            <button id="buildArmylistBtn">
                ${t("armylists.search.buildButton")}
            </button>
        </div>

        ${renderAdditionalInformationBox(armylist)}

        ${renderTierBox(`${t("armylists.search.heroesofLegend")}`,"Heroes of Legend", armylist.models)}
        ${renderTierBox(`${t("armylists.search.heroesOfValour")}`, "Heroes of Valour", armylist.models)}
        ${renderTierBox(`${t("armylists.search.heroesOfFortitude")}`, "Heroes of Fortitude", armylist.models)}
        ${renderTierBox(`${t("armylists.search.minorHeroes")}`, "Minor Heroes", armylist.models)}
        ${renderTierBox(`${t("armylists.search.independentHeroes")}`, "Independent Heroes", armylist.models)}
        ${renderTierBox(`${t("armylists.search.warriors")}`, "Warriors", armylist.models)}
    `;

    container.querySelector("#buildArmylistBtn").onclick = () =>
        navigate("armylists", "build", { armylistId: armylist.id });

    container.querySelectorAll(".armylist-entry").forEach(el => {
        el.onclick = () =>
            navigate("profiles", "search", { profileId: el.dataset.id });
    });
}

function renderAdditionalInformationBox(armylist) {

    const hasSource = Array.isArray(armylist.source) && armylist.source.length;
    const hasAdditional = Array.isArray(armylist.additionalRules) && armylist.additionalRules.length;
    const hasSpecial = Array.isArray(armylist.specialRules) && armylist.specialRules.length;

    if (!hasSource && !hasAdditional && !hasSpecial) return "";

    return `
        <details class="armylist-box">
            <summary>Additional Information</summary>
            <div class="armylist-box-content">

                ${hasSource ? `
                    <h4 class="armylist-information-title">${t("armylists.search.sources")}</h4>
                    <ul class="armylist-information-list">
                        ${armylist.source.map(src =>
                            `<li>${src.book} (${t("armylists.search.page")} ${src.page})</li>`
                        ).join("")}
                    </ul>
                            <br></br>
                ` : ""}

                ${hasAdditional ? `
                    <h4 class="armylist-information-title">${t("armylists.search.additionalRules")}</h4>
                    <ul class="armylist-information-list">
                        ${armylist.additionalRules
                            .map(r => `<li>${r}</li>`)
                            .join("")}
                    </ul>
                            <br></br>
                ` : ""}

                ${hasSpecial ? `
                    <h4 class="armylist-information-title">${t("armylists.search.specialRules")}</h4>
                    <ul class="armylist-information-list">
                        ${armylist.specialRules.map(rule => `
                            <li>
                                <strong>${rule.name}</strong><br>
                                ${rule.description}
                            </li>
                            <br></br>
                        `).join("")}
                    </ul>
                ` : ""}

            </div>
        </details>
    `;
}

function renderTierBox(tierName, tierKey, models = {}) {

    const entries = models?.[tierKey];
    if (!entries?.length) return "";

    return `
        <details class="armylist-box">
            <summary>${tierName}</summary>
            <div class="armylist-box-content">
                ${entries.map(model => renderModelEntry(model)).join("")}
            </div>
        </details>
    `;
}

/* =========================
   MODELS
========================= */

function renderModelEntry(model) {

    const id = state.profileByName?.[model.name];

    return `
        <div class="armylist-entry">

            <div class="armylist-entry-main-row">
                <div class="armylist-entry-bullet">•</div>

                <div class="armylist-entry-main-content">

                    ${
                        id
                            ? `<span class="armylist-entry-name armylist-entry-link" data-id="${id}">
                                   ${model.name}
                               </span>`
                            : `<span class="armylist-entry-name">${model.name}</span>`
                    }

                    <span class="armylist-entry-points">
                        ${addPoints(model.points)}
                    </span>

                </div>
            </div>

            ${renderMandatoryOptions(model.mandatoryWargear)}
            ${renderOptionalOptions(model.optionalOptions)}

        </div>
    `;
}

function renderMandatoryOptions(wargearArray) {

    if (!Array.isArray(wargearArray) || wargearArray.length === 0) return "";

    const formatted = formatMandatoryWargear(wargearArray);

    return `
        <div class="armylist-mandatory-options">
            <div class="armylist-mandatory-row">
                ${formatted}
            </div>
        </div>
    `;
}


function formatMandatoryWargear(items) {

    if (items.length === 1) return `with ${items[0]}`;
    if (items.length === 2) return `with ${items[0]} and ${items[1]}`;

    return `with ${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}


function renderOptionalOptions(options) {

    if (!options?.length) return "";

    return `
        <div class="armylist-optional-options">
            ${options.map(o => `
                <div class="armylist-option-row">
                    <span class="armylist-option-name">${o.name}</span>
                    <span class="armylist-option-cost">${addPoints(o.cost)}</span>
                </div>
            `).join("")}
        </div>
    `;
}



/* =========================
   UTIL
========================= */

function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function addPoints(rawCost) {

    if (rawCost === undefined || rawCost === null || rawCost === "") {
        return "";
    }

    const numericValue = Number(rawCost);

    if (Number.isNaN(numericValue)) {
        return rawCost;
    }

    if (numericValue === 1) {
        return `${numericValue} ${t("armylists.search.point")}`;
    }

    return `${numericValue} ${t("armylists.search.points")}`;
}
