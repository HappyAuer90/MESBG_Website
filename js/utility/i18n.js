import { Settings } from "../settings.js";
import en from "./i18n_en.js";
import de from "./i18n_de.js";

const LANGS = { en, de };

export function t(key) {
    const dict = LANGS[Settings.language];
    return key.split(".").reduce(
        (obj, k) => obj?.[k],
        dict
    ) ?? key;
}
