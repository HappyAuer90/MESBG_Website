import { Settings } from "../settings.js";
import { loadProfiles } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { loadDefinitions } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */

const debugMode = true;

const state = {
    profiles: null,
    definitions: null
};

/* =========================
   INIT
========================= */

export async function initMatchedPlay(container) {

    state.profiles = await loadProfiles(Settings.version);

    container.innerHTML = `
        <div class="profiles-all">

            <div class="profiles-filter" id="profilesFilter"></div>

            <div class="profiles-layout">
                <div class="profiles-list">
                    <ul id="profilesList"></ul>
                </div>
            </div>

        </div>
    `;
}