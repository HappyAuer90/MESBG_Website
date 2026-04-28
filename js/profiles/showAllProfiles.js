import { Settings } from "../settings.js";
import { loadProfiles } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { loadDefinitions } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */

const debugMode = true;

const state = {
    profiles: null,
    definitions: null
};

/* =========================
   INIT
========================= */

export async function initProfilesAll(container) {

    state.profiles = await loadProfiles(Settings.version);

    state.definitions = await loadDefinitions(Settings.version);

    const entries = Object.entries(state.profiles);

    const alignments = [t("profiles.all.good"), t("profiles.all.evil")];

    container.innerHTML = `
        <div class="profiles-all">

            <div class="profiles-filter" id="profilesFilter"></div>

            <div class="profiles-layout">
                <div class="profiles-list">
                    <ul id="profilesList"></ul>
                </div>
            </div>

        </div>
    `;

    const filterContainer = container.querySelector("#profilesFilter");
    const listEl = container.querySelector("#profilesList");

    /* =========================
       CHECKBOXES
    ========================= */

    alignments.forEach(alignment => {

        const label = document.createElement("label");
        label.className = "profiles-checkbox";

        label.innerHTML = `
            <input type="checkbox" value="${alignment}" checked />
            ${alignment}
        `;

        filterContainer.appendChild(label);
    });

    /* =========================
       DEBUG BUTTON
    ========================= */

    if (debugMode) {

        const debugBtn = document.createElement("button");

        debugBtn.textContent = "Check JSON File";
        debugBtn.style.marginLeft = "1rem";

        debugBtn.onclick = () => runJsonChecks(state.profiles);

        filterContainer.appendChild(debugBtn);
    }

    /* =========================
       LIST RENDER
    ========================= */

    function renderList() {

        const activeAlignments = [
            ...filterContainer.querySelectorAll("input:checked")
        ].map(cb => cb.value);

        listEl.innerHTML = "";

        entries.forEach(([key, profile]) => {

            if (!activeAlignments.includes(profile.alignment)) return;

            const li = document.createElement("li");

            li.textContent = profile.name;
            li.dataset.id = profile.id;

            li.onclick = () => {
                navigate("profiles", "search", {
                    profileId: profile.id
                });
            };

            listEl.appendChild(li);
        });
    }

    filterContainer.addEventListener("change", renderList);

    renderList();
}

/* =========================
   DEBUGGING
========================= */

