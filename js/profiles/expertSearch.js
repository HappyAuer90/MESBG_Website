
import { t } from "../utility/i18n.js";

export function initProfilesExpert(container) {
    container.innerHTML = `
        <div class="profile-view">
            <h2>${t("profiles.expert.title")}</h2>
            <p>Dummy-Seite</p>
        </div>
    `;
}
