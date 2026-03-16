import { Settings } from "../settings.js";

async function loadJson(path) {
    const r = await fetch(path);
    return await r.json();
}

/**
 * Lädt alle Profile, ggf. ohne Legacy-Profile
 */
export async function loadProfiles() {
    const data = await loadJson(`data/${Settings.language}/${Settings.version}/profiles.json`);

    if (!Settings.includeLegacy) {
        const filtered = {};
        Object.entries(data).forEach(([name, profile]) => {
            const hasLegacySource = profile.source?.some(s => 
                s.book === "Legacies of Middle-Earth - Forces of Evil" ||
                s.book === "Legacies of Middle-Earth - Forces of Good"
            );
            if (!hasLegacySource) {
                filtered[name] = profile;
            }
        });
        return filtered;
    }

    return data;
}

/**
 * Lädt alle Armeelisten, ggf. ohne Legacy-Armeelisten und ohne Legacy-Modelle
 */
export async function loadArmyLists() {
    const data = await loadJson(`data/${Settings.language}/${Settings.version}/armylists.json`);

    if (!Settings.includeLegacy) {
        const filteredLists = {};
        Object.entries(data).forEach(([name, army]) => {

            // 1️⃣ Armeeliste selbst hat Legacy-Tag → komplett skippen
            if (army.armyRules?.Legacy) return;

            // 2️⃣ Sonst einzelne Modelle filtern
            const newArmy = { ...army, models: {} };

            Object.entries(army.models || {}).forEach(([tier, models]) => {
                const filteredModels = models.filter(m => !m.armyRules?.Legacy);
                if (filteredModels.length) {
                    newArmy.models[tier] = filteredModels;
                }
            });

            // Nur laden, wenn noch mindestens ein Tier Modelle enthält
            if (Object.keys(newArmy.models).length) {
                filteredLists[name] = newArmy;
            }
        });

        return filteredLists;
    }

    return data;
}

/**
 * Lädt Definitions-Datei 
 */
export function loadDefinitions() {
    return loadJson(`data/${Settings.language}/${Settings.version}/definitions.json`);
}