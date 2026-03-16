
const tierPriority = {
    "Heroes of Legend": 4,
    "Heroes of Valour": 3,
    "Heroes of Fortitude": 2,
    "Minor Heroes": 1,
    "Independent Heroes": 0
}; export const Rules = {

    /* =========================
       ARMY LIMITS
    ========================= */

    getWarbandLimit(wb, builder) {

        const tierLimits = {
            "Heroes of Legend": 18,
            "Heroes of Valour": 15,
            "Heroes of Fortitude": 12,
            "Minor Heroes": 6,
            "Independent Heroes": 0
        };

        let limit = tierLimits[wb.tier] ?? 0;


        return limit;
    },
    getBreakpoint(modelcount, builder) {

        let breakpoint = 2;

        breakpoint = applyArmyRuleOverrides("Breakpoint", breakpoint, builder);

        const broken = Math.ceil(modelcount / breakpoint);

        return broken;
    },
    getBowLimit(warriorCount, builder) {

    let bowlimit = 3;

    bowlimit = applyArmyRuleOverrides("BowLimit", bowlimit, builder);

    const limit = Math.ceil(warriorCount / bowlimit);

    return limit;
},
    getThrowingLimit(warriorCount, builder) {

        let throwinglimit = 3;

        throwinglimit = applyArmyRuleOverrides("ThrowingLimit", throwinglimit, builder);

        const limit = Math.ceil(warriorCount / throwinglimit);

        return limit;
    },

    /* =========================
       MODEL PERMISSION
    ========================= */

    canAddHero(builder, hero) {

        if (checkMaximum(builder, hero)) return false;
        if (checkNoCaptain(hero)) return false;
        if (!checkDepends(builder, hero)) return false;

        return true;
    },
    getAvailableFollowers(builder, captain) {
        const models = builder.armylist.models;
        const mode = getWarbandMode(builder);
        const modelsTiers = [];

        for (const tier in models) {

            models[tier].forEach(model => {

                modelsTiers.push({
                    ...model,
                    tier
                });

            });

        }

return modelsTiers.filter((follower) => {

    if (!checkWarbandLimit(builder, captain, follower)) return false;
    if (!checkFollowersRule(captain, follower)) return false;
    if (!checkDepends(builder, follower)) return false;
    if (checkMaximum(builder, follower)) return false;

    const captainTier = tierPriority[captain.tier] ?? 0;
    const followerTier = tierPriority[follower.tier] ?? -1;

    const heroFollower = hasHeroFollower(builder);

    /* ========================================
       ONE MODE
    ======================================== */

    if (mode.type === "One") {

        if (followerTier >= 0)
            return followerTier <= captainTier;

        return true;
    }


    /* ========================================
       CONDITIONAL BLOCKED MODELS
    ======================================== */

    if (heroFollower) {

        const blocked = builder.armylist.armyRules?.blockedBy || [];

        if (blocked.includes(follower.name))
            return false;
    }
    /* ========================================
       OPTIONAL MODE
    ======================================== */

    if (mode.type === "Optional") {

        if (builder.warbands.length > 1 && followerTier > 0)
            return false;

        if (builder.warbands.length === 1 && followerTier > 0)
            return followerTier <= captainTier;
    }

    /* ========================================
       STANDARD CAPTAIN RULE
    ======================================== */

    if (!checkCaptainsAndTier(captain, follower))
        return false;

    return true;
});

    },

    /* =========================
       GENERAL RULE ENGINE
    ========================= */

    getGeneral(builder, forceId = null) {

        const warbands = builder.warbands;

        if (!warbands.length) return null;

        /* 1️⃣ Mandatory General */

        const mandatory = warbands.find(wb =>
            wb.hero.armyRules?.General === "Mandatory"
        );

        if (mandatory) return mandatory.id;


        /* 2️⃣ Highest Rank Number */

        const ranked = warbands
            .filter(wb =>
                typeof wb.hero.armyRules?.General === "number"
            );

        if (ranked.length) {

            ranked.sort((a, b) =>
                b.hero.armyRules.General - a.hero.armyRules.General
            );

            return ranked[0].id;
        }


        /* 3️⃣ Option General */

        const optionWarbands = warbands.filter(wb =>
            wb.hero.armyRules?.General === "Option"
        );

        if (optionWarbands.length === 1) {
            return optionWarbands[0].id;
        }


        /* 4️⃣ Heroic Tier System */

        const valid = warbands.filter(wb =>
            wb.hero.armyRules?.General !== "No"
        );

        let highest = -1;

        valid.forEach(wb => {

            const value = tierPriority[wb.tier] ?? 0;

            if (value > highest) highest = value;
        });

        const candidates = valid.filter(wb =>
            (tierPriority[wb.tier] ?? 0) === highest
        );


        /* 5️⃣ Manual selection */

        if (forceId && candidates.some(c => c.id === forceId)) {
            return forceId;
        }

        if (candidates.length === 1) {
            return candidates[0].id;
        }

        if (
            builder.generalWarbandId &&
            candidates.some(c => c.id === builder.generalWarbandId)
        ) {
            return builder.generalWarbandId;
        }

        return candidates[0]?.id || null;
    },

    getGeneralCandidates(builder) {

        const warbands = builder.warbands;

        if (!warbands.length) return [];

        /* 1️⃣ Mandatory */

        const mandatory = warbands.filter(wb =>
            wb.hero.armyRules?.General === "Mandatory"
        );

        if (mandatory.length) {
            return mandatory;
        }

        /* 2️⃣ Ranked number */

        const ranked = warbands.filter(wb =>
            typeof wb.hero.armyRules?.General === "number"
        );

        if (ranked.length) {

            ranked.sort((a, b) =>
                b.hero.armyRules.General - a.hero.armyRules.General
            );

            return [ranked[0]];
        }

        /* 3️⃣ Option */

        const options = warbands.filter(wb =>
            wb.hero.armyRules?.General === "Option"
        );

        if (options.length) {
            return options;
        }

        /* 4️⃣ Heroic Tier */

        const tierPriority = {
            "Heroes of Legend": 4,
            "Heroes of Valour": 3,
            "Heroes of Fortitude": 2,
            "Minor Heroes": 1,
            "Independent Heroes": 0
        };

        const valid = warbands.filter(wb =>
            wb.hero.armyRules?.General !== "No"
        );

        let highest = -1;

        valid.forEach(wb => {

            const value = tierPriority[wb.tier] ?? 0;

            if (value > highest) highest = value;
        });

        return valid.filter(wb =>
            (tierPriority[wb.tier] ?? 0) === highest
        );
    },

    /* =========================
   ARMY VALIDATION
========================= */

validateArmy(builder, stats) {

    const warnings = [];

    warnings.push(
        ...validateGeneralRules(builder),
        ...validateArmyDistributions(builder),
        ...validateBowLimit(stats),
        ...validateThrowingLimit(stats),
        ...validateMandatoryWarriorOptions(builder),
        ...validateSiegeEngineLimit(builder)
    );

    return warnings;
}

};

