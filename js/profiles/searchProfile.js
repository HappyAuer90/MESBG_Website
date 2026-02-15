import { navigate } from "../main.js";
import { Settings } from "../settings.js";
import { loadProfiles, loadArmyLists, loadDefinitions } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */

const state = {
    profiles: null,
    armyLists: null,
    container: null,
    definitions: null,

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
    state.container.addEventListener("click", e => {
        const target = e.target.closest(".clickable-entry");
        if (!target) return;

        const id = target.dataset.id;
        if (!id) return;

        const profile = getProfileById(id);
        if (!profile) return;

        state.mode = "direct";
        loadProfile(profile, { pushHistory: true });
    });

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
    if (!state.definitions) {
        state.definitions = await loadDefinitions(Settings.version);
    }

    const input = container.querySelector("#profileSearchInput");
    const list = container.querySelector("#autosuggestions");
    const back = container.querySelector("#profileBackBtn");

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
    const list = state.container.querySelector("#autosuggestions");
    const view = state.container.querySelector("#profileView");
    const sep = state.container.querySelector(".profile-separator");

    state.currentProfileId = profile.id;

    if (pushHistory) state.history.push(profile.id);
    updateBackButton();

    input.value = profile.name;
    list.innerHTML = "";
    list.classList.remove("visible");

    sep.classList.remove("hidden");

    view.innerHTML = "";
    renderProfile(view, profile);

    if (profile.composition) {
        renderComposition(view, profile);
    }

    state.container.querySelectorAll(".armylist-link").forEach(el => {
    el.onclick = () => {
        navigate("armylists", "search", {
            armylistId: el.dataset.id
        });
    };
});

}

/* =========================
   PROFILE RENDERING
========================= */

function renderProfile(container, profile) {

    container.insertAdjacentHTML("beforeend", `
        <div class="profile-header">
            <h2 class="profile-title">${profile.name}</h2>
            <h2 class="profile-points">
                ${addPoints(profile.points)}
            </h2>
        </div>
    `);

    container.insertAdjacentHTML("beforeend", renderCharacteristicsBlock(profile));


    const BOX_CONFIG = [
        { title: `${t("profiles.search.wargear")}`, key: "wargear", mode: "default" },
        { title: `${t("profiles.search.heroicActions")}`, key: "heroicActions", mode: "default" },
        { title: `${t("profiles.search.options")}`, key: "options", mode: "options" },
        { title: `${t("profiles.search.specialRules")}`, key: "specialRules", mode: "default" },
        { title: `${t("profiles.search.magicalPowers")}`, key: "magicalPowers", mode: "magic" }
    ];

    BOX_CONFIG.forEach(config => {
        const entries = profile[config.key] || [];

        if (!entries.length) return;

        container.insertAdjacentHTML("beforeend", renderTwoPaneBox(config.title));

        const boxId = `box-${config.title.replace(/\s+/g, "-").toLowerCase()}`;

        initTwoPaneBox(boxId, entries, config.mode, profile);
    });
    container.insertAdjacentHTML("beforeend", renderAdditionalInformations(profile));
}

/* =========================
   RENDER COMPOSITION
========================= */

function renderComposition(container, profile) {
    container.insertAdjacentHTML("beforeend", `<div class="double-separator"></div>`);

    profile.composition.forEach(name => {
        const sub = Object.values(state.profiles)
            .find(p => p.name === name);
        if (sub) renderProfile(container, sub);
    });
}

/* =========================
CHARACTERISTICS
========================= */

