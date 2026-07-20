import { Settings } from "../settings.js";
import { loadArmyLists, loadDefinitions, loadProfiles } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */
const state = {
    definitions: null,
    profiles: null,
    profileByName: null,
    armyLists: null
};

const rightPanelState = new WeakMap();

const typeLabels = {
    armyrule: "Army Rule",
    heroicaction: "Heroic Action",
    magicalpower: "Magical Power",
    rule: "Rule",
    specialrule: "Special Rule",
    wargear: "Wargear"
};
/* =========================
   INIT
========================= */

export async function initRulesAll(container) {

    state.definitions = await loadDefinitions(Settings.version);

    if (!state.profiles) {
        state.profiles = await loadProfiles(Settings.version);
        state.profileByName = {};
        Object.values(state.profiles).forEach(p => {
            state.profileByName[p.name] = p.id;
        });
    }

    if (!state.armyLists) {
        state.armyLists = await loadArmyLists(Settings.version);
    }

    const entries = Object.entries(state.definitions);

    const types = [...new Set(entries.map(([_, def]) => def.type))]
        .sort((a, b) => a.localeCompare(b));

    container.innerHTML = `
        <div class="rules-all">
            <div class="rules-filter" id="rulesFilter"></div>

            <div class="rules-layout">
                <div class="rules-list">
                    <ul id="rulesList"></ul>
                </div>

                <div class="rules-detail">
                    <div id="rulesDetailContent">
                    </div>
                </div>
            </div>
        </div>
    `;

    const filterContainer = container.querySelector("#rulesFilter");
    const listEl = container.querySelector("#rulesList");
    const detailEl = container.querySelector("#rulesDetailContent");

    /* =========================
       CHECKBOXES
    ========================= */

    types.forEach(type => {
        const label = document.createElement("label");
        label.className = "rules-checkbox";
        label.innerHTML = `
        <input type="checkbox" value="${type}" checked />
        ${typeLabels[type] || type} 
    `;
        filterContainer.appendChild(label);
    });

    /* =========================
       LIST RENDER
    ========================== */

    function renderList() {

        const activeTypes = [...filterContainer.querySelectorAll("input:checked")]
            .map(cb => cb.value);

        listEl.innerHTML = "";

        entries.forEach(([key, def]) => {

            if (!activeTypes.includes(def.type)) return;

            const li = document.createElement("li");
            li.textContent = def.name;
            li.dataset.key = key;

            li.onclick = () => {
                setActiveListItem(li);
                openDefinition(def, detailEl);
            };

            listEl.appendChild(li);
        });
    }

    function setActiveListItem(activeEl) {
        [...listEl.children].forEach(li => li.classList.remove("active"));
        activeEl.classList.add("active");
    }

    filterContainer.addEventListener("change", renderList);
    renderList();
}

/* =========================
   OPEN DEFINITION
========================= */

function openDefinition(def, panel) {

    initRightPanelState(panel);

    pushRightPanelState(panel, { data: def });

    renderRightPanel(panel);
}

/* =========================
   RIGHT PANEL STATE
========================= */

function initRightPanelState(panel) {
    if (!rightPanelState.has(panel)) {
        rightPanelState.set(panel, { history: [], index: -1 });
    }
}

function pushRightPanelState(panel, entry) {

    const s = rightPanelState.get(panel);

    s.history = s.history.slice(0, s.index + 1);
    s.history.push(entry);
    s.index++;

    rightPanelState.set(panel, s);
}

function renderRightPanel(panel) {

    const s = rightPanelState.get(panel);
    const current = s.history[s.index];
    if (!current) return;

    const def = current.data;
    const ownerSections = buildOwnershipSections(def);

    panel.innerHTML = `
        <div class="rules-definition-header">
            <h2 class="rules-definition-title">${def.name}</h2>
            <div class="rules-definition-toolbar">
                <button class="def-back">←</button>
                <button class="def-forward">→</button>
                <button class="def-close">✕</button>
            </div>
        </div>

        ${renderMeta(def)}

        <div class="rules-definition-block">
            <p class="rules-definition-text"></p>
        </div>

        ${Settings.profileSettings.showGWFAQNotes && def.descriptionGWFAQ
            ? `
                <div class="definition-block gwfaq-block">
                    <h4>${t("rules.manual.gwFaq")}</h4>
                    <p class="definition-text-gwfaq"></p>
                </div>
                `
            : ""
        }

        ${renderOwnershipBlock(ownerSections)}
    `;

    renderDefinitionText(
        def.description,
        panel.querySelector(".rules-definition-text"),
        def,
        panel
    );

    if (Settings.profileSettings.showGWFAQNotes && def.descriptionGWFAQ) {
        renderDefinitionText(
            def.descriptionGWFAQ,
            panel.querySelector(".definition-text-gwfaq"),
            def,
            panel
        );
    }

    bindOwnershipLinks(panel);
    bindToolbar(panel);
}

