import { Settings } from "../settings.js";
import { loadDefinitions, loadProfiles } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */
const debugMode = true; // true = Debug aktiv, false = normaler Betrieb

const state = {
    definitions: null
};

const rightPanelState = new WeakMap();

const typeLabels = {
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
    ========================== */

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

    // =========================
    // DEBUG BUTTON
    // =========================
    if (debugMode) {
        const debugBtn = document.createElement("button");
        debugBtn.textContent = "Check JSON File";
        debugBtn.style.marginLeft = "1rem";
        debugBtn.onclick = () => runJsonChecks(state.definitions);
        filterContainer.appendChild(debugBtn);
    }

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
                    <h4>GW FAQ</h4>
                    <p class="definition-text-gwfaq"></p>
                </div>
                `
            : ""
        }
    `;

    renderDefinitionText(
        def.description,
        panel.querySelector(".rules-definition-text"),
        def
    );

    if (Settings.profileSettings.showGWFAQNotes && def.descriptionGWFAQ) {
        renderDefinitionText(
            def.descriptionGWFAQ,
            panel.querySelector(".definition-text-gwfaq"),
            def
        );
    }

    bindToolbar(panel);
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

function renderDefinitionText(text, container, def) {
    if (!text) return;


    let html = formatText(text)
        .replace("{Character}", `${t("rules.all.Character")}`)
        .replace("{character}", `${t("rules.all.character")}`);
    const protectedTokens = [];

    // =========================
    // ExcludeFromLinking schützen
    // =========================
    if (def.excludeFromLinking?.length) {
        def.excludeFromLinking.forEach((phrase, i) => {
            const token = `__PROTECTED_${i}__`;
            const escaped = escapeRegex(phrase);

            html = html.replace(new RegExp(escaped, "g"), token);

            protectedTokens.push({ token, value: phrase });
        });
    }

    // =========================
    // Referenzen vorbereiten
    // =========================
    let refs = buildReferenceList(def);

    // längere Terme zuerst
    refs = refs.sort((a, b) => b.display.length - a.display.length);

    // =========================
    // Token-System für Links
    // =========================
    refs.forEach((ref, i) => {
        if (def.excludeFromLinking?.includes(ref.display)) return;

        const escaped = escapeRegex(ref.display);
        const token = `__LINK_${i}__`;

        html = html.replace(new RegExp(escaped, "g"), token);

        // speichere fertigen HTML-Link
        protectedTokens.push({
            token,
            value: `<span class="rules-definition-link" data-target="${ref.target}" data-type="${ref.type}">${ref.display}</span>`
        });
    });

    // =========================
    // Tokens wieder einfügen
    // =========================
    protectedTokens.forEach(entry => {
        html = html.replaceAll(entry.token, entry.value);
    });

    container.innerHTML = html;

    // =========================
    // Klick-Handler für Links
    // =========================
    container.querySelectorAll(".rules-definition-link").forEach(el => {
        el.onclick = () => {
            const target = el.dataset.target;
            const type = el.dataset.type;

            if (type === "profile") {
                // Name -> ID auflösen
                const profileId = state.profileByName?.[target];
                if (!profileId) return;

                navigate("profiles", "search", { profileId });
                return;
            }

            const definition = findDefinition(target);
            if (definition) {
                openDefinition(
                    definition,
                    container.closest(".rules-detail").querySelector("#rulesDetailContent")
                );
            }
        };
    });
}

/* =========================
   REFERENCE SYSTEM
========================= */

function findDefinition(name) {

    if (!name) return null;

    if (state.definitions[name]) return state.definitions[name];

    for (const def of Object.values(state.definitions)) {
        if (def.alias?.includes(name)) return def;
    }

    return null;
}

function buildReferenceList(def) {

    const refs = [];

    if (Settings.profileSettings.enableRulesLink && def.linkedRules) {
        def.linkedRules.forEach(r => refs.push({ raw: r, type: "rule" }));
    }

    if (Settings.profileSettings.enableDetailsLink && def.linkedDetails) {
        def.linkedDetails.forEach(r => refs.push({ raw: r, type: "rule" }));
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

/* =========================
   DEBUGGING
========================= */

function runJsonChecks(definitions) {
    if (!definitions) return;

    const report = {
        structure: [],
        fields: [],
        keyNameMatch: [],
        versionCheck: [],
        languageCheck: [],
        alphabeticalOrder: [],

        referenceExistence: [],
        referenceTypeMismatch: [],
        missingInDescription: [],
        weakAliasUsage: [],
        aliasTargetUsage: []
    };
    // ===== Reference lookup preparation =====

    const definitionKeys = new Set(Object.keys(definitions));

    const aliasMap = {};            // alias → dictionary key
    const aliasUsageCounter = {};   // alias → count

    Object.entries(definitions).forEach(([key, def]) => {
        if (def.alias) {
            def.alias.forEach(a => {
                aliasMap[a] = key;
                aliasUsageCounter[a] = 0;
            });
        }
    });

    const profileKeys = new Set(Object.keys(state.profiles || {}));
    Object.entries(definitions).forEach(([key, def]) => {

        /* =========================
           TEST 1 – STRUCTURE
        ========================== */

        const requiredFields = [
            "type",
            "version",
            "language",
            "name",
            "description"
        ];

        requiredFields.forEach(field => {
            if (!(field in def)) {
                report.structure.push(
                    `[${key}] Missing required field: "${field}"`
                );
            }
        });

        /* =========================
           TEST 2 – ALLOWED FIELDS
        ========================== */

        const allowedFields = [
            "type", "version", "language",
            "alias", "name",
            "status", "phase", "duration",
            "description", "descriptionGWFAQ",
            "linkedDetails", "linkedProfiles",
            "linkedRules", "excludeFromLinking"
        ];

        Object.keys(def).forEach(field => {
            if (!allowedFields.includes(field)) {
                report.fields.push(
                    `[${key}] Unknown field: "${field}"`
                );
            }
        });

        /* =========================
           TEST 3 – KEY === NAME
        ========================== */

        if (def.name) {

            const normalizedKey = normalizeKey(key);
            const normalizedName = normalizeName(def.name);

            if (normalizedKey !== normalizedName) {
                report.keyNameMatch.push(
                    `[${key}] Key does not match name field ("${def.name}") after normalization`
                );
            }
        }

        /* =========================
           TEST 4 – VERSION MATCH
        ========================== */

        if (def.version !== Settings.version) {
            report.versionCheck.push(
                `[${key}] Version mismatch (found: ${def.version}, expected: ${Settings.version})`
            );
        }

        /* =========================
           TEST 5 – LANGUAGE MATCH
        ========================== */

        if (def.language !== Settings.language) {
            report.languageCheck.push(
                `[${key}] Language mismatch (found: ${def.language}, expected: ${Settings.language})`
            );
        }
        /* =========================
           TEST 7–10 – REFERENCE CHECKS
        ========================= */

        const allReferenceArrays = [
            { arr: def.linkedRules, type: "rule", source: "linkedRules" },
            { arr: def.linkedDetails, type: "detail", source: "linkedDetails" },
            { arr: def.linkedProfiles, type: "profile", source: "linkedProfiles" }
        ];

        allReferenceArrays.forEach(refGroup => {

            if (!refGroup.arr) return;

            refGroup.arr.forEach(rawEntry => {

                const [displayRaw, targetRaw] = rawEntry.split("|");

                const display = displayRaw.trim();
                const target = (targetRaw || displayRaw).trim();

                /* =========================
                   TEST 7 – TARGET EXISTS
                ========================== */

                if (refGroup.type === "profile") {

                    if (!profileKeys.has(target)) {
                        report.referenceExistence.push(
                            `[${key}] Profile reference "${target}" not found`
                        );
                    }

                } else {

                    const exists =
                        definitionKeys.has(target) ||
                        aliasMap[target];

                    if (!exists) {
                        report.referenceExistence.push(
                            `[${key}] Reference "${target}" not found in definitions`
                        );
                    }
                }

                /* =========================
                   TEST 8 – TYPE CONSISTENCY
                ========================== */

                let resolvedTarget = target;

if (aliasMap[target]) {
    resolvedTarget = aliasMap[target];
}

if (definitionKeys.has(resolvedTarget)) {
    const targetDef = definitions[resolvedTarget];

    if (refGroup.source === "linkedRules" && targetDef.type !== "rule") {
        report.referenceTypeMismatch.push(
            `[${key}] linkedRules → "${target}" resolves to type="${targetDef.type}", expected type="rule"`
        );
    }

    if (refGroup.source === "linkedDetails" && targetDef.type === "rule") {
        report.referenceTypeMismatch.push(
            `[${key}] linkedDetails → "${target}" resolves to type="rule", not allowed`
        );
    }
}

                /* =========================
                   TEST 9 – DISPLAY IN DESCRIPTION
                ========================== */

                if (!((def.description && def.description.includes(display))||
                     (def.descriptionGWFAQ && def.descriptionGWFAQ.includes(display)))) {
                    report.missingInDescription.push(
                        `[${key}] "${display}" not found in description text`
                    );
                }

                /* =========================
                   TEST 10 – ALIAS USAGE COUNT
                ========================== */

                if (aliasMap[target]) {
                    aliasUsageCounter[target]++;
                }

                /* =========================
   TEST 11 – TARGET RIGHT OF "|" IS ALIAS
========================= */

                if (rawEntry.includes("|")) {

                    const targetPart = rawEntry.split("|")[1]?.trim();

                    if (targetPart && aliasMap[targetPart]) {
                        report.aliasTargetUsage.push(
                            `[${key}] Reference "${rawEntry}" uses alias "${targetPart}" as target instead of dictionary key "${aliasMap[targetPart]}"`
                        );
                    }
                }

            });
        });

    });

    /* =========================
TEST 6 – ALPHABETICAL ORDER
========================= */

    const keys = Object.keys(definitions);

    const normalizedKeys = keys.map(k => ({
        original: k,
        normalized: normalizeAlphabetical(k)
    }));

    for (let i = 1; i < normalizedKeys.length; i++) {
        const prev = normalizedKeys[i - 1];
        const current = normalizedKeys[i];

        if (prev.normalized.localeCompare(current.normalized) > 0) {
            report.alphabeticalOrder.push(
                `"${current.original}" is out of order (should come before "${prev.original}")`
            );
        }
    }
    /* =========================
       TEST 10 – ALIAS USAGE SUMMARY
    ========================= */

    Object.entries(aliasUsageCounter).forEach(([alias, count]) => {
        if (count <= 1) {
            report.weakAliasUsage.push(
                `Alias "${alias}" referenced ${count} time(s)`
            );
        }
    });

    showErrorReport(report);
}



function showErrorReport(report) {

    const overlay = document.createElement("div");
    overlay.className = "debug-overlay";

    const modal = document.createElement("div");
    modal.className = "debug-modal";

    modal.innerHTML = `
        <div class="debug-header">
            <h2>Error Report</h2>
            <button class="debug-close">✕</button>
        </div>

        <div class="debug-content">
            ${renderTestBlock("Test 1: JSON Structure", report.structure)}
            ${renderTestBlock("Test 2: Field Validation", report.fields)}
            ${renderTestBlock("Test 3: Key–Name Consistency", report.keyNameMatch)}
            ${renderTestBlock("Test 4: Version Consistency", report.versionCheck)}
            ${renderTestBlock("Test 5: Language Consistency", report.languageCheck)}
            ${renderTestBlock("Test 6: Alphabetical Order", report.alphabeticalOrder)}
            ${renderTestBlock("Test 7: Reference Existence", report.referenceExistence)}
${renderTestBlock("Test 8: Reference Type Consistency", report.referenceTypeMismatch)}
${renderTestBlock("Test 9: Missing Display in Description", report.missingInDescription)}
${renderTestBlock("Test 10: Weak Alias Usage (≤1)", report.weakAliasUsage)}
${renderTestBlock("Test 11: Alias Used as Target", report.aliasTargetUsage)}
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector(".debug-close").onclick = () => {
        document.body.removeChild(overlay);
    };
}

function renderTestBlock(title, errors) {

    const hasErrors = errors.length > 0;

    return `
        <div class="debug-test-block ${hasErrors ? "has-errors" : "no-errors"}">
            <h3>${title}</h3>
            ${hasErrors
            ? `<ul>${errors.map(e => `<li>${e}</li>`).join("")}</ul>`
            : `<p class="debug-ok">No errors</p>`
        }
        </div>
    `;
}

function normalizeKey(str) {
    return str
        .replace(/\[.*?\]/g, "")     // entfernt alles in [...]
        .trim()
        .toLowerCase();
}

function normalizeName(str) {
    return str
        .replace(/\(.*?\)/g, "")     // entfernt alles in (...)
        .trim()
        .toLowerCase();
}

function normalizeAlphabetical(str) {
    return str
        .normalize("NFD")                     // trennt é → e +  ́
        .replace(/[\u0300-\u036f]/g, "")      // entfernt Diakritika
        .replace(/[^a-zA-Z0-9 ]/g, "")        // entfernt Sonderzeichen, aber NICHT Leerzeichen
        .toLowerCase()
        .trim();
}