function renderCharacteristicsBlock(profile) {
    let mainTable = "";
    let heroTable = "";
    let siegeTable = "";
    let metaTable = "";


    if (profile.characteristics) {
        mainTable = renderCharacteristicsTable(profile.characteristics, {
            move: `${t("profiles.search.move")}`,
            fightValue: `${t("profiles.search.fightValue")}`,
            shootValue: `${t("profiles.search.shootValue")}`,
            strength: `${t("profiles.search.strength")}`,
            defence: `${t("profiles.search.defence")}`,
            attacks: `${t("profiles.search.attacks")}`,
            wounds: `${t("profiles.search.wounds")}`,
            courage: `${t("profiles.search.courage")}`,
            intelligence: `${t("profiles.search.intelligence")}`
        }).replace(
            'class="profile-table"',
            'class="profile-table table-main"'
        );
    }

    if (profile.characteristicsHero) {
        heroTable = renderCharacteristicsTable(profile.characteristicsHero, {
            might: `${t("profiles.search.might")}`,
            will: `${t("profiles.search.will")}`,
            fate: `${t("profiles.search.fate")}`
        }).replace(
            'class="profile-table"',
            'class="profile-table table-hero"'
        );
    }

    if (profile.characteristicsSiegeEngine) {
        siegeTable = renderCharacteristicsTable(profile.characteristicsSiegeEngine, {
            range: `${t("profiles.search.range")}`,
            strength: `${t("profiles.search.strength")}`,
            defence: `${t("profiles.search.defence")}`,
            wounds: `${t("profiles.search.wounds")}`
        }).replace(
            'class="profile-table"',
            'class="profile-table half-width"'
        );
    }

    metaTable = renderMetaTable(profile)?.replace(
        'class="profile-table"',
        'class="profile-table half-width meta-table"'
    );
    if (!mainTable && !heroTable && !siegeTable && !metaTable) {
        return "";
    }

    return `
<details class="profile-box">
    <summary>${t("profiles.search.characteristics")}</summary>
    <div class="box-content">

        <div class="stats-row ${mainTable && heroTable ? "grid-13" : ""}">

            ${mainTable}
            ${heroTable}
        </div>

        ${siegeTable}
        ${metaTable}

    </div>
</details>
`;

}
function renderCharacteristicsTable(data, labelMap) {
    const keys = Object.keys(labelMap).filter(k => data[k] !== undefined);
    if (keys.length === 0) return "";

    const headerRow = keys.map(k => `<th>${labelMap[k]}</th>`).join("");
    const valueRow = keys.map(k => `<td>${data[k]}</td>`).join("");

    return `
        <table class="profile-table">
            <tr>${headerRow}</tr>
            <tr>${valueRow}</tr>
        </table>
    `;
}
function renderMetaTable(profile) {
    const columns = [];

    if (profile.race && profile.race.length) {
        columns.push({ label: `${t("profiles.search.race")}`, value: profile.race.join(", ") });
    }

    if (profile.faction && profile.faction.length) {
        columns.push({ label: `${t("profiles.search.faction")}`, value: profile.faction.join(", ") });
    }

    if (profile.unitTypes && profile.unitTypes.length) {
        columns.push({ label: `${t("profiles.search.unitType")}`, value: profile.unitTypes.join(", ") });
    }

    if (profile.baseSize) {
        columns.push({ label: `${t("profiles.search.baseSize")}`, value: profile.baseSize });
    }

    if (columns.length === 0) return "";

    const headerRow = columns.map(c => `<th>${c.label}</th>`).join("");
    const valueRow = columns.map(c => `<td>${c.value}</td>`).join("");

    return `
        <table class="profile-table">
            <tr>${headerRow}</tr>
            <tr>${valueRow}</tr>
        </table>
    `;
}

/* =========================
   TWO PANE SYSTEM - LEFT
========================= */