function runJsonChecks(profiles) {

    const report = {
        structure: [],
        fields: [],
        keyNameMatch: [],
        versionCheck: [],
        languageCheck: [],
        alphabeticalOrder: [],

        profileReferences: [],
        definitionReferences: [],
        heroConsistency: [],
        alphabeticalInternal: []
    };

    const allowedFields = [
        "id",
        "version",
        "language",
        "type",
        "alias",
        "name",
        "linkedProfile",
        "alignment",
        "source",
        "note",
        "noteGWFAQ",
        "points",
        "race",
        "faction",
        "unitTypes",
        "baseSize",
        "characteristics",
        "characteristicsHero",
        "characteristicsSiegeEngine",
        "wargear",
        "heroicActions",
        "options",
        "specialRules",
        "specialRulesArmylists",
        "magicalPowers",
        "composition"
    ];

    const keys = Object.keys(profiles);

    const definitions = state.definitions || {};
    const definitionKeys = new Set(Object.keys(definitions));

    const definitionAliasMap = {};
    Object.entries(definitions).forEach(([key, def]) => {
        def.alias?.forEach(a => {
            definitionAliasMap[a] = key;
        });
    });
    const profileAliasMap = {};
    Object.entries(profiles).forEach(([key, def]) => {
        def.alias?.forEach(a => {
            profileAliasMap[a] = key;
        });
    });


    const profileNames = new Set(
        Object.values(profiles).map(p => p.name)
    );

    function resolveDefinition(name) {
        if (definitionKeys.has(name)) return true;
        if (definitionAliasMap[name]) return true;
        if (profileNames.has(name)) return true;
        if (profileAliasMap[name]) return true;
        return false;
    }

    Object.entries(profiles).forEach(([key, profile]) => {

        /* =========================
           TEST 1 – STRUCTURE
        ========================= */

        const requiredFields = [
            "id",
            "version",
            "language",
            "name",
            "alignment",
            "source"
        ];

        requiredFields.forEach(field => {
            if (!(field in profile)) {
                report.structure.push(
                    `[${key}] Missing required field: "${field}"`
                );
            }
        });

        /* =========================
           TEST 2 – FIELD VALIDATION + ORDER
        ========================= */

        const fields = Object.keys(profile);

        // 1. Unknown fields prüfen
        fields.forEach(field => {

            if (!allowedFields.includes(field)) {

                report.fields.push(
                    `[${key}] Unknown field: "${field}"`
                );
            }
        });

        // 2. Reihenfolge prüfen
        let lastIndex = -1;

        fields.forEach(field => {

            const currentIndex = allowedFields.indexOf(field);

            if (currentIndex === -1) return; // unknown fields ignorieren hier

            if (currentIndex < lastIndex) {

                report.fields.push(
                    `[${key}] Field order incorrect: "${field}" appears before expected order`
                );
            }

            lastIndex = currentIndex;
        });

        /* =========================
           TEST 3 – KEY NAME MATCH
        ========================= */

        if (profile.name) {

            if (key !== profile.name) {

                report.keyNameMatch.push(
                    `[${key}] Key does not match name "${profile.name}"`
                );
            }
        }

        /* =========================
           TEST 4 – VERSION MATCH
        ========================= */

        if (profile.version !== Settings.version) {

            report.versionCheck.push(
                `[${key}] Version mismatch (${profile.version})`
            );
        }

        /* =========================
           TEST 5 – LANGUAGE MATCH
        ========================= */

        if (profile.language !== Settings.language) {

            report.languageCheck.push(
                `[${key}] Language mismatch (${profile.language})`
            );
        }
        /* =========================
       TEST 7 – PROFILE REFERENCES
    ========================= */


        const checkProfileRef = (ref, source) => {
            if (!profileNames.has(ref)) {
                report.profileReferences.push(
                    `[${key}] ${source} reference "${ref}" not found`
                );
            }
        };

        // linkedProfile
        profile.linkedProfile?.forEach(p => checkProfileRef(p, "linkedProfile"));

        // composition
        profile.composition?.forEach(p => checkProfileRef(p, "composition"));


        /* =========================
           TEST 8 – DEFINITION REFERENCES
        ========================= */

        function checkDefinitionArray(arr, source, isObject = false) {

            if (!arr) return;

            arr.forEach(entry => {

                // OPTIONAL_RULES ignorieren
                if (isObject && entry.type === "OPTIONAL_RULES") return;

                const name = normalizeName(isObject ? entry.name : entry);

                if (!name) return;

                if (!resolveDefinition(name)) {

                    report.definitionReferences.push(
                        `[${key}] ${source} "${name}" not found in definitions or profiles`
                    );
                }
            });
        }

        // Wargear (Objekte)
        checkDefinitionArray(profile.wargear, "wargear", true);

        // Heroic Actions (Strings)
        checkDefinitionArray(profile.heroicActions, "heroicActions");

        // Options (Objekte)
        checkDefinitionArray(profile.options, "options", true);

        // Special Rules
        checkDefinitionArray(profile.specialRules, "specialRules");

        // Magical Powers (Objekte)
        checkDefinitionArray(profile.magicalPowers, "magicalPowers", true);

        /* =========================
           TEST 9 – HERO CONSISTENCY
        ========================= */

        const isHero = profile.unitTypes?.includes(t("profiles.all.Hero"));
        const hasHeroStats = !!profile.characteristicsHero;

        if (isHero && !hasHeroStats) {
            report.heroConsistency.push(
                `[${key}] is Hero but missing characteristicsHero`
            );
        }

        if (!isHero && hasHeroStats) {
            report.heroConsistency.push(
                `[${key}] has characteristicsHero but is not Hero`
            );
        }

        /* =========================
   TEST 10 – INTERNAL ORDERING
========================= */

function checkAlphabeticalArray(arr, fieldName, isObject = false) {

    if (!arr || arr.length <= 1) return;

    for (let i = 1; i < arr.length; i++) {

        const prev = isObject
            ? normalizeAlphabetical(arr[i - 1].name)
            : normalizeAlphabetical(arr[i - 1]);

        const current = isObject
            ? normalizeAlphabetical(arr[i].name)
            : normalizeAlphabetical(arr[i]);

        if (prev.localeCompare(current) > 0) {

            report.alphabeticalInternal.push(
                `[${key}] ${fieldName} not alphabetical at "${isObject ? arr[i].name : arr[i]}"`
            );
        }
    }
}

/* --- HEROIC ACTIONS --- */
checkAlphabeticalArray(profile.heroicActions, "heroicActions");

/* --- SPECIAL RULES --- */
checkAlphabeticalArray(profile.specialRules, "specialRules");

/* --- OPTIONS (cost DESC → name ASC) --- */
if (profile.options?.length > 1) {

    for (let i = 1; i < profile.options.length; i++) {

        const prev = profile.options[i - 1];
        const current = profile.options[i];

        const prevCost = Number(prev.cost) || 0;
        const currentCost = Number(current.cost) || 0;

        if (currentCost > prevCost) {

            report.alphabeticalInternal.push(
                `[${key}] options order incorrect: "${current.name}" has higher cost than previous`
            );
            continue;
        }

        if (currentCost === prevCost) {

            const prevName = normalizeAlphabetical(prev.name);
            const currentName = normalizeAlphabetical(current.name);

            if (prevName.localeCompare(currentName) > 0) {

                report.alphabeticalInternal.push(
                    `[${key}] options alphabetical error at "${current.name}"`
                );
            }
        }
    }
}
    });

    /* =========================
       TEST 6 – ALPHABETICAL ORDER
    ========================= */

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

    showErrorReport(report);
}

/* =========================
   DEBUG MODAL
========================= */


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
            ${renderTestBlock("Test 7: Profile References", report.profileReferences)}
            ${renderTestBlock("Test 8: Definition References", report.definitionReferences)}
            ${renderTestBlock("Test 9: Hero Consistency", report.heroConsistency)}
            ${renderTestBlock("Test 10: Internal Ordering", report.alphabeticalInternal)}
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

/* =========================
   UTIL
========================= */

function normalizeName(str) {
    return str
        .replace(/\(.*?\)/g, "")
        .trim();
}

function normalizeAlphabetical(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .toLowerCase()
        .trim();
}
