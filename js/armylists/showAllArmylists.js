import { Settings } from "../settings.js";
import { loadArmyLists, loadProfiles } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */

const debugMode = true;

const state = {
    armylists: null,
    profiles: null
};

/* =========================
   INIT
========================= */

export async function initArmylistsAll(container) {

    state.armylists = await loadArmyLists(Settings.version);
    state.profiles = await loadProfiles(Settings.version);

    const entries = Object.entries(state.armylists);

    const alignments = [t("armylists.all.good"), t("armylists.all.evil")];

    container.innerHTML = `
        <div class="armylists-all">

            <div class="armylists-filter" id="armylistsFilter"></div>

            <div class="armylists-layout">
                <div class="armylists-list">
                    <ul id="armylistsList"></ul>
                </div>
            </div>

        </div>
    `;

    const filterContainer = container.querySelector("#armylistsFilter");
    const listEl = container.querySelector("#armylistsList");

    /* =========================
       CHECKBOXES
    ========================= */

    alignments.forEach(alignment => {

        const label = document.createElement("label");
        label.className = "armylists-checkbox";

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

        debugBtn.onclick = () => runJsonChecks(state.armylists);

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

        entries.forEach(([key, armylist]) => {

            if (!activeAlignments.includes(armylist.alignment)) return;

            const li = document.createElement("li");

            li.textContent = armylist.name;
            li.dataset.id = armylist.id;

            li.onclick = () => {
                navigate("armylists", "search", {
                    armylistId: armylist.id
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

function runJsonChecks(armylists) {

    const report = {
        structure: [],
        fields: [],
        keyNameMatch: [],
        versionCheck: [],
        languageCheck: [],
        alphabeticalOrder: [],
        profileReferences: [],
        pointValidation: [],
        optionValidation: [],
        armyRulesValidation: []
    };

    const allowedFields = [
        "id",
        "version",
        "language",
        "name",
        "alignment",
        "source",
        "additionalRules",
        "specialRules",
        "noteGWFAQ",
        "armyRules",
        "models"
    ];

    const allowedArmyRules = [
        "ArmyDistributions",
        "Banner",
        "Bow",
        "BowLimit",
        "Breakpoint",
        "Captain",
        "Captains",
        "Cavalry",
        "CountAs",
        "Depends",
        "DependsAny",
        "ExcludeOptions",
        "Followers",
        "General",
        "Legacy",
        "Maximum",
        "Monster",
        "NotCount",
        "SameAs",
        "Throwing",
        "ThrowingLimit",
        "Warband",
        "blockedBy"
    ];
    const keys = Object.keys(armylists);

    const profileNames = new Set(
        Object.values(state.profiles).map(p => p.name)
    );
    
function validateArmyRules(rules, context) {

    if (!rules) return;

    const keys = Object.keys(rules);

    // ❌ Unknown fields
    keys.forEach(key => {
        if (!allowedArmyRules.includes(key)) {
            report.armyRulesValidation.push(
                `[${context}] Unknown armyRule: "${key}"`
            );
        }
    });

    // ❌ Reihenfolge prüfen
    let lastIndex = -1;

    keys.forEach(key => {

        const currentIndex = allowedArmyRules.indexOf(key);
        if (currentIndex === -1) return;

        if (currentIndex < lastIndex) {
            report.armyRulesValidation.push(
                `[${context}] armyRule order incorrect: "${key}"`
            );
        }

        lastIndex = currentIndex;
    });
}

    /* =========================
       MAIN LOOP
    ========================= */

    Object.entries(armylists).forEach(([key, army]) => {

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
            if (!(field in army)) {
                report.structure.push(
                    `[${key}] Missing required field: "${field}"`
                );
            }
        });

        /* =========================
           TEST 2 – FIELD VALIDATION + ORDER
        ========================= */

        const fields = Object.keys(army);

        fields.forEach(field => {
            if (!allowedFields.includes(field)) {
                report.fields.push(
                    `[${key}] Unknown field: "${field}"`
                );
            }
        });

        let lastIndex = -1;

        fields.forEach(field => {

            const currentIndex = allowedFields.indexOf(field);
            if (currentIndex === -1) return;

            if (currentIndex < lastIndex) {
                report.fields.push(
                    `[${key}] Field order incorrect: "${field}"`
                );
            }

            lastIndex = currentIndex;
        });

        /* =========================
           TEST 3 – KEY NAME MATCH
        ========================= */

        if (army.name && key !== army.name) {
            report.keyNameMatch.push(
                `[${key}] Key does not match name "${army.name}"`
            );
        }

        /* =========================
           TEST 4 – VERSION
        ========================= */

        if (army.version !== Settings.version) {
            report.versionCheck.push(
                `[${key}] Version mismatch (${army.version})`
            );
        }

        /* =========================
           TEST 5 – LANGUAGE
        ========================= */

        if (army.language !== Settings.language) {
            report.languageCheck.push(
                `[${key}] Language mismatch (${army.language})`
            );
        }

        /* =========================
           TEST 7 – PROFILE REFERENCES
        ========================= */

        if (army.models) {

            Object.values(army.models).forEach(category => {

                category.forEach(model => {

                    // Hauptmodell
                    if (!profileNames.has(model.name)) {
                        report.profileReferences.push(
                            `[${key}] Model "${model.name}" not found in profiles`
                        );
                    }

                    // Composition Modelle
                    model.composition?.forEach(comp => {
                        if (!profileNames.has(comp.name)) {
                            report.profileReferences.push(
                                `[${key}] Composition "${comp.name}" not found`
                            );
                        }
                    });
                });
            });
        }
        /* =========================
        TEST 8+9 – POINTS + OPTIONS
        ========================= */

        if (army.models) {

            Object.values(army.models).forEach(category => {

                category.forEach(model => {

                    const profile = state.profiles[model.name];
                    if (!profile) return;

                    const basePoints = Number(profile.points) || 0;
                    let expectedPoints = basePoints;

                    /* =========================
                       MANDATORY → Teil des Punktevergleichs
                    ========================= */

                    if (model.mandatory) {

                        model.mandatory.forEach(mand => {

                            const profileOpt = profile.options?.find(o => normalizeName(o.name) === normalizeName(mand));

                            // ❌ Mandatory existiert nicht
                            if (!profileOpt) {
                                report.pointValidation.push(
                                    `[${key}] ${model.name} mandatory "${mand}" not found in profile`
                                );
                                return;
                            }

                            // ✔ Kosten addieren
                            expectedPoints += Number(profileOpt.cost) || 0;
                        });
                    }

                    /* =========================
                       POINT CHECK
                    ========================= */

                    const armyPoints = Number(model.points) || 0;

                    if (armyPoints !== expectedPoints) {
                        report.pointValidation.push(
                            `[${key}] ${model.name} points mismatch: Army=${armyPoints} vs Expected=${expectedPoints}`
                        );
                    }

                    /* =========================
                       OPTION VALIDATION
                    ========================= */

                    const checkOptions = (arr, source) => {

                        if (!arr) return;

                        arr.forEach(opt => {

                            const profileOpt = profile.options?.find(o => normalizeName(o.name) === normalizeName(opt.name));

                            if (!profileOpt) {
                                report.optionValidation.push(
                                    `[${key}] ${model.name} ${source} "${opt.name}" not found in profile`
                                );
                                return;
                            }

                            const profileCost = Number(profileOpt.cost) || 0;
                            const armyCost = Number(opt.cost) || 0;

                            if (profileCost !== armyCost) {
                                report.optionValidation.push(
                                    `[${key}] ${model.name} ${source} "${opt.name}" cost mismatch: Army=${armyCost} vs Profile=${profileCost}`
                                );
                            }

                            // 👇 NEU: armyRules Validation auf Option
                            validateArmyRules(
                                opt.armyRules,
                                `${key} → ${model.name} → ${opt.name} (Option)`
                            );
                        });
                    };

                    checkOptions(model.options, "options");
                    checkOptions(model.mandatoryWarrior, "mandatoryWarrior");
                    checkOptions(model.optionalwarrior, "optionalwarrior");
                    validateArmyRules(
                        model.armyRules,
                        `${key} → ${model.name} (Model)`
                    );

                });
            });
        }

        validateArmyRules(army.armyRules, `${key} (Army)`);

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
                `"${current.original}" should come before "${prev.original}"`
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
            ${renderTestBlock("Test 8: Points Validation", report.pointValidation)}
            ${renderTestBlock("Test 9: Option Validation", report.optionValidation)}
            ${renderTestBlock("Test 10: ArmyRules Validation", report.armyRulesValidation)}
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