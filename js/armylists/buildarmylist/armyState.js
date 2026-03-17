export const state = {
    mode: "interactive",

    armyLists: null,
    profiles: null,
    profileByName: null,

    container: null,
    history: [],
    currentArmylistId: null,

    builder: {
        armylist: null,
        warbands: [],
        generalWarbandId: null
    }
};

export function getArmyStats(builder, Rules) {

    let totalPoints = 0;

    let heroCount = 0;
    let warriorCount = 0;

    let bowCount = 0;
    let bows = 0;

    let throwingCount = 0;
    let throwing = 0;

    let might = 0;
    let will = 0;
    let fate = 0;

    let banners = 0;
    let cavalry = 0;
    let monster = 0;

    let ignoredFollowers = 0;
    let additionalFollowers = 0;

    builder.warbands.forEach(wb => {

        /* ======================
           Captain
        ====================== */

        totalPoints += calculateModelCost(wb.hero);

        if (isHero(wb.hero))
            heroCount++;
            addHeroStats(wb.hero, 1);

        processRules(wb.hero, 1);


        /* ======================
           FOLLOWERS
        ====================== */

        wb.followers.forEach(f => {

            const count = f.count || 1;

            totalPoints += calculateModelCost(f) * count;

            if (isWarrior(f, wb))
                warriorCount += count;
            else
                heroCount += count;
                addHeroStats(f, 1);

            processRules(f, count);

        });

    });


    /* ======================
       ARMY TOTALS
    ====================== */

    const modelCount = heroCount + warriorCount + additionalFollowers - ignoredFollowers;

    const broken = Rules.getBreakpoint(modelCount, builder);
    const quartered = Math.floor(modelCount / 4);

    const bowLimit = Rules.getBowLimit(warriorCount, builder);
    const throwingLimit = Rules.getThrowingLimit(warriorCount, builder);

    const bowsExceeded = bowCount > bowLimit;
    const throwingExceeded = throwingCount > throwingLimit;


    return {
        totalPoints,
        modelCount,
        broken,
        quartered,

        bows,
        bowCount,
        bowLimit,
        bowsExceeded,

        throwing,
        throwingCount,
        throwingLimit,
        throwingExceeded,
        
        might,
        will,
        fate,

        banners,
        cavalry,
        monster
    };


    /* ======================
       RULE PROCESSOR
    ====================== */

    function processRules(model, count) {

        if (modelOrOptionsHaveRule(model, "Bow", "limit", "count"))
            bowCount += count;

        if (modelOrOptionsHaveRule(model, "Bow"))
            bows += count;

        if (modelOrOptionsHaveRule(model, "Throwing", "limit", "count"))
            throwingCount += count;

        if (modelOrOptionsHaveRule(model, "Throwing"))
            throwing += count;

        if (modelOrOptionsHaveRule(model, "Banner"))
            banners += count;

        if (modelOrOptionsHaveRule(model, "Cavalry"))
            cavalry += count;

        if (modelOrOptionsHaveRule(model, "Monster"))
            monster += count;

        if (modelOrOptionsHaveRule(model, "NotCount", null, "Army"))
            ignoredFollowers += count;

        const countAs = getModelOrOptionRuleValue(model, "CountAs");
        additionalFollowers += (countAs || 0) * count;
    }

    

function addHeroStats(model, count) {

    const profile =
        state.profiles?.[model.name];
        
    if (!profile?.characteristicsHero) return;

    const heroStats = profile.characteristicsHero;

    const m = Number(heroStats.might) || 0;
    const w = Number(heroStats.will) || 0;
    const f = Number(heroStats.fate) || 0;

    might += m * count;
    will += w * count;
    fate += f * count;
}
}

/* =========================
   HERO / WARRIOR DETECTION
========================= */

function isHero(model) {

    return model.tier !== "Warriors";
}

function isWarrior(model, warband) {

    /* Siege Engine Sonderfall */

    if (warband.tier === "Siege Engines")
        return true;

    return model.tier === "Warriors";
}


/* =========================
   COST
========================= */

export function calculateModelCost(model) {

    let total = Number(model.basePoints) || 0;

    if (model.selectedOptions?.length) {

        model.selectedOptions.forEach(opt => {
            total += Number(opt.cost) || 0;
        });

    }

    return total;
}


/* =========================
   RULE DETECTION
========================= */
export function countRuleModelsInWarband(
    wb,
    ruleName,
    ruleKey = null,
    ruleValue = null
) {

    let total = 0;

    /* HERO */

    if (modelOrOptionsHaveRule(wb.hero, ruleName, ruleKey, ruleValue)) {
        total += 1;
    }

    /* FOLLOWERS */

    wb.followers.forEach(f => {

        const count = f.count || 1;

        if (modelOrOptionsHaveRule(f, ruleName, ruleKey, ruleValue)) {
            total += count;
        }

    });

    return total;
}

function modelOrOptionsHaveRule(model, ruleName, ruleKey, ruleValue) {

    if (modelHasRule(model, ruleName, ruleKey, ruleValue))
        return true;

    if (!model.selectedOptions?.length)
        return false;

    return model.selectedOptions.some(opt =>
        modelHasRule(opt, ruleName, ruleKey, ruleValue)
    );
}

function modelHasRule(model, ruleName, ruleKey = null, ruleValue = null) {

    const rule = model.armyRules?.[ruleName];

    if (!rule) return false;

    /* VALUE CHECK */

    if (ruleKey === null && ruleValue !== null)
        return rule === ruleValue;

    /* EXISTENCE CHECK */

    if (!ruleKey)
        return true;

    /* KEY EXISTENCE */

    if (ruleValue === null)
        return rule[ruleKey] !== undefined;

    /* EXACT MATCH */

    return rule[ruleKey] === ruleValue;
}
function getModelOrOptionRuleValue(model, ruleName) {

    const modelRule = model.armyRules?.[ruleName];

    if (modelRule !== undefined)
        return modelRule;

    if (!model.selectedOptions?.length)
        return null;

    for (const opt of model.selectedOptions) {

        const optRule = opt.armyRules?.[ruleName];

        if (optRule !== undefined)
            return optRule;
    }

    return null;
}