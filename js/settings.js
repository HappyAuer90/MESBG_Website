import { t } from "./utility/i18n.js";

// =====================
// SETTINGS STATE
// =====================

export const Settings = {
    version: "2024",
    theme: "light",
    language: "en",

    colors: {
        modeBackground: "white",
        modeWriting: "black",
        headColor: "red",
        linkColor: "#4da3ff"
    },

    profileSettings: {
        enableDetailsLink: true,
        enableRulesLink: true,
        enableProfilesLink: true,
        showGWFAQNotes: true,
        showSpecialRulesFromArmylists: true
    },

    includeLegacy: true,

    load() {
        try {
            const raw = localStorage.getItem("mesbg_settings");
            if (!raw) return;

            const saved = JSON.parse(raw);
            if (!saved || typeof saved !== "object") return;

            Object.assign(this, {
                ...saved,
                colors: {
                    ...this.colors,
                    ...(saved.colors || {})
                },
                profileSettings: {
                    ...this.profileSettings,
                    ...(saved.profileSettings || {})
                }
            });
        } catch (error) {
            console.warn("Could not load settings:", error);
        }
    },

    save() {
        try {
            localStorage.setItem(
                "mesbg_settings",
                JSON.stringify({
                    version: this.version,
                    theme: this.theme,
                    language: this.language,
                    colors: this.colors,
                    profileSettings: this.profileSettings,
                    includeLegacy: this.includeLegacy
                })
            );
        } catch (error) {
            console.warn("Could not save settings:", error);
        }
    }
};

// =====================
// SETTINGS UI HELPERS
// =====================

function applyThemeFromSettings() {
    const root = document.documentElement;

    root.style.setProperty("--mode-background", Settings.colors.modeBackground);
    root.style.setProperty("--mode-writing", Settings.colors.modeWriting);
    root.style.setProperty("--color-headColor", Settings.colors.headColor);
    root.style.setProperty("--color-link", Settings.colors.linkColor);
}

function setCheckboxValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.checked = Boolean(value);
    }
}

function bindCheckbox(id, getter, setter) {
    const element = document.getElementById(id);
    if (!element) return;

    element.checked = Boolean(getter());
    element.onchange = e => {
        setter(Boolean(e.target.checked));
        Settings.save();
    };
}

// =====================
// SETTINGS UI
// =====================

