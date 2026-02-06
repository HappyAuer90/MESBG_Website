import { Settings } from "../settings.js";
import { loadArmyLists } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { t } from "../utility/i18n.js";

export async function initArmylistsAll(container) {
    container.innerHTML = `
        <div class="armylists-all">
            <h2>${t("armylists.all.title")}</h2>

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

    const armyLists = await loadArmyLists(Settings.version);

    Object.values(armyLists).forEach(armylist => {
        const li = document.createElement("li");
        li.textContent = armylist.name;

        li.onclick = () => {
            navigate("armylists", "search", {
                armylistId: armylist.id
            });
        };

        if (armylist.alignment === "Good") {
            goodList.appendChild(li);
        }

        if (armylist.alignment === "Evil") {
            evilList.appendChild(li);
        }
    });
}
