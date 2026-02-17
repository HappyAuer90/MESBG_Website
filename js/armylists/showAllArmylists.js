import { Settings } from "../settings.js";
import { loadArmyLists } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { t } from "../utility/i18n.js";

export async function initArmylistsAll(container) {

    container.innerHTML = `
        <div class="armylists-all">

            <div class="armylists-columns">
                <div class="armylists-column">
                    <h3>${t("armylists.all.good")}</h3>
                    <ul id="armylistsGood"></ul>
                </div>

                <div class="armylists-column">
                    <h3>${t("armylists.all.evil")}</h3>
                    <ul id="armylistsEvil"></ul>
                </div>
            </div>
        </div>
    `;

    const goodList = container.querySelector("#armylistsGood");
    const evilList = container.querySelector("#armylistsEvil");

    const armylists = await loadArmyLists(Settings.version);

    const goodarmylists = [];
    const evilarmylists = [];

    Object.values(armylists).forEach(armylist => {

        if (armylist.alignment === "Good") {
            goodarmylists.push(armylist);
        }

        if (armylist.alignment === "Evil") {
            evilarmylists.push(armylist);
        }
    });


    // Rendern
    goodarmylists.forEach(armylist => {
        goodList.appendChild(createarmylistListItem(armylist));
    });

    evilarmylists.forEach(armylist => {
        evilList.appendChild(createarmylistListItem(armylist));
    });
}

/* Helper */

function createarmylistListItem(armylist) {

    const li = document.createElement("li");
    li.textContent = armylist.name;

    li.onclick = () => {
        navigate("armylists", "search", {
            armylistId: armylist.id
        });
    };

    return li;
}

