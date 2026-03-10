import { state } from "./armyState.js";

export function updateGeneral(forceId = null) {

    const warbands = state.builder.warbands;

    if (!warbands.length) {
        state.builder.generalWarbandId = null;
        return;
    }

    // 1. Mandatory General prüfen
    const mandatory = warbands.find(wb => wb.isMandatoryGeneral);

    if (mandatory) {
        state.builder.generalWarbandId = mandatory.id;
        moveGeneralToTop();
        return;
    }

    // 2. Heroic Tier Rang bestimmen
    const tierPriority = {
        "Heroes of Legend": 4,
        "Heroes of Valour": 3,
        "Heroes of Fortitude": 2,
        "Minor Heroes": 1,
        "Independent Heroes": 0
    };

    // Höchstes Tier finden
    let highest = -1;
    warbands.forEach(wb => {
        const value = tierPriority[wb.tier] ?? 0;
        if (value > highest) highest = value;
    });

    const candidates = warbands.filter(wb =>
        (tierPriority[wb.tier] ?? 0) === highest
    );

    // 3. Wenn force gesetzt (Button-Klick)
    if (forceId && candidates.some(c => c.id === forceId)) {
        state.builder.generalWarbandId = forceId;
        moveGeneralToTop();
        return;
    }

    // 4. Wenn nur ein Kandidat → automatisch
    if (candidates.length === 1) {
        state.builder.generalWarbandId = candidates[0].id;
        moveGeneralToTop();
        return;
    }

    // 5. Mehrere Kandidaten → bestehender behalten falls valide
    if (state.builder.generalWarbandId &&
        candidates.some(c => c.id === state.builder.generalWarbandId)) {

        moveGeneralToTop();
        return;
    }

    // Default = erster Kandidat
    state.builder.generalWarbandId = candidates[0].id;
    moveGeneralToTop();
}
export function createMandatoryGeneralIfExists() {

    const models = state.builder.armylist.models;

    for (const tier in models) {

        const heroData = models[tier]
            .find(h => h.tag?.includes("MandatoryGeneral"));

        if (heroData) {

            const warband = {
                id: "wb_mandatory",
                tier,
                isMandatoryGeneral: true,
                hero: {
    name: heroData.name,
    basePoints: Number(heroData.points),
    tag: heroData.tag || [],   // ← hinzufügen
    selectedOptions: [],
    mandatory: heroData.mandatory || [],
    options: heroData.options || []
},
                    warriors: []
                };

            state.builder.warbands.push(warband);
            state.builder.generalWarbandId = warband.id;
            return;
        }
    }
}
export function moveGeneralToTop() {

    const index = state.builder.warbands
        .findIndex(wb => wb.id === state.builder.generalWarbandId);

    if (index <= 0) return;

    const general = state.builder.warbands.splice(index, 1)[0];
    state.builder.warbands.unshift(general);
}
export function getGeneralCandidates() {

    const warbands = state.builder.warbands;

    const mandatory = warbands.find(wb => wb.isMandatoryGeneral);
    if (mandatory) return [mandatory];

    const tierPriority = {
        "Heroes of Legend": 4,
        "Heroes of Valour": 3,
        "Heroes of Fortitude": 2,
        "Minor Heroes": 1,
        "Independent Heroes": 0
    };

    let highest = -1;

    warbands.forEach(wb => {
        const value = tierPriority[wb.tier] ?? 0;
        if (value > highest) highest = value;
    });

    return warbands.filter(wb =>
        (tierPriority[wb.tier] ?? 0) === highest
    );
}
export function moveWarbandUp(index) {

    if (index <= 0) return;

    const generalIndex = state.builder.warbands
        .findIndex(wb => wb.id === state.builder.generalWarbandId);

    if (index - 1 === generalIndex) return;

    const temp = state.builder.warbands[index];
    state.builder.warbands[index] = state.builder.warbands[index - 1];
    state.builder.warbands[index - 1] = temp;

    rerenderArmyList();
}
export function moveWarbandDown(index) {

    if (index >= state.builder.warbands.length - 1) return;

    const generalIndex = state.builder.warbands
        .findIndex(wb => wb.id === state.builder.generalWarbandId);

    if (index + 1 === generalIndex) return;

    const temp = state.builder.warbands[index];
    state.builder.warbands[index] = state.builder.warbands[index + 1];
    state.builder.warbands[index + 1] = temp;

    rerenderArmyList();
}
export function deleteWarband(index) {

    const wb = state.builder.warbands[index];

    if (wb.isMandatoryGeneral) return;

    state.builder.warbands.splice(index, 1);

    updateGeneral();
    rerenderArmyList();
}
export function isHeroAlreadyInArmy(heroName) {

    return state.builder.warbands.some(wb => {

        // 1️⃣ Hero der Warband
        if (wb.hero.name === heroName) return true;

        // 2️⃣ Hero innerhalb Warband
        const existsInFollowers = wb.warriors.some(w =>
            w.name === heroName
        );

        return existsInFollowers;
    });
}
export function handleOptionSelection(model, opt) {

    if (!model.selectedOptions) {
        model.selectedOptions = [];
    }

    const exists = model.selectedOptions
        .some(o => o.name === opt.name);

    const isOptionalWarrior =
        model.optionalWarrior?.some(o => o.name === opt.name);

    const isMandatoryWarrior =
        model.mandatoryWarrior?.some(o => o.name === opt.name);

    // 1️⃣ Gleiche Option erneut gewählt → entfernen
    if (exists) {
        model.selectedOptions =
            model.selectedOptions.filter(o => o.name !== opt.name);
        return;
    }

    // 2️⃣ optionalWarrior oder mandatoryWarrior → Single-Select Verhalten
    if (isOptionalWarrior || isMandatoryWarrior) {

        // vorhandene Warrior-Option entfernen
        model.selectedOptions = model.selectedOptions.filter(o =>
            !model.optionalWarrior?.some(x => x.name === o.name) &&
            !model.mandatoryWarrior?.some(x => x.name === o.name)
        );

        model.selectedOptions.push(opt);
        return;
    }

    // 3️⃣ Normale Multi-Option
    model.selectedOptions.push(opt);
}