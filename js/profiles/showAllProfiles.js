import { Settings } from "../settings.js";
import { loadProfiles } from "../utility/dataLoader.js";
import { navigate } from "../main.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */

const state = {
    profiles: null
};

/* =========================
   INIT
========================= */

export async function initProfilesAll(container) {

    state.profiles = await loadProfiles(Settings.version);

    const entries = Object.entries(state.profiles);

    const alignments = [t("profiles.all.good"), t("profiles.all.evil")];

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

    const filterContainer = container.querySelector("#profilesFilter");
    const listEl = container.querySelector("#profilesList");

    /* =========================
       CHECKBOXES
    ========================= */

    alignments.forEach(alignment => {

        const label = document.createElement("label");
        label.className = "profiles-checkbox";

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

        entries.forEach(([key, profile]) => {

            if (!activeAlignments.includes(profile.alignment)) return;

            const li = document.createElement("li");

            li.textContent = profile.name;
            li.dataset.id = profile.id;

            li.onclick = () => {
                navigate("profiles", "search", {
                    profileId: profile.id
                });
            };

            listEl.appendChild(li);
        });
    }

    filterContainer.addEventListener("change", renderList);

    renderList();
}