function renderOwnershipBlock(sections) {
    if (!sections.length) return "";

    const renderedSections = sections.map(section => `
        <div class="rules-ownership-section">
            <h4>${section.title}</h4>
            <ul class="rules-ownership-list">
                ${section.items.map(item => `
                    <li>
                        <button
                            type="button"
                            class="rules-owner-link"
                            data-kind="${item.kind}"
                            data-id="${item.id}"
                        >${item.name}</button>
                    </li>
                `).join("")}
            </ul>
        </div>
    `).join("");

    return `
        <div class="rules-definition-block rules-ownership-block">
            <div class="rules-ownership-separator"></div>
            <h3 class="rules-ownership-title">${t("rules.all.usedBy")}</h3>
            ${renderedSections}
        </div>
    `;
}

function bindOwnershipLinks(panel) {
    panel.querySelectorAll(".rules-owner-link").forEach(el => {
        el.onclick = () => {
            const kind = el.dataset.kind;
            const id = el.dataset.id;

            if (kind === "profile" && id) {
                navigate("profiles", "search", { profileId: id });
                return;
            }

            if (kind === "armylist" && id) {
                navigate("armylists", "search", { armylistId: id });
            }
        };
    });
}

function renderMeta(def) {

    if (!def.status && !def.phase && !def.duration) return "";

    return `
        <div class="rules-definition-meta">
            ${def.status ? `<span>${def.status}</span>` : ""}
            ${def.phase ? `<span>${def.phase}</span>` : ""}
            ${def.duration ? `<span>${def.duration}</span>` : ""}
        </div>
    `;
}

function bindToolbar(panel) {

    const s = rightPanelState.get(panel);

    panel.querySelector(".def-back").onclick = () => {
        if (s.index > 0) {
            s.index--;
            renderRightPanel(panel);
        }
    };

    panel.querySelector(".def-forward").onclick = () => {
        if (s.index < s.history.length - 1) {
            s.index++;
            renderRightPanel(panel);
        }
    };

    panel.querySelector(".def-close").onclick = () => {
        rightPanelState.delete(panel);
    };
}

/* =========================
   DEFINITION TEXT RENDER
========================= */

function renderDefinitionText(text, container, def, panel) {
    if (!text) return;

    let html = formatText(text)
        .replace(/\{Character\}/g, t("rules.all.Character"))
        .replace(/\{character\}/g, t("rules.all.character"));

    const protectedTokens = [];

    if (def.excludeFromLinking?.length) {
        def.excludeFromLinking.forEach((phrase, i) => {
            const token = `__PROTECTED_${i}__`;
            const escaped = escapeRegex(phrase.trim());

            html = html.replace(new RegExp(`\\b${escaped}\\b`, "g"), token);
            protectedTokens.push({ token, value: phrase.trim() });
        });
    }

    let refs = buildReferenceList(def);
    refs = refs.sort((a, b) => b.display.length - a.display.length);

    refs.forEach((ref, i) => {
        if (def.excludeFromLinking?.includes(ref.display)) return;

        const escaped = escapeRegex(ref.display);
        const token = `__LINK_${i}__`;

        html = html.replace(new RegExp(`\\b${escaped}\\b`, "g"), token);

        protectedTokens.push({
            token,
            value: `<span class="rules-definition-link" data-target="${ref.target}" data-type="${ref.type}">${ref.display}</span>`
        });
    });

    protectedTokens.forEach(entry => {
        html = html.replaceAll(entry.token, entry.value);
    });

    container.innerHTML = html;

    container.querySelectorAll(".rules-definition-link").forEach(el => {
        el.onclick = () => {
            const target = el.dataset.target;
            const type = el.dataset.type;

            if (type === "profile") {
                const profile = findProfile(target);
                if (profile) {
                    const profileId = profile.id || state.profileByName?.[profile.name];
                    if (profileId) {
                        navigate("profiles", "search", { profileId });
                    }
                }
                return;
            }

            const definition = findDefinition(target);
            if (definition) {
                openDefinition(definition, panel);
            }
        };
    });
}

/* =========================
   REFERENCE SYSTEM
========================= */

function findDefinition(name) {
    if (!name) return null;

    const rawName = String(name).trim();

    if (state.definitions?.[rawName]) return state.definitions[rawName];

    const cleanedName = normalizeEntryName(name);

    if (state.definitions?.[cleanedName]) return state.definitions[cleanedName];

    const directMatch = Object.entries(state.definitions || {}).find(([key, def]) => {
        if (!def || typeof def !== "object") return false;
        return key === cleanedName || def.name === cleanedName || def.name?.toLowerCase() === cleanedName.toLowerCase();
    });

    if (directMatch) return directMatch[1];

    for (const def of Object.values(state.definitions || {})) {
        if (def.alias?.includes(cleanedName)) return def;
    }

    return null;
}