/* =========================
   RULE HELPERS
========================= */

function applyArmyRuleOverrides(tag, value, builder) {

    const rules = builder.armylist.armyRules;

    if (!rules) return value;

    if (rules[tag]) {
        return rules[tag];
    }

    return value;
}
export function getWarbandMode(builder) {

    const rule = builder.armylist.armyRules?.Warband;

    if (!rule) return { type: "Normal" };

    if (rule === "One") return { type: "One" };

    if (rule === "Optional") return { type: "Optional" };

    if (rule === "Conditional") {

        const armyModels = builder.warbands
            .flatMap(wb => [
                wb.hero.name,
                ...wb.followers.map(f => f.name)
            ]);

        const blocked = builder.armylist.armyRules.blockedBy?.some(m =>
            armyModels.includes(m)
        );

        if (blocked) return { type: "Normal" };

        return { type: "Optional" };
    }

    return { type: "Normal" };
}
export function hasHeroFollower(builder) {

    return builder.warbands.some(wb =>
        wb.followers.some(f =>
            f.tier !== "Warriors"
        )
    );
}
export function checkMaximum(builder, model) {

    const max = model.armyRules?.Maximum;

    if (!max) return false;

    let count = 0;

    builder.warbands.forEach(wb => {

        if (wb.hero.name === model.name) {
            count++;
        }

        wb.followers.forEach(w => {
            if (w.name === model.name) {
                count += w.count || 1;
            }
        });

    });

    return count >= max;
}
function checkNoCaptain(model) {

    const captain = model.armyRules?.Captain;

    if (captain == "No") return true;
    return false

}
function checkDepends(builder, model) {

    const rules = model.armyRules;

    if (!rules?.Depends) return true;

    const armyModels = builder.warbands
        .flatMap(wb => [wb.hero, ...wb.followers])
        .map(m => m.name);

    return rules.Depends.some(dep => armyModels.includes(dep));
}
function checkCaptainsAndTier(captain, model) {

    const rules = model.armyRules;

    if (rules?.Captains) return rules.Captains.includes(captain.name);
    
    const allowed = [
        "Warriors",
        "Independent Heroes"
    ];

    return allowed.includes(model.tier);

}
function checkWarbandLimit(builder, captain, follower) {

    const warband = builder.warbands.find(wb => wb.hero.name === captain.name);

    if (!warband) return true;

    const limit = Rules.getWarbandLimit(warband, builder);

    const currentCount = warband.followers.reduce(
        (s, w) => s + (w.count || 1),
        0
    );

    const addCount = getCompositionFollowerCount(follower);

    if (currentCount + addCount > limit) {
        return false;
    }

    return true;
}
function checkFollowersRule(captain, model) {

    const rules = captain.armyRules;

    if (!rules?.Followers) return true;

    if (!rules.Followers.length) return false;

    return rules.Followers.includes(model.name);
}
function validateGeneralRules(builder) {

    const allHeroes = Object.values(builder.armylist.models)
        .flat()
        .filter(m => m.armyRules?.General === "Option");

    if (!allHeroes.length) return [];

    const present = builder.warbands.some(wb =>
        wb.hero.armyRules?.General === "Option"
    );

    if (!present) {
        return [{
            type: "missingOptionGeneral",
            message: "One of the required General options must be included."
        }];
    }

    return [];
}
function validateArmyDistributions(builder) {

    const rules = builder.armylist.armyRules?.ArmyDistributions;

    if (!rules?.length) return [];

    const warnings = [];

    const { counts, total, groupModels } = getDistributionCounts(builder);

    rules.forEach(rule => {

        const groupCount = counts[rule.group] || 0;
        const models = groupModels[rule.group] || [];

        const modelList = models.map(m => `- ${m}`).join("\n");

        /* MIN */

        if (rule.min !== undefined && groupCount < rule.min) {

            warnings.push({
                type: "distributionMin",
                message:
                    `You need at least ${rule.min} of the following models:
${modelList}`
            });

        }

        /* MAX */

        if (rule.max !== undefined && groupCount > rule.max) {

            warnings.push({
                type: "distributionMax",
                message:
                    `You may include at most ${rule.max} of the following models:
${modelList}`
            });

        }

        /* MAX PER GROUP */

        if (rule.maxPer) {

            const refCount = counts[rule.maxPer] || 0;

            if (groupCount > refCount) {

                warnings.push({
                    type: "distributionMaxPer",
                    message:
                        `${rule.group} cannot exceed ${rule.maxPer}`
                });

            }

        }

        /* RATIO */

        if (rule.maxRatio !== undefined) {

            const allowedMax = total / groupCount;

            if (allowedMax < rule.maxRatio) {

                warnings.push({
                    type: "distributionRatio",
                    message:
                        `${rule.group} may only form ${Math.round(1 / rule.maxRatio * 100)}% of the army`
                });

            }

        }

        /* EXCLUSION */

        if (rule.excludes) {

            const otherCount = counts[rule.excludes] || 0;

            if (groupCount > 0 && otherCount > 0) {

                warnings.push({
                    type: "distributionExclusion",
                    message:
                        `${rule.group} cannot be used together with ${rule.excludes}`
                });

            }

        }

    });

    return warnings;

}
function validateBowLimit(stats) {

    if (!stats.bowsExceeded) return [];

    return [{
        type: "bowLimit",
        message: `Bow limit exceeded (${stats.bowCount}/${stats.bowLimit})`
    }];
}
function validateThrowingLimit(stats) {

    if (!stats.throwingExceeded) return [];

    return [{
        type: "throwingLimit",
        message: `Throwing weapon limit exceeded (${stats.throwingCount}/${stats.throwingLimit})`
    }];
}
function validateMandatoryWarriorOptions(builder) {

    const warnings = [];

    builder.warbands.forEach((wb, wbIndex) => {

        wb.followers.forEach((w, wIndex) => {

            if (!w.mandatoryWarrior?.length) return;

            const selected = w.selectedOptions?.some(opt =>
                w.mandatoryWarrior.some(m => m.name === opt.name)
            );

            if (!selected) {

                warnings.push({
                    type: "mandatoryWarrior",
                    message: `${w.name} in Warband ${wbIndex + 1} must select a mandatory option`
                });

            }

        });

    });

    return warnings;
}
function validateSiegeEngineLimit(builder) {

    const warnings = [];

    let siegeWarbands = 0;
    let validHeroes = 0;

    builder.warbands.forEach(wb => {

        /* Siege Engine erkennen */

        if (wb.tier === "Siege Engines") {
            siegeWarbands++;
            return;
        }

        /* erlaubte Hero-Tiers */

        if (
            wb.tier === "Heroes of Fortitude" ||
            wb.tier === "Heroes of Valour" ||
            wb.tier === "Heroes of Legend"
        ) {
            validHeroes++;
        }

    });

    if (siegeWarbands > validHeroes) {

        warnings.push({
            type: "siegeEngineLimit",
            message:
                `Too many Siege Engines (${siegeWarbands}). ` +
                `You may include at most ${validHeroes} Siege Engine warbands.`
        });

    }

    return warnings;
}
function getDistributionCounts(builder) {

    const rules = builder.armylist.armyRules?.ArmyDistributions || [];

    const counts = {};
    const groupModels = {};
    let total = 0;

    /* Gruppen vorbereiten */

    rules.forEach(r => {

        counts[r.group] = 0;

        groupModels[r.group] = r.models || [];

    });

    /* Modelle zählen */

    builder.warbands.forEach(wb => {

        countModel(wb.hero.name, 1);

        wb.followers.forEach(w => {
            countModel(w.name, w.count);
        });

    });

    function countModel(name, amount) {

        total += amount;

        Object.entries(groupModels).forEach(([group, models]) => {

            if (models.includes(name)) {

                counts[group] += amount;

            }

        });

    }

    return { counts, total, groupModels };

}
function getCompositionFollowerCount(model) {

    if (!model.composition) return 1;

    let count = 0;

    model.composition.forEach(m => {

        count += m.amount || 1;

    });

    return count;
}