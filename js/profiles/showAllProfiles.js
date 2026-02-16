import { Settings } from "../settings.js";
import { loadProfiles } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { t } from "../utility/i18n.js";

export async function initProfilesAll(container) {

    container.innerHTML = `
        <div class="profiles-all">

            <div class="profiles-columns">
                <div class="profiles-column">
                    <h3>${t("profiles.all.good")}</h3>
                    <ul id="profilesGood"></ul>
                </div>

                <div class="profiles-column">
                    <h3>${t("profiles.all.evil")}</h3>
                    <ul id="profilesEvil"></ul>
                </div>
            </div>
        </div>
    `;

    const goodList = container.querySelector("#profilesGood");
    const evilList = container.querySelector("#profilesEvil");

    const profiles = await loadProfiles(Settings.version);

    const goodProfiles = [];
    const evilProfiles = [];

    Object.values(profiles).forEach(profile => {

        if (profile.alignment === "Good") {
            goodProfiles.push(profile);
        }

        if (profile.alignment === "Evil") {
            evilProfiles.push(profile);
        }
    });


    // Rendern
    goodProfiles.forEach(profile => {
        goodList.appendChild(createProfileListItem(profile));
    });

    evilProfiles.forEach(profile => {
        evilList.appendChild(createProfileListItem(profile));
    });
}

/* Helper */

function createProfileListItem(profile) {

    const li = document.createElement("li");
    li.textContent = profile.name;

    li.onclick = () => {
        navigate("profiles", "search", {
            profileId: profile.id
        });
    };

    return li;
}
