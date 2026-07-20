import { Settings } from "../settings.js";
import { loadArmyLists } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */

const state = {
    armylists: null
};

/* =========================
   INIT
========================= */

export async function initArmylistsAll(container) {

    state.armylists = await loadArmyLists(Settings.version);

    const entries = Object.entries(state.armylists);

    const alignments = [t("armylists.all.good"), t("armylists.all.evil")];

    container.innerHTML = `
        <div class="armylists-all">

            <div class="armylists-filter" id="armylistsFilter"></div>

            <div class="armylists-layout">
                <div class="armylists-list">
                    <ul id="armylistsList"></ul>
                </div>
            </div>

        </div>
    `;

    const filterContainer = container.querySelector("#armylistsFilter");
    const listEl = container.querySelector("#armylistsList");

    /* =========================
       CHECKBOXES
    ========================= */

    alignments.forEach(alignment => {

        const label = document.createElement("label");
        label.className = "armylists-checkbox";

        label.innerHTML = `
            <input type="checkbox" value="${alignment}" checked />
            ${alignment}
        `;

        filterContainer.appendChild(label);
    });

    /* =========================
       LIST RENDER
    ========================= */

    function renderList() {

        const activeAlignments = [
            ...filterContainer.querySelectorAll("input:checked")
        ].map(cb => cb.value);

        listEl.innerHTML = "";

        entries.forEach(([key, armylist]) => {

            if (!activeAlignments.includes(armylist.alignment)) return;

            const li = document.createElement("li");

            li.textContent = armylist.name;
            li.dataset.id = armylist.id;

            li.onclick = () => {
                navigate("armylists", "search", {
                    armylistId: armylist.id
                });
            };

            listEl.appendChild(li);
        });
    }

    filterContainer.addEventListener("change", renderList);

    renderList();
}