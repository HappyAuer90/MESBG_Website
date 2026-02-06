import { Settings } from "../settings.js";

async function loadJson(path) {
    const r = await fetch(path);
    return await r.json();
}

export function loadProfiles() {
    return loadJson(`data/${Settings.language}/${Settings.version}/profiles.json`);
}

export function loadArmyLists() {
    return loadJson(`data/${Settings.language}/${Settings.version}/armylists.json`);
}

export function loadDefinitions() {
    return loadJson(`data/${Settings.language}/${Settings.version}/definitions.json`);
}