export function initSettingsUI() {
    const modal = document.getElementById("settingsModal");
    if (!modal) return;

    modal.innerHTML = `
        <h3>${t("settings.title")}</h3>

        <div class="settings-tabs">
            <button data-tab="version">${t("settings.version")}</button>
            <button data-tab="graphics">${t("settings.graphics")}</button>
            <button data-tab="profiles">${t("settings.profiles")}</button>
        </div>

        <div class="settings-content">

            <div class="tab active" id="tab-version">
                <label>
                    <input type="radio" name="version" value="2024">
                    2024
                </label><br>
                <label style="margin-left: 20px;">
                    <input type="checkbox" id="includeLegacy">
                    ${t("settings.includeLegacy")}
                </label><br>
                <label>
                    <input type="radio" name="version" value="2001">
                    2001
                </label>
            </div>

            <div class="tab" id="tab-graphics">
                <label>
                    <input type="checkbox" id="nightMode">
                    ${t("settings.nightMode")}
                </label><br>
                <label>
                    ${t("settings.headColor")}
                    <input type="color" id="headColor">
                </label><br>
                <label>
                    ${t("settings.linkColor")}
                    <input type="color" id="linkColor">
                </label>
            </div>

            <div class="tab" id="tab-profiles">
                <label>
                    <input type="checkbox" id="enableDetailsLink">
                    ${t("settings.crossLinksWargear")}
                </label><br>
                <label>
                    <input type="checkbox" id="enableRulesLink">
                    ${t("settings.crossLinksRules")}
                </label><br>
                <label>
                    <input type="checkbox" id="enableProfilesLink">
                    ${t("settings.crossLinksProfiles")}
                </label><br>
                <label>
                    <input type="checkbox" id="showGWFAQNotes">
                    ${t("settings.showGWFAQNotes")}
                </label><br>
                <label>
                    <input type="checkbox" id="showSpecialRulesFromArmylists">
                    ${t("settings.showSpecialRulesFromArmylists")}
                </label>
            </div>
        </div>

        <br>
        <button id="closeSettings">${t("settings.close")}</button>
    `;

    const tabs = modal.querySelectorAll(".settings-tabs button");
    const contents = modal.querySelectorAll(".tab");

    tabs.forEach(btn => {
        btn.onclick = () => {
            tabs.forEach(tab => tab.classList.remove("active"));
            contents.forEach(content => content.classList.remove("active"));

            btn.classList.add("active");
            const target = modal.querySelector(`#tab-${btn.dataset.tab}`);
            if (target) {
                target.classList.add("active");
            }
        };
    });

    applyThemeFromSettings();

    setCheckboxValue("nightMode", Settings.theme === "dark");
    setCheckboxValue("enableDetailsLink", Settings.profileSettings.enableDetailsLink);
    setCheckboxValue("enableRulesLink", Settings.profileSettings.enableRulesLink);
    setCheckboxValue("enableProfilesLink", Settings.profileSettings.enableProfilesLink);
    setCheckboxValue("showGWFAQNotes", Settings.profileSettings.showGWFAQNotes);
    setCheckboxValue("showSpecialRulesFromArmylists", Settings.profileSettings.showSpecialRulesFromArmylists);

    const legacyCheckbox = document.getElementById("includeLegacy");
    if (legacyCheckbox) {
        legacyCheckbox.checked = Settings.includeLegacy;
        legacyCheckbox.disabled = Settings.version !== "2024";
        legacyCheckbox.onchange = e => {
            Settings.includeLegacy = e.target.checked;
            Settings.save();
            location.reload();
        };
    }

    const nightMode = document.getElementById("nightMode");
    if (nightMode) {
        nightMode.onchange = e => {
            const dark = e.target.checked;

            Settings.theme = dark ? "dark" : "light";
            Settings.colors.modeBackground = dark ? "black" : "white";
            Settings.colors.modeWriting = dark ? "white" : "black";

            applyThemeFromSettings();
            Settings.save();
        };
    }

    const headColor = document.getElementById("headColor");
    if (headColor) {
        headColor.value = Settings.colors.headColor;
        headColor.oninput = e => {
            Settings.colors.headColor = e.target.value;
            applyThemeFromSettings();
            Settings.save();
        };
    }

    const linkColor = document.getElementById("linkColor");
    if (linkColor) {
        linkColor.value = Settings.colors.linkColor;
        linkColor.oninput = e => {
            Settings.colors.linkColor = e.target.value;
            applyThemeFromSettings();
            Settings.save();
        };
    }

    bindCheckbox(
        "enableDetailsLink",
        () => Settings.profileSettings.enableDetailsLink,
        value => {
            Settings.profileSettings.enableDetailsLink = value;
        }
    );

    bindCheckbox(
        "enableRulesLink",
        () => Settings.profileSettings.enableRulesLink,
        value => {
            Settings.profileSettings.enableRulesLink = value;
        }
    );

    bindCheckbox(
        "enableProfilesLink",
        () => Settings.profileSettings.enableProfilesLink,
        value => {
            Settings.profileSettings.enableProfilesLink = value;
        }
    );

    bindCheckbox(
        "showGWFAQNotes",
        () => Settings.profileSettings.showGWFAQNotes,
        value => {
            Settings.profileSettings.showGWFAQNotes = value;
        }
    );

    bindCheckbox(
        "showSpecialRulesFromArmylists",
        () => Settings.profileSettings.showSpecialRulesFromArmylists,
        value => {
            Settings.profileSettings.showSpecialRulesFromArmylists = value;
        }
    );

    modal.querySelectorAll("input[name='version']").forEach(radio => {
        radio.checked = radio.value === Settings.version;

        radio.onchange = e => {
            Settings.version = e.target.value;
            Settings.save();

            if (legacyCheckbox) {
                legacyCheckbox.disabled = Settings.version !== "2024";
                if (legacyCheckbox.disabled) {
                    legacyCheckbox.checked = false;
                    Settings.includeLegacy = false;
                }
            }

            location.reload();
        };
    });

    const closeButton = document.getElementById("closeSettings");
    if (closeButton) {
        closeButton.onclick = () => modal.classList.add("hidden");
    }
}
