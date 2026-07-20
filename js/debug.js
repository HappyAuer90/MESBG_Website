import { Settings } from "./settings.js";
import { loadArmyLists, loadDefinitions, loadProfiles } from "./utility/dataLoader.js";
import { t } from "./utility/i18n.js";

export function initGlobalDebugButton() {
    const header = document.getElementById("mainHeader");

    if (!header) return;

    let button = document.getElementById("globalDebugBtn");

    if (!button) {
        button = document.createElement("button");
        button.id = "globalDebugBtn";
        button.className = "debug-btn";
        button.textContent = "🧪";
        header.appendChild(button);
        button.onclick = () => {
            runAllJsonChecks();
        };
    }

    updateGlobalDebugButton();
}

export function removeGlobalDebugButton() {
    const button = document.getElementById("globalDebugBtn");
    button?.remove();
}

export function updateGlobalDebugButton() {
    const button = document.getElementById("globalDebugBtn");
    if (!button) return;

    const label = t("accessibility.runDebugChecks");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
}

async function runAllJsonChecks() {
    const [definitions, profiles, armylists] = await Promise.all([
        loadDefinitions(Settings.version),
        loadProfiles(Settings.version),
        loadArmyLists(Settings.version)
    ]);

    const reports = [
        {
            title: "Definitions",
            blocks: buildDefinitionsReport(definitions, profiles)
        },
        {
            title: "Profiles",
            blocks: buildProfilesReport(profiles, definitions)
        },
        {
            title: "Army Lists",
            blocks: buildArmylistsReport(armylists, profiles)
        }
    ];

    showErrorReport(reports);
}