function findProfile(name) {
    if (!name) return null;

    const cleanedName = normalizeEntryName(name);

    if (state.profiles?.[cleanedName]) return state.profiles[cleanedName];

    return Object.values(state.profiles || {}).find(profile => {
        return profile?.name === cleanedName || profile?.name?.toLowerCase() === cleanedName.toLowerCase() || profile?.alias?.includes(cleanedName);
    }) || null;
}

function buildReferenceList(def) {
    const refs = [];

    if (Settings.profileSettings.enableRulesLink && def.linkedRules) {
        def.linkedRules.forEach(r => refs.push({ raw: r, type: "definition" }));
    }

    if (Settings.profileSettings.enableDetailsLink && def.linkedDetails) {
        def.linkedDetails.forEach(r => refs.push({ raw: r, type: "definition" }));
    }

    if (Settings.profileSettings.enableProfilesLink && def.linkedProfiles) {
        def.linkedProfiles.forEach(p => refs.push({ raw: p, type: "profile" }));
    }

    return refs
        .map(entry => {
            const [text, target] = entry.raw.split("|");
            return {
                display: text.trim(),
                target: (target || text).trim(),
                type: entry.type
            };
        })
        .sort((a, b) => b.display.length - a.display.length);
}

function buildOwnershipSections(def) {
    switch (def.type) {
    case "armyrule": {
        const armyLists = findArmyListsBySpecialRule(def.name);
        return armyLists.length
            ? [{ title: t("rules.all.usedByArmyLists"), items: armyLists }]
            : [];
    }
    case "heroicaction": {
        const profiles = findProfilesByNamedField("heroicActions", def.name);
        return profiles.length
            ? [{ title: t("rules.all.usedByProfiles"), items: profiles }]
            : [];
    }
    case "magicalpower": {
        const profiles = findProfilesByNamedField("magicalPowers", def.name);
        return profiles.length
            ? [{ title: t("rules.all.usedByProfiles"), items: profiles }]
            : [];
    }
    case "specialrule": {
        const profiles = findProfilesByAnyNamedField(["specialRules", "specialRulesArmylists"], def.name);
        return profiles.length
            ? [{ title: t("rules.all.usedByProfiles"), items: profiles }]
            : [];
    }
    case "wargear": {
        const wargearProfiles = findProfilesByNamedField("wargear", def.name);
        const optionProfiles = findProfilesByNamedField("options", def.name);
        const sections = [];

        if (wargearProfiles.length) {
            sections.push({ title: t("rules.all.usedAsWargear"), items: wargearProfiles });
        }

        if (optionProfiles.length) {
            sections.push({ title: t("rules.all.usedAsOption"), items: optionProfiles });
        }

        return sections;
    }
    default:
        return [];
    }
}

function findArmyListsBySpecialRule(ruleName) {
    return Object.values(state.armyLists || {})
        .filter(armyList => containsNamedEntry(armyList.specialRules, ruleName))
        .map(armyList => ({
            id: armyList.id,
            name: armyList.name,
            kind: "armylist"
        }))
        .sort(sortByName);
}

function findProfilesByNamedField(field, ruleName) {
    return findProfilesByAnyNamedField([field], ruleName);
}

function findProfilesByAnyNamedField(fields, ruleName) {
    return Object.values(state.profiles || {})
        .filter(profile => fields.some(field => containsNamedEntry(profile[field], ruleName)))
        .map(profile => ({
            id: profile.id,
            name: profile.name,
            kind: "profile"
        }))
        .sort(sortByName);
}

function containsNamedEntry(entries, targetName) {
    if (!Array.isArray(entries) || !targetName) return false;

    return entries.some(entry => namesMatch(getEntryName(entry), targetName));
}

function getEntryName(entry) {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object") return entry.name || "";
    return "";
}

function namesMatch(left, right) {
    const exactLeft = String(left || "").trim().toLowerCase();
    const exactRight = String(right || "").trim().toLowerCase();

    if (exactLeft !== "" && exactLeft === exactRight) {
        return true;
    }

    const normalizedLeft = normalizeEntryName(left).toLowerCase();
    const normalizedRight = normalizeEntryName(right).toLowerCase();
    return normalizedLeft !== "" && normalizedLeft === normalizedRight;
}

function sortByName(left, right) {
    return left.name.localeCompare(right.name, Settings.language);
}

/* =========================
   UTIL
========================= */

function formatText(text) {
    return text
        .replace(/\n/g, "<br>")
        .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeEntryName(name) {
    return String(name || "")
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/\s*\[[^\]]*\]/g, "")
        .trim();
}
