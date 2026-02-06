import { t } from "./utility/i18n.js";

// =====================
// SETTINGS STATE
// =====================

export const Settings = {
    version: "2024",
    theme: "light",
    language: "de",

    profileSettings: {
        enableDetailsLink: true,
        enableRulesLink: true,
        enableProfilesLink: true,
        showGWFAQNotes: true 
							  
    },

    load() {
        const s = localStorage.getItem("mesbg_settings");
        if (s) Object.assign(this, JSON.parse(s));
    },

    save() {
        localStorage.setItem(
            "mesbg_settings",
            JSON.stringify({
                version: this.version,
                theme: this.theme,
                language: this.language,
                profileSettings: this.profileSettings
            })
        );
    }
};

// =====================
// SETTINGS UI
// =====================

export function initSettingsUI() {
    const modal = document.getElementById("settingsModal");

    modal.innerHTML = `
        <h3>${t("settings.title")}</h3>

        <div class="settings-tabs">
            <button data-tab="general" class="active">${t("settings.general")}</button>
            <button data-tab="graphics">${t("settings.graphics")}</button>
            <button data-tab="profiles">${t("settings.profiles")}</button>
            <button data-tab="version">${t("settings.version")}</button>
        </div>

        <div class="settings-content">

            <div class="tab active" id="tab-general">
                <label>
                    <input type="radio" name="language" value="en">
                    ${t("settings.english")}
                </label><br>
                <label>
                    <input type="radio" name="language" value="de">
                    ${t("settings.german")}
                </label>

            </div>

            <div class="tab" id="tab-graphics">
                <label>
                    <input type="checkbox" id="nightMode">
                    ${t("settings.nightMode")}
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
                </label>
            </div>

            <div class="tab" id="tab-version">
                <label>
                    <input type="radio" name="version" value="2024">
                    2024
                </label><br>
                <label>
                    <input type="radio" name="version" value="2022">
                    2022
                </label>
            </div>

        </div>

        <br>
        <button id="closeSettings">${t("settings.close")}</button>
    `;

    // =====================
    // TAB LOGIC
    // =====================

    const tabs = modal.querySelectorAll(".settings-tabs button");
    const contents = modal.querySelectorAll(".tab");

    tabs.forEach(btn => {
        btn.onclick = () => {
            tabs.forEach(b => b.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");
            modal.querySelector(`#tab-${btn.dataset.tab}`).classList.add("active");
        };
    });

    // =====================
    // INITIAL STATE
    // =====================

    document.getElementById("nightMode").checked =
        Settings.theme === "dark";

    document.getElementById("enableDetailsLink").checked =
        Settings.profileSettings.enableDetailsLink;

    document.getElementById("enableRulesLink").checked =
        Settings.profileSettings.enableRulesLink;

    document.getElementById("enableProfilesLink").checked =
        Settings.profileSettings.enableProfilesLink;

    document.getElementById("showGWFAQNotes").checked =
        Settings.profileSettings.showGWFAQNotes;

    modal.querySelectorAll("input[name='version']").forEach(radio => {
        radio.checked = radio.value === Settings.version;
    });

    // =====================
    // EVENT HANDLERS
    // =====================

    document.getElementById("nightMode").onchange = e => {
        Settings.theme = e.target.checked ? "dark" : "light";
        Settings.save();
        document.body.classList.toggle("dark", Settings.theme === "dark");
    };
    
    modal.querySelectorAll("input[name='language']").forEach(radio => {
        radio.checked = radio.value === Settings.language;

        radio.onchange = e => {
            Settings.language = e.target.value;
            Settings.save();
            location.reload();
        };
    });

    document.getElementById("enableDetailsLink").onchange = e => {
        Settings.profileSettings.enableDetailsLink = e.target.checked;
        Settings.save();
    };

    document.getElementById("enableRulesLink").onchange = e => {
        Settings.profileSettings.enableRulesLink = e.target.checked;
        Settings.save();
    };

    document.getElementById("enableProfilesLink").onchange = e => {
        Settings.profileSettings.enableProfilesLink = e.target.checked;
        Settings.save();
    };

    document.getElementById("showGWFAQNotes").onchange = e => {
        Settings.profileSettings.showGWFAQNotes = e.target.checked;
        Settings.save();
    };

    modal.querySelectorAll("input[name='version']").forEach(radio => {
        radio.onchange = e => {
            Settings.version = e.target.value;
            Settings.save();
            location.reload();
        };
    });

    document.getElementById("closeSettings").onclick = () =>
        modal.classList.add("hidden");
}
