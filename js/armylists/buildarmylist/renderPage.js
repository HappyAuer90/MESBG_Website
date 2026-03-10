import { Settings } from "../../settings.js";
import { loadArmyLists, loadProfiles } from "../../utility/dataLoader.js";
import { t } from "../../utility/i18n.js";
import { state } from "./armyState.js";
import { renderArmyListBuilder } from "./renderArmy.js";

/* =========================
   NAVIGATION HOOK
========================= */

export async function onArmylistsBuildNavigate(params = {}) {

    if (!params.armylistId || !state.container) return;

    if (!state.armyLists) {
        state.armyLists = await loadArmyLists(Settings.version);
    }

    state.mode = "direct";
    loadArmylistById(params.armylistId, { pushHistory: true });
}

/* =========================
   INIT VIEW
========================= */

export async function initArmylistsBuild(container, params = {}) {
 
     state.container = container;
 
     container.innerHTML = `
         <div class="armylists-build">
             <div class="armylist-build-search-wrapper">
                 <div class="armylist-build-search-bar">
                     <input
                         id="armylistSearchInput"
                         type="text"
                         placeholder="${t("armylists.build.placeholder")}"
                         autocomplete="off"
                     />
                     <button id="armylistBackBtn" disabled>←</button>
                     <ul id="autosuggestions" class="armylist-build-autosuggestions"></ul>
                 </div>
             </div>
 
             <div class="armylist-build-separator hidden"></div>
             <div id="armyListView"></div>
         </div>
     `;
 
     if (!state.armyLists) {
         state.armyLists = await loadArmyLists(Settings.version);
     }
 
     if (!state.profiles) {
         state.profiles = await loadProfiles(Settings.version);
         state.profileByName = {};
         Object.values(state.profiles).forEach(p => {
             state.profileByName[p.name] = p.id;
         });
     }
 
     const input = container.querySelector("#armylistSearchInput");
     const list = container.querySelector("#autosuggestions");
     const view = container.querySelector("#armyListView");
     const back = container.querySelector("#armylistBackBtn");
 
     input.addEventListener("focus", () => {
         state.mode = "interactive";
     });
 
     input.addEventListener("input", () => {
         if (state.mode !== "interactive") return;
         renderAutosuggestions(input.value, list);
     });
 
     back.onclick = () => {
         if (state.history.length <= 1) return;
 
         state.history.pop();
         const prevId = state.history[state.history.length - 1];
 
         state.mode = "direct";
         loadArmylistById(prevId, { pushHistory: false });
     };
 
     if (params.armylistId) {
         state.mode = "direct";
         loadArmylistById(params.armylistId, { pushHistory: true });
     }
 }
 
 /* =========================
    AUTOSUGGESTIONS
 ========================= */
 
 function renderAutosuggestions(query, list) {
     list.innerHTML = "";
     list.classList.remove("visible");
 
     const q = normalize(query);
     if (!q) return;
 
     const matches = Object.values(state.armyLists)
         .filter(a => normalize(a.name).includes(q))
         .slice(0, 10);
 
     if (!matches.length) return;
 
     matches.forEach(a => {
         const li = document.createElement("li");
         li.textContent = a.name;
 
         li.onclick = () => {
             state.mode = "direct";
             loadArmylist(a, { pushHistory: true });
         };
 
         list.appendChild(li);
     });
 
     list.classList.add("armylist-visible");
 }
 function loadArmylist(armylist, { pushHistory }) {
 
     const input = state.container.querySelector("#armylistSearchInput");
     const list = state.container.querySelector("#autosuggestions");
     const view = state.container.querySelector("#armyListView");
     const sep = state.container.querySelector(".armylist-build-separator");
 
     state.currentArmylistId = armylist.id;
 
     if (pushHistory) state.history.push(armylist.id);
     updateBackButton();
 
     input.value = armylist.name;
     list.innerHTML = "";
     list.classList.remove("armylist-visible");
 
     sep.classList.remove("hidden");
 
     renderArmyListBuilder(view, armylist);
 }
 function loadArmylistById(id, options) {
     const armylist = Object.values(state.armyLists)
         .find(a => a.id === id);
 
     if (armylist) {
         loadArmylist(armylist, options);
     }
 }
 function updateBackButton() {
     const btn = state.container.querySelector("#armylistBackBtn");
     if (!btn) return;
 
     btn.disabled = state.history.length <= 1;
 }

 
 /* =========================
    UTILITY
 ========================= */

 function normalize(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}