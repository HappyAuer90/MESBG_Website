// =====================
// SETTINGS STATE
// =====================

export const Settings = {
    version: "2024",
    theme: "light",

    profileSettings: {
        showEquipment: true,
        showSpecialRules: true
    },

    armylistSettings: {
        showPoints: true,
        enableValidation: true
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
                profileSettings: this.profileSettings,
                armylistSettings: this.armylistSettings
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
        <h3>Settings</h3>

        <div class="settings-tabs">
            <button data-tab="general" class="active">General</button>
            <button data-tab="graphics">Graphics</button>
            <button data-tab="profiles">Profiles</button>
            <button data-tab="armylists">ArmyLists</button>
            <button data-tab="version">Version</button>
        </div>

        <div class="settings-content">

            <div class="tab active" id="tab-general">
                <label>
                    <input type="checkbox" checked disabled>
                    English
                </label>
            </div>

            <div class="tab" id="tab-graphics">
                <label>
                    <input type="checkbox" id="nightMode">
                    Night Mode
                </label>
            </div>

            <div class="tab" id="tab-profiles">
                <label>
                    <input type="checkbox" id="showEquipment">
                    Show Equipment
                </label><br>
                <label>
                    <input type="checkbox" id="showSpecialRules">
                    Show Special Rules
                </label>
            </div>

            <div class="tab" id="tab-armylists">
                <label>
                    <input type="checkbox" id="showPoints">
                    Show Points
                </label><br>
                <label>
                    <input type="checkbox" id="enableValidation">
                    Enable Validation
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
        <button id="closeSettings">Close</button>
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

    document.getElementById("showEquipment").checked =
        Settings.profileSettings.showEquipment;

    document.getElementById("showSpecialRules").checked =
        Settings.profileSettings.showSpecialRules;

    document.getElementById("showPoints").checked =
        Settings.armylistSettings.showPoints;

    document.getElementById("enableValidation").checked =
        Settings.armylistSettings.enableValidation;

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

    document.getElementById("showEquipment").onchange = e => {
        Settings.profileSettings.showEquipment = e.target.checked;
        Settings.save();
    };

    document.getElementById("showSpecialRules").onchange = e => {
        Settings.profileSettings.showSpecialRules = e.target.checked;
        Settings.save();
    };

    document.getElementById("showPoints").onchange = e => {
        Settings.armylistSettings.showPoints = e.target.checked;
        Settings.save();
    };

    document.getElementById("enableValidation").onchange = e => {
        Settings.armylistSettings.enableValidation = e.target.checked;
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