function renderTwoPaneBox(title) {
    const boxId = `box-${title.replace(/\s+/g, "-").toLowerCase()}`;

    return `
        <details class="profile-box" id="${boxId}">
            <summary>${title}</summary>
            <div class="two-pane">
                <div class="left"></div>
                <div class="right">${t("profiles.search.selectEntry")}</div>
            </div>
        </details>
    `;
}
function initTwoPaneBox(boxId, entries, mode, profile) {

    const box = state.container.querySelector(`#${boxId}`);
    if (!box) return;

    const left = box.querySelector(".left");
    const right = box.querySelector(".right");

    left.innerHTML = "";
    right.innerHTML = `${t("profiles.search.selectEntry")}`;

    const renderer = ENTRY_RENDERERS[mode] || ENTRY_RENDERERS.default;

    renderer(left, right, entries, profile);
}
const ENTRY_RENDERERS = {
    default: renderDefaultList,
    options: renderOptionsList,
    magic: renderMagicTable
};
function renderDefaultList(left, right, entries, profile) {

    entries.forEach(entry => {

        const name = typeof entry === "string" ? entry : entry.name;

        const row = document.createElement("div");
        row.className = "entry-row";

        const bullet = document.createElement("span");
        bullet.className = "entry-bullet";
        bullet.textContent = "•";

        const text = document.createElement("span");
        text.className = "clickable-entry";
        text.textContent = name;

        text.onclick = () => handleEntryClick(name, right, profile);

        row.appendChild(bullet);
        row.appendChild(text);

        left.appendChild(row);
    });
}
function renderOptionsList(left, right, entries, profile) {

    if (!entries || !entries.length) return;

    // 1. OPTIONAL_RULES zuerst extrahieren
    const optionalRules = entries.filter(e => e.type === "OPTIONAL_RULES");
    const warriorOptionals = entries.filter(e => e.type === "WARRIOR_OPTIONAL");
    const warriorMandatory = entries.filter(e => e.type === "WARRIOR_MANDATORY");
    const otherOptions = entries.filter(e =>
        e.type !== "OPTIONAL_RULES"
    );

    /* =========================
       OPTIONAL RULES (oben, normaler Text)
    ========================== */

    optionalRules.forEach(rule => {
        const p = document.createElement("p");
        p.textContent = rule.name;
        p.className = "option-rule-text";
        left.appendChild(p);
    });

    /* =========================
       WARRIOR ENTRY
    ========================== */

    if (warriorOptionals.length) {
        const header = document.createElement("div");
        header.textContent = `${addArticle(profile.name, profile.unitTypes, true)} ${t("profiles.search.warriorOptionals")}`;
        header.className = "option-rule-text";
        left.appendChild(header);
    }

    if (warriorMandatory.length) {
        const header = document.createElement("div");
        header.textContent = `${addArticle(profile.name, profile.unitTypes, true)} ${t("profiles.search.warriorMandatory")}`;
        header.className = "option-rule-text";
        left.appendChild(header);
    }

    /* =========================
       BULLET LIST (alle außer OPTIONAL_RULES)
    ========================== */

    otherOptions.forEach(option => {

        if (option.type === "OPTIONAL_RULES") return;

        const row = document.createElement("div");
        row.className = "entry-row option-row";

        const bullet = document.createElement("span");
        bullet.className = "entry-bullet";
        bullet.textContent = "•";

        const name = document.createElement("span");
        name.textContent = option.name;
        name.className = "clickable-entry option-name";

        name.onclick = () => handleEntryClick(option.name, right, profile);

        const cost = document.createElement("span");
        cost.textContent = addPoints(option.cost);
        cost.className = "option-cost";

        row.appendChild(bullet);
        row.appendChild(name);
        row.appendChild(cost);

        left.appendChild(row);
    });
}
function renderMagicTable(left, right, entries, profile) {

    const table = document.createElement("table");
    table.className = "magic-table-full";

    table.innerHTML = `
        <thead>
            <tr>
                <th>${t("profiles.search.magicalPowers")}</th>
                <th>${t("profiles.search.range")}</th>
                <th>${t("profiles.search.castingValue")}</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    entries.forEach(power => {

        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        const rangeCell = document.createElement("td");
        const castCell = document.createElement("td");

        const name = document.createElement("span");
        name.textContent = power.name;
        name.className = "magic-name clickable-entry";

        name.onclick = () => handleEntryClick(power.name, right, profile);

        nameCell.appendChild(name);
        rangeCell.textContent = power.range || "-";
        castCell.textContent = power.castingValue || "-";

        row.appendChild(nameCell);
        row.appendChild(rangeCell);
        row.appendChild(castCell);

        tbody.appendChild(row);
    });

    left.appendChild(table);
}
const rightPanelState = new WeakMap();
function handleEntryClick(name, rightPanel, profile) {

    const result = findDefinition(name);
    if (!result) {
        rightPanel.innerHTML = `<p>No definition found.</p>`;
        return;
    }

    initRightPanelState(rightPanel);

    if (result.type === "definition") {
        pushRightPanelState(rightPanel, {
            type: "definition",
            data: result.data,
            profile
        });

        renderRightPanel(rightPanel);
    }

    if (result.type === "profile") {
        loadProfile(result.data, { pushHistory: true });
    }
}

/* =========================
   TWO PANE SYSTEM - RIGHT
========================= */

function findDefinition(entryName) {

    if (!entryName) return null;

// 1. EntryName bereinigen (Entfernt nur runde Klammern + Inhalt)
    const cleanedName = entryName.replace(/\s*\([^)]*\)/g, "").trim();

// 2) DEFINITIONS – Dictionary Key (exakt)
    if (state.definitions[cleanedName]) {
        return {
            type: "definition",
            data: state.definitions[cleanedName]
        };
    }

// 3) DEFINITIONS – Alias
    for (const [key, def] of Object.entries(state.definitions)) {

        if (!def.alias) continue;

        if (def.alias.includes(cleanedName)) {
            return {
                type: "definition",
                data: def
            };
        }
    }

//4) PROFILES – Dictionary Key
    if (state.profiles[cleanedName]) {
        return {
            type: "profile",
            data: state.profiles[cleanedName]
        };
    }

//5)PROFILES – Alias
    for (const [key, profile] of Object.entries(state.profiles)) {

        if (!profile.alias) continue;

        if (profile.alias.includes(cleanedName)) {
            return {
                type: "profile",
                data: profile
            };
        }
    }

    return null;
}
function initRightPanelState(panel) {
    if (!rightPanelState.has(panel)) {
        rightPanelState.set(panel, {
            history: [],
            index: -1
        });
    }
}
function pushRightPanelState(panel, entry) {
    const state = rightPanelState.get(panel);

    state.history = state.history.slice(0, state.index + 1);
    state.history.push(entry);
    state.index++;

    rightPanelState.set(panel, state);
}
function renderRightPanel(panel) {

    const state = rightPanelState.get(panel);
    const current = state.history[state.index];

    if (!current) return;

    const def = current.data;

    panel.innerHTML = `
    <div class="definition-header">
        <h3 class="definition-title">${def.name}</h3>
        <div class="definition-toolbar">
            <button class="def-back">←</button>
            <button class="def-forward">→</button>
            <button class="def-close">✕</button>
        </div>
    </div>
    ${def.status || def.duration || def.phase ? `
        <p class="definition-meta">
            ${def.status ? `<span>${def.status}</span>` : ""}
            ${def.duration ? `<span>${def.duration}</span>` : ""}
            ${def.phase ? `<span>${def.phase}</span>` : ""}
        </p>` : ""}
    <p class="definition-text"></p>
`;

renderDefinitionText(def.description, panel, current.profile);

    bindToolbar(panel);
}
function bindToolbar(panel) {

    const state = rightPanelState.get(panel);

    panel.querySelector(".def-back").onclick = () => {
        if (state.index > 0) {
            state.index--;
            renderRightPanel(panel);
        }
    };

    panel.querySelector(".def-forward").onclick = () => {
        if (state.index < state.history.length - 1) {
            state.index++;
            renderRightPanel(panel);
        }
    };

    panel.querySelector(".def-close").onclick = () => {
        panel.innerHTML = `${t("profiles.search.selectEntry")}`;
        rightPanelState.delete(panel);
    };
}
function buildReferenceList(def) {

    const refs = [];

    if (Settings.profileSettings.enableRulesLink && def.linkedRules) {
        def.linkedRules.forEach(r => refs.push({ type: "definition", raw: r }));
    }

    if (Settings.profileSettings.enableDetailsLink && def.linkedDetails) {
        def.linkedDetails.forEach(r => refs.push({ type: "definition", raw: r }));
    }

    if (Settings.profileSettings.enableProfilesLink && def.linkedProfiles) {
        def.linkedProfiles.forEach(r => refs.push({ type: "profile", raw: r }));
    }

    return refs
        .map(ref => {
            const [text, target] = ref.raw.split("|");
            return {
                display: text.trim(),
                target: (target || text).trim(),
                type: ref.type
            };
        })
        .sort((a, b) => b.display.length - a.display.length);
}
function renderDefinitionText(text, panel, profile) {

    if (!text) return;

    const state = rightPanelState.get(panel);
    const current = state.history[state.index];

    let html = formatText(text)
        .replace("{Character}", addArticle(profile.name, profile.unitTypes, true))
        .replace("{character}", addArticle(profile.name, profile.unitTypes, false));

    const protectedTokens = [];

    if (current.data.excludeFromLinking?.length) {

        current.data.excludeFromLinking.forEach((phrase, index) => {

            const cleanPhrase = phrase.trim();
            const token = `__PROTECTED_${index}__`;

            const escaped = cleanPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, "g");

            html = html.replace(regex, token);

            protectedTokens.push({
                token,
                value: cleanPhrase
            });
        });
    }

    const refs = buildReferenceList(current.data);

    refs.forEach(ref => {

        if (current.data.excludeFromLinking?.includes(ref.display)) return;

        const escaped = ref.display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regex = new RegExp(`\\b${escaped}\\b`, "g");

html = html.replace(regex, match => {
    return `<span class="definition-link"
                data-target="${ref.target}"
                data-type="${ref.type}">
                ${match}
            </span>`;
});


    });

    protectedTokens.forEach(entry => {
        html = html.replaceAll(entry.token, entry.value);
    });

    const container = panel.querySelector(".definition-text");
    container.innerHTML = html;

    container.querySelectorAll(".definition-link").forEach(el => {

        el.onclick = () => {

            if (el.dataset.type === "definition") {
                handleEntryClick(el.dataset.target, panel, profile);
            }

            if (el.dataset.type === "profile") {
                const result = findDefinition(el.dataset.target);
                if (result?.type === "profile") {
                    loadProfile(result.data, { pushHistory: true });
                }
            }
        };
    });
}

/* =========================
   ADDITIONAL INFORMATION
========================= */

function renderAdditionalInformations(profile) {

    const notes = renderNotes(profile);
    const gwFaq = renderGWFAQNotes(profile);
    const sources = renderSources(profile);
    const armyLists = renderArmyListReferences(profile);
    const linkedCompositions = renderLinkedCompositions(profile);
    const linkedProfiles = renderLinkedProfiles(profile);
    const linkedEliteModels = renderLinkedEliteModels(profile);
    const linkedEliteTargets = renderLinkedLeaders(profile);
    const linkedRiders = renderLinkedRiders(profile);

    const content =
        notes +
        gwFaq +
        sources +
        armyLists +
        linkedCompositions +
        linkedProfiles +
        linkedEliteModels +
        linkedEliteTargets +
        linkedRiders;

    if (!content.trim()) return "";

    return `
        <details class="profile-box">
            <summary>${t("profiles.search.additionalInformations")}</summary>
            <div class="box-content">
                ${content}
            </div>
        </details>
    `;
}
function renderNotes(profile) {
    if (!profile.notes) return "";

    return `
        <div class="additional-block">
            <h4>${t("profiles.search.notes")}</h4>
            <p>${formatText(profile.notes)}</p>
        </div>
    `;
}
function renderGWFAQNotes(profile) {
    if (!Settings.profileSettings.showGWFAQNotes) return "";
    if (!profile.noteGWFAQ) return "";

    return `
        <div class="additional-block">
            <h4>${t("profiles.search.gwFAQNotes")}</h4>
            <p>${formatText(profile.noteGWFAQ)}</p>
        </div>
    `;
}
function renderSources(profile) {

    if (!profile.source || !profile.source.length) return "";

    const items = profile.source.map(src =>
        `<li>${src.book} (page ${src.page})</li>`
    ).join("");

    return `
        <div class="additional-block">
            <h4 class="additional-list-title">${t("profiles.search.sources")}</h4>
            <ul class="additional-list">
                ${items}
            </ul>
        </div>
    `;
}
function renderArmyListReferences(profile) {

    if (!state.armyLists) return "";

    const searchNames = new Set();
    const matches = new Map(); // dedupe via list.id

    /* =========================
       1) Basisname
    ========================== */

    searchNames.add(profile.name);

    /* =========================
       2) Linked Profiles
    ========================== */

    if (profile.linkedProfile) {
        profile.linkedProfile.forEach(name => {
            searchNames.add(name);
        });
    }

    /* =========================
       3) Composition-Suche
       -> Welche Profiles enthalten dieses Profil in ihrer composition?
    ========================== */

    Object.values(state.profiles).forEach(p => {
        if (!p.composition) return;

        if (p.composition.includes(profile.name)) {
            searchNames.add(p.name);
        }
    });

    /* =========================
       4) Armylisten durchsuchen
    ========================== */

    Object.values(state.armyLists).forEach(list => {

        if (!list.models) return;

        Object.entries(list.models).forEach(([category, entries]) => {

            entries.forEach(entry => {

                if (searchNames.has(entry.name)) {

                    if (!matches.has(list.id)) {
                        matches.set(list.id, {
                            id: list.id,
                            listName: list.name,
                            category: category
                                .replace("Heroes", "Hero")
                                .replace("Warriors", "Warrior")
                        });
                    }

                }

            });

        });

    });

    if (!matches.size) return "";

    const items = Array.from(matches.values())
        .map(m =>
            `<li class="armylist-link" data-id="${m.id}">
                ${m.listName} (${m.category})
             </li>`
        )
        .join("");

    return `
        <div class="additional-block">
            <h4 class="additional-list-title"> ${t("profiles.search.armyLists")}</h4>
            <ul class="linked-armylists"">
                ${items}
            </ul>
        </div>
    `;
}


function renderLinkedCompositions(profile) {

    const matches = [];

    Object.values(state.profiles).forEach(p => {
        if (!p.composition) return;

        if (p.composition.includes(profile.name)) {
            matches.push(p);
        }
    });

    if (!matches.length) return "";

    const items = matches.map(p =>
        `<li class="clickable-entry" data-id="${p.id}">${p.name}</li>`
    ).join("");

    return `
        <div class="additional-block">
            <h4 class="additional-list-title">${t("profiles.search.linkedCompositions")}</h4>
            <ul class="additional-list linked-list">
                ${items}
            </ul>
        </div>
    `;
}
function renderLinkedProfiles(profile) {

    if (!profile.linkedProfile) return "";

    const matches = profile.linkedProfile
        .map(name => Object.values(state.profiles).find(p => p.name === name))
        .filter(Boolean);

    if (!matches.length) return "";

    const items = matches.map(p =>
        `<li class="clickable-entry" data-id="${p.id}">${p.name}</li>`
    ).join("");

    return `
        <div class="additional-block">
            <h4 class="additional-list-title">${t("profiles.search.linkedProfiles")}</h4>
            <ul class="additional-list linked-list">
                ${items}
            </ul>
        </div>
    `;
}
function renderLinkedLeaders(profile) {

    if (!profile.unitTypes || !profile.unitTypes.includes("Elite")) return "";

    const matches = [];

    Object.values(state.profiles).forEach(p => {

        if (!p.specialRules) return;

        p.specialRules.forEach(rule => {
            const match = rule.match(/^Leader\s*\(([^)]+)\)/);
            if (!match) return;

            if (match[1] === profile.name) {
                matches.push(p);
            }
        });
    });

    if (!matches.length) return "";

    const items = matches.map(p =>
        `<li class="clickable-entry" data-id="${p.id}">${p.name}</li>`
    ).join("");

    return `
        <div class="additional-block">
            <h4 class="additional-list-title">${t("profiles.search.linkedLeaders")}</h4>
            <ul class="additional-list linked-list">
                ${items}
            </ul>
        </div>
    `;
}
function renderLinkedEliteModels(profile) {

    if (!profile.specialRules) return "";

    const targets = [];

    profile.specialRules.forEach(rule => {
        const match = rule.match(/^Leader\s*\(([^)]+)\)/);
        if (!match) return;

        const eliteName = match[1];

        const elite = Object.values(state.profiles)
            .find(p => p.name === eliteName);

        if (elite) targets.push(elite);
    });

    if (!targets.length) return "";

    const items = targets.map(p =>
        `<li class="clickable-entry" data-id="${p.id}">${p.name}</li>`
    ).join("");

    return `
        <div class="additional-block">
            <h4 class="additional-list-title">${t("profiles.search.linkedEliteModels")}</h4>
            <ul class="additional-list linked-list">
                ${items}
            </ul>
        </div>
    `;
}
function renderLinkedRiders(profile) {

    if (!profile.unitTypes || !profile.unitTypes.includes("Mount")) return "";

    const matches = [];

    Object.values(state.profiles).forEach(p => {

        // wargear
        if (p.wargear) {
            p.wargear.forEach(w => {
                if (w.name.includes(profile.name)) {
                    matches.push(p);
                }
            });
        }

        // options
        if (p.options) {
            p.options.forEach(o => {
                if (o.name.includes(profile.name)) {
                    matches.push(p);
                }
                if (o.name.includes("and " + profile.name.toLowerCase())) {
                    matches.push(p);
                }
            });
        }

    });

    if (!matches.length) return "";

    const items = matches.map(p =>
        `<li class="clickable-entry" data-id="${p.id}">${p.name}</li>`
    ).join("");

    return `
        <div class="additional-block">
            <h4 class="additional-list-title">${t("profiles.search.linkedRiders")}</h4>
            <ul class="additional-list linked-list">
                ${items}
            </ul>
        </div>
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
function formatText(text) {
    if (!text) return "";
    return text
        .replace(/\n/g, "<br>")
        .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
}
function addArticle(name, type, capital) {

    if (name === undefined || name === null || name === "" || type === undefined || type === null || type === "") {
        return "";
    }

    if (type.includes("Unique")) {
        return name;
    }
    if (capital) {
        if (/^[aeiou]/i.test(name)) {
            return `An ${name}`;
        }
        else {
            return `A ${name}`;
        }}
    if (!capital) {
        if (/^[aeiou]/i.test(name)) {
            return `an ${name}`;
        }
        else {
            return `a ${name}`;
        }}
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
        return `${numericValue} ${t("profiles.search.point")}`;
    }

    return `${numericValue} ${t("profiles.search.points")}`;
}