function buildDefinitionsReport(definitions, profiles) {
    const report = createBaseReport();
    report.referenceExistence = [];
    report.referenceTypeMismatch = [];
    report.missingInDescription = [];
    report.weakAliasUsage = [];
    report.aliasTargetUsage = [];

    const allowedFields = [
        "type", "version", "language",
        "alias", "name",
        "status", "phase", "duration",
        "description", "descriptionGWFAQ",
        "linkedDetails", "linkedProfiles",
        "linkedRules", "excludeFromLinking"
    ];

    const requiredFields = ["type", "version", "language", "name", "description"];
    const definitionKeys = new Set(Object.keys(definitions));
    const profileLookup = createProfileLookup(profiles);
    const aliasMap = {};
    const aliasUsageCounter = {};

    Object.entries(definitions).forEach(([key, def]) => {
        def.alias?.forEach(alias => {
            aliasMap[alias] = key;
            aliasUsageCounter[alias] = 0;
        });
    });

    Object.entries(definitions).forEach(([key, def]) => {
        runCommonEntryChecks({
            key,
            entry: def,
            report,
            requiredFields,
            allowedFields,
            nameMatchesKey: () => normalizeDefinitionKey(key) === normalizeName(def.name),
            keyMismatchMessage: `[${key}] Key does not match name field ("${def.name}") after normalization`
        });

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

                if (refGroup.type === "profile") {
                    if (!profileLookup.has(target)) {
                        report.referenceExistence.push(
                            `[${key}] Profile reference "${target}" not found`
                        );
                    }
                } else {
                    const exists = definitionKeys.has(target) || aliasMap[target];

                    if (!exists) {
                        report.referenceExistence.push(
                            `[${key}] Reference "${target}" not found in definitions`
                        );
                    }
                }

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

                if (!((def.description && def.description.includes(display)) ||
                    (def.descriptionGWFAQ && def.descriptionGWFAQ.includes(display)))) {
                    report.missingInDescription.push(
                        `[${key}] "${display}" not found in description text`
                    );
                }

                if (aliasMap[target]) {
                    aliasUsageCounter[target]++;
                }

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

    collectAlphabeticalTopLevel(report.alphabeticalOrder, Object.keys(definitions));

    Object.entries(aliasUsageCounter).forEach(([alias, count]) => {
        if (count > 1) return;

        const parentKey = aliasMap[alias];
        const parentDef = definitions[parentKey];
        const usedInProfiles = parentDef
            ? isAliasUsedInProfiles(alias, parentDef.type, profiles)
            : false;

        if (!usedInProfiles) {
            report.weakAliasUsage.push(
                `Alias "${alias}" referenced ${count} time(s) and not used in profiles`
            );
        }
    });

    return [
        block("Test 1: JSON Structure", report.structure),
        block("Test 2: Field Validation", report.fields),
        block("Test 3: Key–Name Consistency", report.keyNameMatch),
        block("Test 4: Version Consistency", report.versionCheck),
        block("Test 5: Language Consistency", report.languageCheck),
        block("Test 6: Alphabetical Order", report.alphabeticalOrder),
        block("Test 7: Reference Existence", report.referenceExistence),
        block("Test 8: Reference Type Consistency", report.referenceTypeMismatch),
        block("Test 9: Missing Display in Description", report.missingInDescription),
        block("Test 10: Weak Alias Usage", report.weakAliasUsage),
        block("Test 11: Alias Used as Target", report.aliasTargetUsage)
    ];
}

function buildProfilesReport(profiles, definitions) {
    const report = createBaseReport();
    report.profileReferences = [];
    report.definitionReferences = [];
    report.heroConsistency = [];
    report.alphabeticalInternal = [];

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

    const requiredFields = ["id", "version", "language", "name", "alignment", "source"];
    const definitionLookup = createDefinitionLookup(definitions);
    const profileLookup = createProfileLookup(profiles);
    const profileNames = new Set(Object.values(profiles).map(profile => profile.name));

    Object.entries(profiles).forEach(([key, profile]) => {
        runCommonEntryChecks({
            key,
            entry: profile,
            report,
            requiredFields,
            allowedFields,
            nameMatchesKey: () => key === profile.name,
            keyMismatchMessage: `[${key}] Key does not match name "${profile.name}"`
        });

        const checkProfileRef = (ref, source) => {
            if (!profileNames.has(ref)) {
                report.profileReferences.push(
                    `[${key}] ${source} reference "${ref}" not found`
                );
            }
        };

        profile.linkedProfile?.forEach(ref => checkProfileRef(ref, "linkedProfile"));
        profile.composition?.forEach(ref => checkProfileRef(ref, "composition"));

        const checkDefinitionArray = (arr, source, isObject = false) => {
            if (!arr) return;

            arr.forEach(entry => {
                if (isObject && entry.type === "OPTIONAL_RULES") return;

                const name = String(isObject ? entry.name : entry).trim();
                if (!name) return;

                if (!hasProfileTestReferenceMatch(name, definitionLookup, profileLookup)) {
                    report.definitionReferences.push(
                        `[${key}] ${source} "${name}" not found in definitions or profiles`
                    );
                }
            });
        };

        checkDefinitionArray(profile.wargear, "wargear", true);
        checkDefinitionArray(profile.heroicActions, "heroicActions");
        checkDefinitionArray(profile.options, "options", true);
        checkDefinitionArray(profile.specialRules, "specialRules");
        checkDefinitionArray(profile.magicalPowers, "magicalPowers", true);

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

        checkAlphabeticalArray(report.alphabeticalInternal, key, profile.heroicActions, "heroicActions");
        checkAlphabeticalArray(report.alphabeticalInternal, key, profile.specialRules, "specialRules");

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

    collectAlphabeticalTopLevel(report.alphabeticalOrder, Object.keys(profiles));

    return [
        block("Test 1: JSON Structure", report.structure),
        block("Test 2: Field Validation", report.fields),
        block("Test 3: Key–Name Consistency", report.keyNameMatch),
        block("Test 4: Version Consistency", report.versionCheck),
        block("Test 5: Language Consistency", report.languageCheck),
        block("Test 6: Alphabetical Order", report.alphabeticalOrder),
        block("Test 7: Profile References", report.profileReferences),
        block("Test 8: Definition References", report.definitionReferences),
        block("Test 9: Hero Consistency", report.heroConsistency),
        block("Test 10: Internal Ordering", report.alphabeticalInternal)
    ];
}

function buildArmylistsReport(armylists, profiles) {
    const report = createBaseReport();
    report.profileReferences = [];
    report.pointValidation = [];
    report.optionValidation = [];
    report.armyRulesValidation = [];

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

    const requiredFields = ["id", "version", "language", "name", "alignment", "source"];
    const profileNames = new Set(Object.values(profiles).map(profile => profile.name));

    const validateArmyRules = (rules, context) => {
        if (!rules) return;

        const keys = Object.keys(rules);

        keys.forEach(key => {
            if (!allowedArmyRules.includes(key)) {
                report.armyRulesValidation.push(
                    `[${context}] Unknown armyRule: "${key}"`
                );
            }
        });

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
    };

    Object.entries(armylists).forEach(([key, army]) => {
        runCommonEntryChecks({
            key,
            entry: army,
            report,
            requiredFields,
            allowedFields,
            nameMatchesKey: () => key === army.name,
            keyMismatchMessage: `[${key}] Key does not match name "${army.name}"`
        });

        if (army.models) {
            Object.values(army.models).forEach(category => {
                category.forEach(model => {
                    if (!profileNames.has(model.name)) {
                        report.profileReferences.push(
                            `[${key}] Model "${model.name}" not found in profiles`
                        );
                    }

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

        if (army.models) {
            Object.values(army.models).forEach(category => {
                category.forEach(model => {
                    const profile = profiles[model.name];
                    if (!profile) return;

                    const basePoints = Number(profile.points) || 0;
                    let expectedPoints = basePoints;

                    model.mandatory?.forEach(mandatory => {
                        const profileOpt = profile.options?.find(option => normalizeName(option.name) === normalizeName(mandatory));

                        if (!profileOpt) {
                            report.pointValidation.push(
                                `[${key}] ${model.name} mandatory "${mandatory}" not found in profile`
                            );
                            return;
                        }

                        expectedPoints += Number(profileOpt.cost) || 0;
                    });

                    const armyPoints = Number(model.points) || 0;
                    if (armyPoints !== expectedPoints) {
                        report.pointValidation.push(
                            `[${key}] ${model.name} points mismatch: Army=${armyPoints} vs Expected=${expectedPoints}`
                        );
                    }

                    const checkOptions = (arr, source) => {
                        if (!arr) return;

                        arr.forEach(opt => {
                            const profileOpt = profile.options?.find(option => normalizeName(option.name) === normalizeName(opt.name));

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

                            validateArmyRules(opt.armyRules, `${key} → ${model.name} → ${opt.name} (Option)`);
                        });
                    };

                    checkOptions(model.options, "options");
                    checkOptions(model.mandatoryWarrior, "mandatoryWarrior");
                    checkOptions(model.optionalwarrior, "optionalwarrior");

                    validateArmyRules(model.armyRules, `${key} → ${model.name} (Model)`);
                });
            });
        }

        validateArmyRules(army.armyRules, `${key} (Army)`);
    });

    collectAlphabeticalTopLevel(report.alphabeticalOrder, Object.keys(armylists), "should come before");

    return [
        block("Test 1: JSON Structure", report.structure),
        block("Test 2: Field Validation", report.fields),
        block("Test 3: Key–Name Consistency", report.keyNameMatch),
        block("Test 4: Version Consistency", report.versionCheck),
        block("Test 5: Language Consistency", report.languageCheck),
        block("Test 6: Alphabetical Order", report.alphabeticalOrder),
        block("Test 7: Profile References", report.profileReferences),
        block("Test 8: Points Validation", report.pointValidation),
        block("Test 9: Option Validation", report.optionValidation),
        block("Test 10: ArmyRules Validation", report.armyRulesValidation)
    ];
}

function createBaseReport() {
    return {
        structure: [],
        fields: [],
        keyNameMatch: [],
        versionCheck: [],
        languageCheck: [],
        alphabeticalOrder: []
    };
}

function runCommonEntryChecks({ key, entry, report, requiredFields, allowedFields, nameMatchesKey, keyMismatchMessage }) {
    requiredFields.forEach(field => {
        if (!(field in entry)) {
            report.structure.push(
                `[${key}] Missing required field: "${field}"`
            );
        }
    });

    const fields = Object.keys(entry);

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
                `[${key}] Field order incorrect: "${field}" appears before expected order`
            );
        }

        lastIndex = currentIndex;
    });

    if (entry.name && !nameMatchesKey()) {
        report.keyNameMatch.push(keyMismatchMessage);
    }

    if (entry.version !== Settings.version) {
        report.versionCheck.push(
            `[${key}] Version mismatch (${entry.version})`
        );
    }

    if (entry.language !== Settings.language) {
        report.languageCheck.push(
            `[${key}] Language mismatch (${entry.language})`
        );
    }
}

function collectAlphabeticalTopLevel(target, keys, template = "is out of order (should come before)") {
    const normalizedKeys = keys.map(key => ({
        original: key,
        normalized: normalizeAlphabetical(key)
    }));

    for (let index = 1; index < normalizedKeys.length; index++) {
        const prev = normalizedKeys[index - 1];
        const current = normalizedKeys[index];

        if (prev.normalized.localeCompare(current.normalized) > 0) {
            if (template === "should come before") {
                target.push(`"${current.original}" should come before "${prev.original}"`);
            } else {
                target.push(`"${current.original}" is out of order (should come before "${prev.original}")`);
            }
        }
    }
}

function checkAlphabeticalArray(target, key, arr, fieldName) {
    if (!arr || arr.length <= 1) return;

    for (let index = 1; index < arr.length; index++) {
        const prev = normalizeAlphabetical(arr[index - 1]);
        const current = normalizeAlphabetical(arr[index]);

        if (prev.localeCompare(current) > 0) {
            target.push(
                `[${key}] ${fieldName} not alphabetical at "${arr[index]}"`
            );
        }
    }
}

function createDefinitionLookup(definitions) {
    const lookup = new Set();

    Object.entries(definitions).forEach(([key, def]) => {
        lookup.add(key);
        lookup.add(def.name);
        def.alias?.forEach(alias => lookup.add(alias));
    });

    return lookup;
}

function createProfileLookup(profiles) {
    const lookup = new Set();

    Object.entries(profiles).forEach(([key, profile]) => {
        lookup.add(key);
        lookup.add(profile.name);
        profile.alias?.forEach(alias => lookup.add(alias));
    });

    return lookup;
}

function hasProfileTestReferenceMatch(name, definitionLookup, profileLookup) {
    const rawName = String(name || "").trim();
    if (!rawName) return false;

    // 1) Direkter Treffer zuerst
    if (definitionLookup.has(rawName) || profileLookup.has(rawName)) {
        return true;
    }

    // 2) Fallback: runde Klammern entfernen (wie in searchProfile.js)
    const withoutBrackets = rawName.replace(/\s*\([^)]*\)/g, "").trim();
    if (!withoutBrackets) return false;

    return definitionLookup.has(withoutBrackets) || profileLookup.has(withoutBrackets);
}

function isAliasUsedInProfiles(alias, defType, profiles) {
    const lowerAlias = alias.toLowerCase();

    for (const profile of Object.values(profiles || {})) {
        if (defType === "wargear") {
            if (profile.wargear?.some(wg => wg.name?.toLowerCase().includes(lowerAlias))) return true;
            if (profile.options?.some(opt => opt.name?.toLowerCase().includes(lowerAlias))) return true;
        }

        if (defType === "specialrule") {
            if (profile.specialRules?.some(rule => rule.toLowerCase().includes(lowerAlias))) return true;
        }

        if (defType === "magicalpower") {
            if (profile.magicalPowers?.some(magic => magic.name?.toLowerCase().includes(lowerAlias))) return true;
        }
    }

    return false;
}

function block(title, errors) {
    return { title, errors };
}

function showErrorReport(sections) {
    const existingOverlay = document.querySelector(".debug-overlay");
    existingOverlay?.remove();

    const overlay = document.createElement("div");
    overlay.className = "debug-overlay";

    const modal = document.createElement("div");
    modal.className = "debug-modal";

    modal.innerHTML = `
        <div class="debug-header">
            <h2>JSON Debug Report</h2>
            <button class="debug-close">✕</button>
        </div>

        <div class="debug-content">
            ${sections.map(renderSection).join("")}
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector(".debug-close").onclick = () => {
        document.body.removeChild(overlay);
    };
}

function renderSection(section) {
    const totalErrors = section.blocks.reduce((sum, block) => sum + block.errors.length, 0);

    return `
        <section class="debug-section">
            <h2>${section.title} <span class="debug-section-count">(${totalErrors})</span></h2>
            ${section.blocks.map(renderTestBlock).join("")}
        </section>
    `;
}

function renderTestBlock(block) {
    const hasErrors = block.errors.length > 0;

    return `
        <div class="debug-test-block ${hasErrors ? "has-errors" : "no-errors"}">
            <h3>${block.title}</h3>
            ${hasErrors
                ? `<ul>${block.errors.map(error => `<li>${error}</li>`).join("")}</ul>`
                : `<p class="debug-ok">No errors</p>`
            }
        </div>
    `;
}

function normalizeDefinitionKey(str) {
    return String(str || "")
        .replace(/\[.*?\]/g, "")
        .replace(/\(.*?\)/g, "")
        .trim()
        .toLowerCase();
}

function normalizeName(str) {
    return String(str || "")
        .replace(/\(.*?\)/g, "")
        .trim()
        .toLowerCase();
}

function normalizeAlphabetical(str) {
    return String(str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .toLowerCase()
        .trim();
}