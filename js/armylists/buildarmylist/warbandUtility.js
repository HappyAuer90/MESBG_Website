import { state } from "./armyState.js";
import { Rules } from "./armylistRules.js";
import { rerenderArmyList } from "./renderArmy.js";

export function updateGeneral(forceId = null) {

    const id = Rules.getGeneral(state.builder, forceId);

    state.builder.generalWarbandId = id;

    moveGeneralToTop();
}
export function createMandatoryModels() {

    const models = state.builder.armylist.models;

    for (const tier in models) {

        models[tier].forEach(heroData => {

            if (heroData.armyRules?.General === "Mandatory") {

                const warbands =
                    createWarbandsFromModel(heroData, tier);

                const wb = warbands[0];

                wb.id = "wb_mandatory_general";
                wb.isMandatoryGeneral = true;

                state.builder.warbands.push(wb);
                state.builder.generalWarbandId = wb.id;
            }

            if (heroData.armyRules?.Captain === "Mandatory") {

                const warbands =
                    createWarbandsFromModel(heroData, tier);

                warbands.forEach(wb => {

                    wb.id = `wb_mandatory_${heroData.name}`;
                    wb.isMandatoryCaptain = true;

                    state.builder.warbands.push(wb);
                });

            }

        });

    }

}
export function createWarbandsFromModel(model, tier) {

    if (!model.composition) {
        return [{
            id: "wb_" + Date.now(),
            tier,
            hero: createHero(model, tier),
            followers: []
        }];
    }

    const compositionId = "comp_" + Date.now();

    const captains = model.composition
        .filter(m => m.compositionModel === "Captain");

    const followers = model.composition
        .filter(m => m.compositionModel !== "Captain");

    const warbands = [];

    captains.forEach((captainData, i) => {

        const warband = {
            id: "wb_" + Date.now() + "_" + i,
            tier,
            hero: createHero(captainData, tier),
            followers: [],
            compositionId,
            compositionLocked: true
        };

        followers.forEach(f => {

            warband.followers.push({
                ...createHero(f, "Warriors"),
                count: f.amount || 1,
                compositionLocked: true
            });

        });

        warbands.push(warband);

    });

    return warbands;
}
export function moveGeneralToTop() {

    const index = state.builder.warbands
        .findIndex(wb => wb.id === state.builder.generalWarbandId);

    if (index <= 0) return;

    const general = state.builder.warbands.splice(index, 1)[0];
    state.builder.warbands.unshift(general);
}
export function getGeneralCandidates() {
    return Rules.getGeneralCandidates(state.builder);
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
    if (wb.isMandatoryCaptain) return;

    // Composition Warbands
    if (wb.compositionId) {

        state.builder.warbands =
            state.builder.warbands.filter(
                w => w.compositionId !== wb.compositionId
            );

    } else {

        state.builder.warbands.splice(index, 1);

    }

    updateGeneral();
    rerenderArmyList();
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
export function createHero(heroData, tier){
 return {
   name: heroData.name,
   tier,
   basePoints: Number(heroData.points),
   armyRules: heroData.armyRules || {},
   selectedOptions: [],
   mandatory: heroData.mandatory || [],
   options: heroData.options || []
 }
}