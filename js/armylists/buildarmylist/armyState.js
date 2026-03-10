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

export const HERO_LIMITS = {
 "Heroes of Legend": 18,
 "Heroes of Valour": 15,
 "Heroes of Fortitude": 12,
 "Minor Heroes": 6,
 "Independent Heroes": 0
}

export function getArmyStats(builder){

    let totalPoints = 0;
    let heroCount = 0;
    let warriorCount = 0;
    let bowCount = 0;
    let throwingCount = 0;

    builder.warbands.forEach(wb => {

        totalPoints += calculateModelCost(wb.hero);
        heroCount++;

        wb.warriors.forEach(w => {
            totalPoints += calculateModelCost(w) * w.count;
            warriorCount += w.count;
        });

        bowCount += countTaggedWarriorsInWarband(wb, "WarriorBow");
        throwingCount += countTaggedWarriorsInWarband(wb, "WarriorThrowing");
    });

    const modelCount = heroCount + warriorCount;
    const broken = Math.ceil(modelCount / 2);
    const quartered = Math.floor(modelCount / 4);
    const bowlimit = Math.ceil(warriorCount / 3);
    const bowsExceeded = bowCount > bowlimit;
    const throwingExceeded = throwingCount > bowlimit;

   return {
      totalPoints,
      modelCount,
      broken,
      quartered,
      bowCount,
      throwingCount,
      bowlimit,
      bowsExceeded,
      throwingExceeded
   }
}
export function calculateModelCost(model) {

    let total = Number(model.basePoints);

    if (model.selectedOptions?.length) {
        model.selectedOptions.forEach(opt => {
            total += Number(opt.cost);
        });
    }

    return total;
}
export function countTaggedWarriorsInWarband(wb, tagName) {

    let total = 0;

    wb.warriors.forEach(w => {

        const count = w.count || 0;

        // 🔹 A: Profil-Tag (z.B. WarriorBow)
        const hasProfileTag =
            w.tag?.includes(tagName);

        if (hasProfileTag) {
            total += count;
            return; // Option muss nicht mehr geprüft werden
        }

        // 🔹 B: Option-Tag
        const hasTaggedOption =
            w.selectedOptions?.some(opt =>
                opt.tag?.includes(tagName)
            );

        if (hasTaggedOption) {
            total += count;
        }
    });

    return total;
}