import { Settings } from "../settings.js";

export function applyThemeColors() {
    const r = document.documentElement;

    r.style.setProperty("--mode-background", Settings.colors.modeBackground);
    r.style.setProperty("--mode-writing", Settings.colors.modeWriting);
    r.style.setProperty("--color-headColor", Settings.colors.headColor);
    r.style.setProperty("--color-link", Settings.colors.link);
}
