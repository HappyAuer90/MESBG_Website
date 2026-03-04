import { Settings } from "../settings.js";
import { loadArmyLists, loadProfiles } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";
import { navigate } from "../main.js";

/* =========================
   STATE
========================= */

let state = {
    mode: "interactive",
    armyLists: null,
    profiles: null,
    profileByName: null,
    container: null,

    history: [],
    currentArmylistId: null
};
state.builder = {
    armylist: null,
    warbands: [],
    generalWarbandId: null
};

const HERO_LIMITS = {
    "Heroes of Legend": 18,
    "Heroes of Valour": 15,
    "Heroes of Fortitude": 12,
    "Minor Heroes": 6,
    "Independent Heroes": 0
};

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
    ARMYLIST BUILDER RENDERING
 ========================= */
 
 function renderArmyListBuilder(container, armylist) {

    state.builder.armylist = armylist;
    state.builder.warbands = [];
    state.builder.generalWarbandId = null;
    
    createMandatoryGeneralIfExists();

    container.innerHTML = `
        <div class="armylist-build-layout">

            <div class="armylist-build-left">
                ${renderArmyBuilder()}
            </div>

            <div class="armylist-build-right">
                ${renderHeroSelection(armylist.models)}
            </div>

        </div>
    `;

    attachHeroAddEvents();
    attachWarbandControls();
}

 /* =========================
    HERO SELECTOR RENDERING
 ========================= */

function renderHeroSelection(models) {

    const tiers = Object.keys(models)
        .filter(t => t !== "Warriors");

    return `
        <div class="armylist-hero-selection">

            ${tiers.map(tier => {

                // 🔹 1. Heroes filtern (Unique + already used)
                const availableHeroes = models[tier].filter(hero => {
                    const isUnique = hero.tag?.includes("Unique");
                    const alreadyUsed = isUnique && isHeroAlreadyInArmy(hero.name);
                    return !alreadyUsed;
                });

                // 🔹 2. Wenn keine mehr da → komplettes Tier nicht rendern
                if (!availableHeroes.length) return "";

                // 🔹 3. Ansonsten normal rendern
                return `
                    <div class="armylist-hero-tier">
                        <h4>${t("armylists.build." + getTierTranslationKey(tier))}</h4>

                        ${availableHeroes.map(hero => `
                            <div class="armylist-hero-card"
                                data-hero="${hero.name}"
                                data-tier="${tier}">

                                <div class="hero-card">
                                    <div class="hero-card-header">
                                        <div class="hero-card-title">
                                            <div class="hero-card-name">
                                                ${hero.name}
                                            </div>

                                            ${
                                                hero.mandatory?.length
                                                    ? `<div class="hero-card-mandatory">
                                                        ${formatMandatoryWargear(hero.mandatory)}
                                                       </div>`
                                                    : ""
                                            }
                                        </div>

                                        <div class="hero-card-points">
                                            ${hero.points}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join("")}

                    </div>
                `;
            }).join("")}

        </div>
    `;
}
function attachHeroAddEvents() {

    document.querySelectorAll(".armylist-hero-card")
        .forEach(card => {

            card.onclick = () => {

                const heroName = card.dataset.hero;
                const tier = card.dataset.tier;

                const heroData = state.builder.armylist.models[tier]
                    .find(h => h.name === heroName);

                const warband = {
                    id: "wb_" + Date.now(),
                    tier,
                    hero: {
                        name: heroData.name,
                        basePoints: Number(heroData.points),
                        selectedOptions: [],
                        mandatory: heroData.mandatory || [],
                        options: heroData.options || []
                    },
                    warriors: []
                };

                state.builder.warbands.push(warband);

                updateGeneral();
                rerenderArmyList();
            };
        });
}

 /* =========================
    Army-Builder RENDERING
 ========================= */

function renderArmyBuilder() {

    return `
        <div class="armylist-build-header">
            <h1>
                ${state.builder.armylist.name}
            </h1>

            <button class="armylist-build-pdf-btn" id="exportPdfBtn">
                ${t("armylists.build.exportPdf")}
            </button>
        </div>

        ${renderOverviewBox()}

        ${renderSpecialRulesBox(state.builder.armylist)}

        ${renderWarbands()}
    `;
}
function renderOverviewBox() {

    let totalPoints = 0;
    let heroCount = 0;
    let warriorCount = 0;
    let totalBows = 0;
    let totalThrowing = 0;

    state.builder.warbands.forEach(wb => {

        totalPoints += calculateModelCost(wb.hero);
        heroCount++;

        wb.warriors.forEach(w => {
            totalPoints += calculateModelCost(w) * w.count;
            warriorCount += w.count;
        });

        totalBows += countTaggedWarriorsInWarband(wb, "WarriorBow");
        totalThrowing += countTaggedWarriorsInWarband(wb, "WarriorThrowing");
    });

    const modelCount = heroCount + warriorCount;
    const broken = Math.ceil(modelCount / 2);
    const quartered = Math.floor(modelCount / 4);
    const bowlimit = Math.ceil(warriorCount / 3);
    const bowsExceeded = totalBows > bowlimit;
    const throwingExceeded = totalThrowing > bowlimit;

    return `
        <div class="armylist-overview-box">
            <table class="armylist-overview-table">
                <tr>
                    <th>${t("armylists.build.Points")}</th>
                    <th>${t("armylists.build.Models")}</th>
                    <th>${t("armylists.build.Broken")}</th>
                    <th>${t("armylists.build.Quartered")}</th>
                    <th class="${bowsExceeded ? "limit-exceeded" : ""}">
                        ${t("armylists.build.Bows")}
                    </th>
                    <th class="${throwingExceeded ? "limit-exceeded" : ""}">
                        ${t("armylists.build.ThrowingWeapons")}
                    </th>
                </tr>
                <tr>
                    <td>${totalPoints}</td>
                    <td>${modelCount}</td>
                    <td>${broken} ${t("armylists.build.killed")}</td>
                    <td>${quartered} ${t("armylists.build.left")}</td>
                    <td class="${bowsExceeded ? "limit-exceeded" : ""}">
                        ${totalBows} / ${bowlimit}
                    </td>
                    <td class="${throwingExceeded ? "limit-exceeded" : ""}">
                        ${totalThrowing} / ${bowlimit}
                    </td>
                </tr>
            </table>
        </div>
    `;
}
function renderSpecialRulesBox(armylist) {
    const hasAdditional = Array.isArray(armylist.additionalRules) && armylist.additionalRules.length;
    const hasSpecial = Array.isArray(armylist.specialRules) && armylist.specialRules.length;

    return `
        <div class="armylist-build-information">

                ${hasAdditional ? `
                    <h4>${t("armylists.build.additionalRules")}</h4>
                    <ul>
                        ${armylist.additionalRules
                            .map(r => `<li>${r}</li>`)
                            .join("")}
                    </ul>
                ` : ""}

                ${hasSpecial ? `
                    <h4>${t("armylists.build.specialRules")}</h4>
                    <ul>
                        ${armylist.specialRules.map(rule => `
                            <li>
                                <strong>${rule.name}</strong><br>
                                ${formatDescription(rule.description)}
                            </li>
                        `).join("")}
                    </ul>
                ` : ""}

        </div>
    `;
}
function renderWarbands() {

    return `
        <div class="armylist-warbands">

            ${state.builder.warbands.map((wb, index) => `
                
                <div class="armylist-warband">

                    ${renderWarbandHeader(wb, index)}
                    ${renderWarbandCaptainGrid(wb, index)}
                    ${renderWarbandFollowers(wb, index)}

                </div>

            `).join("")}

        </div>
    `;
}

 /* =========================
    WARBAND RENDERING HEADER
 ========================= */
function renderWarbandHeader(wb, index) {

    const followerCount = wb.warriors.reduce((s, w) => s + w.count, 0);

    const totalPoints =
        calculateModelCost(wb.hero) +
        wb.warriors.reduce((s, w) =>
            s + calculateModelCost(w) * w.count, 0);

    const isGeneral = wb.id === state.builder.generalWarbandId;

    const limit = HERO_LIMITS[wb.tier] ?? 0;
    const bowCount = countTaggedWarriorsInWarband(wb, "WarriorBow");
    const throwingCount = countTaggedWarriorsInWarband(wb, "WarriorThrowing");

    return `
        <div class="warband-header-grid">

            <div class="warband-header-warband">
                ${t("armylists.build.Warband")} ${index + 1} ${isGeneral ? "(" + t("armylists.build.General") + ")" : ""}
            </div>

            <div class="warband-header-follower-count">
                ${followerCount}/${limit} ${t("armylists.build.Followers")}
            </div>

            <div class="warband-header-points">
                ${totalPoints} ${t("armylists.build.Points")}
            </div>

            <div class="warband-header-bows">
                🏹: ${bowCount}
            </div>

            <div class="warband-header-throwing-weapons">
                🗡️: ${throwingCount}
            </div>

            <div class="warband-header-mechanics">
                ${renderGeneralButton(wb)}
                <button data-up="${index}" ${isGeneral ? "disabled" : ""}>↑</button>
                <button data-down="${index}" ${isGeneral ? "disabled" : ""}>↓</button>
                <button data-delete="${index}" ${wb.isMandatoryGeneral ? "disabled" : ""}>X</button>
            </div>

        </div>
    `;
}
function renderGeneralButton(wb) {

    const candidates = getGeneralCandidates();
    const isCandidate = candidates.some(c => c.id === wb.id);
    const isGeneral = wb.id === state.builder.generalWarbandId;

    // Nur Kandidaten zeigen Button
    if (!isCandidate) return "";

    const onlyOne = candidates.length === 1;

    return `
        <button
            class="general-btn ${isGeneral ? "active" : ""}"
            data-general="${wb.id}"
            ${onlyOne ? "disabled" : ""}
        >
            ${t("armylists.build.General")}
        </button>
    `;
}

 /* =========================
    WARBAND RENDERING CAPTAIN
 ========================= */
 function renderWarbandCaptainGrid(wb, index) {

    return `
        <div class="warband-captain-grid">

            <div class="warband-captain-name">
                ${createProfileLink(wb.hero.name)}
                ${renderSelectedOptions(wb.hero)}
            </div>

            <div class="warband-captain-points">
                ${calculateModelCost(wb.hero)} ${t("armylists.build.Points")}
            </div>

            <div class="warband-captain-options-button">
                ${renderAddOptionsSelect(wb.hero, index, "hero") || ""}
            </div>

            <div class="warband-empty-cell">
            </div>

        </div>
    `;
}

 /* =========================
    WARBAND RENDERING FOLLOWERS
 ========================= */
 
function renderWarbandFollowers(wb, index) {

    const limit = HERO_LIMITS[wb.tier] ?? 0;
    const currentCount = wb.warriors.reduce((s, w) => s + w.count, 0);
    const limitReached = currentCount >= limit;

    return `
        <div class="warband-followers-grid">

            ${wb.warriors.map((w, wIndex) => {

                const singleCost = calculateModelCost(w);
                const totalCost = singleCost * w.count;

                return `

                    <div class="warband-followers-count">
                        ${w.count}x
                    </div>

                    <div class="warband-followers-name">
                        ${createProfileLink(w.name)}
                        ${renderSelectedOptions(w)}
                        ${renderMandatoryWarriorWarning(w)}
                    </div>

                    <div class="warband-followers-points">
                        ${totalCost} ${t("armylists.build.Points")}
                    </div>

                    <div class="warband-followers-options-button">
                        ${renderAddOptionsSelect(w, index, "warrior", wIndex) || ""}
                    </div>

                    <div class="warband-followers-controls">
                        <button data-minus="${index}_${wIndex}">-</button>
                        <button 
                            data-plus="${index}_${wIndex}"
                            ${limitReached ? "disabled" : ""}>
                            +
                        </button>
                    </div>

                        `;
                    }).join("")}

        </div>

        <div class="warband-add-follower-wrapper">
                <select 
                    class="warband-add-follower"
                    data-warband="${index}"
                    ${limitReached ? "disabled" : ""}
                >
                    <option value="">${t("armylists.build.addFollower")}</option>
                    ${renderFollower()}
                </select>
            </div>
    `;
}
function renderMandatoryWarriorWarning(model) {

    if (!model.mandatoryWarrior?.length) return "";

    const hasChoice = model.selectedOptions?.some(opt =>
        model.mandatoryWarrior.some(m => m.name === opt.name)
    );

    if (hasChoice) return "";

    return `
        <div class="mandatory-warning">
            ${t("armylists.build.mandatoryWarning")}
        </div>
    `;
}
function renderFollower() {

    const models = state.builder.armylist.models;

    const warriors = models["Warriors"] || [];
    const independents = models["Independent Heroes"] || [];

    const combined = [...warriors, ...independents];

    const available = combined.filter(model => {

        const isUnique = model.tag?.includes("Unique");

        if (!isUnique) return true;

        return !isHeroAlreadyInArmy(model.name);
    });

    return available.map(p => `
        <option value="${p.name}" data-points="${p.points}">
            ${p.name} (${p.points})
        </option>
    `).join("");
}


 /* =========================
    WARBAND RENDERING UTILS
 ========================= */

function attachWarbandControls() {

    // Move / Delete
    document.querySelectorAll("[data-up]").forEach(btn => {
        btn.onclick = () => moveWarbandUp(Number(btn.dataset.up));
    });

    document.querySelectorAll("[data-down]").forEach(btn => {
        btn.onclick = () => moveWarbandDown(Number(btn.dataset.down));
    });

    document.querySelectorAll("[data-delete]").forEach(btn => {
        btn.onclick = () => deleteWarband(Number(btn.dataset.delete));
    });

    // GENERAL BUTTON
    document.querySelectorAll("[data-general]").forEach(btn => {

        btn.onclick = () => {

            const id = btn.dataset.general;
            updateGeneral(id);
            rerenderArmyList();
        };
    });

    // Add follower
    document.querySelectorAll(".warband-add-follower")
        .forEach(select => {

            select.onchange = () => {

                if (!select.value) return;

                const warbandIndex = Number(select.dataset.warband);
                const warband = state.builder.warbands[warbandIndex];

                const selectedOption = select.selectedOptions[0];
                
                const models = state.builder.armylist.models;

                const warriors = models["Warriors"] || [];
                const independents = models["Independent Heroes"] || [];

                const combined = [...warriors, ...independents];

                const warriorData = combined.find(m => m.name === select.value);

                if (!warriorData) return;

                warband.warriors.push({
                    name: warriorData.name,
                    basePoints: Number(warriorData.points),
                    count: 1,
                    tag: warriorData.tag || [], // ← WICHTIG
                    selectedOptions: [],
                    mandatory: warriorData.mandatory || [],
                    options: warriorData.options || [],
                    optionalWarrior: warriorData.optionalWarrior || warriorData.optionalwarrior || [],
                    mandatoryWarrior: warriorData.mandatoryWarrior || []
                });

                select.value = "";
                rerenderArmyList();
            };
        });

    // ADD OPTIONS
    document.querySelectorAll(".add-options-select")
    .forEach(select => {

        select.onchange = () => {

            if (!select.value) return;

            const type = select.dataset.type;
            const wbIndex = Number(select.dataset.wb);
            const wIndex = select.dataset.w;

            const wb = state.builder.warbands[wbIndex];
            const model = type === "hero"
                ? wb.hero
                : wb.warriors[Number(wIndex)];

            const allOptions = [
                ...(model.options || []),
                ...(model.optionalWarrior || []),
                ...(model.mandatoryWarrior || [])
            ];

            const opt = allOptions.find(o => o.name === select.value);

            if (!opt) return;

            handleOptionSelection(model, opt);

            select.value = "";
            rerenderArmyList();
        };
    });

// PROFILE LINKS
document.querySelectorAll(".profile-link")
    .forEach(el => {

        el.onclick = (e) => {

            e.stopPropagation();

            const profileId = el.dataset.profile;

            navigate("profiles", "search", {
                profileId
            });
        };
    });

    // PLUS
    document.querySelectorAll("[data-plus]").forEach(btn => {
        btn.onclick = () => {

            const [wbIndex, wIndex] = btn.dataset.plus.split("_").map(Number);
            const wb = state.builder.warbands[wbIndex];

            const limit = HERO_LIMITS[wb.tier] ?? 0;
            const current = wb.warriors.reduce((s, w) => s + w.count, 0);

            if (current >= limit) return;

            wb.warriors[wIndex].count++;
            rerenderArmyList();
        };
    });

    // MINUS
    document.querySelectorAll("[data-minus]").forEach(btn => {
        btn.onclick = () => {

            const [wbIndex, wIndex] = btn.dataset.minus.split("_").map(Number);
            const wb = state.builder.warbands[wbIndex];
            const warrior = wb.warriors[wIndex];

            warrior.count--;

            if (warrior.count <= 0) {
                wb.warriors.splice(wIndex, 1);
            }

            rerenderArmyList();
        };
    });

}
function renderSelectedOptions(model) {

    const all = [
        ...(model.mandatory || []),
        ...(model.selectedOptions?.map(o => o.name) || [])
    ];

    if (!all.length) return "";
    const allOptions = formatMandatoryWargear(all);
    return `
        <div class="profile-selected-options">
            ${allOptions}
        </div>
    `;
}
function renderAddOptionsSelect(model, wbIndex, type, wIndex = null) {

    const entries = [
        ...(model.options || []),
        ...(model.optionalWarrior || []),
        ...(model.mandatoryWarrior || [])
    ];

    if (!entries.length) return "";

    return `
        <select class="add-options-select"
            data-type="${type}"
            data-wb="${wbIndex}"
            data-w="${wIndex ?? ""}">
            <option value="">${t("armylists.build.addOption")}</option>
            ${entries.map(opt => `
                <option value="${opt.name}">
                    ${opt.name} (+${opt.cost})
                </option>
            `).join("")}
        </select>
    `;
}
function handleOptionSelection(model, opt) {

    if (!model.selectedOptions) {
        model.selectedOptions = [];
    }

    const exists = model.selectedOptions
        .some(o => o.name === opt.name);

    const isOptionalWarrior =
        model.optionalWarrior?.some(o => o.name === opt.name);

    const isMandatoryWarrior =
        model.mandatoryWarrior?.some(o => o.name === opt.name);

    // 1️⃣ Gleiche Option erneut gewählt → entfernen
    if (exists) {
        model.selectedOptions =
            model.selectedOptions.filter(o => o.name !== opt.name);
        return;
    }

    // 2️⃣ optionalWarrior oder mandatoryWarrior → Single-Select Verhalten
    if (isOptionalWarrior || isMandatoryWarrior) {

        // vorhandene Warrior-Option entfernen
        model.selectedOptions = model.selectedOptions.filter(o =>
            !model.optionalWarrior?.some(x => x.name === o.name) &&
            !model.mandatoryWarrior?.some(x => x.name === o.name)
        );

        model.selectedOptions.push(opt);
        return;
    }

    // 3️⃣ Normale Multi-Option
    model.selectedOptions.push(opt);
}
function moveWarbandUp(index) {

    if (index <= 0) return;

    const generalIndex = state.builder.warbands
        .findIndex(wb => wb.id === state.builder.generalWarbandId);

    if (index - 1 === generalIndex) return;

    const temp = state.builder.warbands[index];
    state.builder.warbands[index] = state.builder.warbands[index - 1];
    state.builder.warbands[index - 1] = temp;

    rerenderArmyList();
}
function moveWarbandDown(index) {

    if (index >= state.builder.warbands.length - 1) return;

    const generalIndex = state.builder.warbands
        .findIndex(wb => wb.id === state.builder.generalWarbandId);

    if (index + 1 === generalIndex) return;

    const temp = state.builder.warbands[index];
    state.builder.warbands[index] = state.builder.warbands[index + 1];
    state.builder.warbands[index + 1] = temp;

    rerenderArmyList();
}
function deleteWarband(index) {

    const wb = state.builder.warbands[index];

    if (wb.isMandatoryGeneral) return;

    state.builder.warbands.splice(index, 1);

    updateGeneral();
    rerenderArmyList();
}


/* =========================
    RERENDERING UTILS
 ========================= */

function rerenderArmyList() {
    const left = document.querySelector(".armylist-build-left");
    left.innerHTML = renderArmyBuilder();

    const btn = document.querySelector("#exportPdfBtn");
    if (btn) {
        btn.onclick = () => window.print();
    }
    attachWarbandControls();
    
    const right = document.querySelector(".armylist-build-right");

    right.innerHTML = renderHeroSelection(
        state.builder.armylist.models
    );

    attachHeroAddEvents();

}
function updateGeneral(forceId = null) {

    const warbands = state.builder.warbands;

    if (!warbands.length) {
        state.builder.generalWarbandId = null;
        return;
    }

    // 1. Mandatory General prüfen
    const mandatory = warbands.find(wb => wb.isMandatoryGeneral);

    if (mandatory) {
        state.builder.generalWarbandId = mandatory.id;
        moveGeneralToTop();
        return;
    }

    // 2. Heroic Tier Rang bestimmen
    const tierPriority = {
        "Heroes of Legend": 4,
        "Heroes of Valour": 3,
        "Heroes of Fortitude": 2,
        "Minor Heroes": 1,
        "Independent Heroes": 0
    };

    // Höchstes Tier finden
    let highest = -1;
    warbands.forEach(wb => {
        const value = tierPriority[wb.tier] ?? 0;
        if (value > highest) highest = value;
    });

    const candidates = warbands.filter(wb =>
        (tierPriority[wb.tier] ?? 0) === highest
    );

    // 3. Wenn force gesetzt (Button-Klick)
    if (forceId && candidates.some(c => c.id === forceId)) {
        state.builder.generalWarbandId = forceId;
        moveGeneralToTop();
        return;
    }

    // 4. Wenn nur ein Kandidat → automatisch
    if (candidates.length === 1) {
        state.builder.generalWarbandId = candidates[0].id;
        moveGeneralToTop();
        return;
    }

    // 5. Mehrere Kandidaten → bestehender behalten falls valide
    if (state.builder.generalWarbandId &&
        candidates.some(c => c.id === state.builder.generalWarbandId)) {

        moveGeneralToTop();
        return;
    }

    // Default = erster Kandidat
    state.builder.generalWarbandId = candidates[0].id;
    moveGeneralToTop();
}


 /* =========================
    ARMY BUILDER RULES UTILS
 ========================= */

function createMandatoryGeneralIfExists() {

    const models = state.builder.armylist.models;

    for (const tier in models) {

        const heroData = models[tier]
            .find(h => h.tag?.includes("MandatoryGeneral"));

        if (heroData) {

            const warband = {
                id: "wb_mandatory",
                tier,
                isMandatoryGeneral: true,
                hero: {
                        name: heroData.name,
                        basePoints: Number(heroData.points),
                        selectedOptions: [],
                        mandatory: heroData.mandatory || [],
                        options: heroData.options || []
                    },
                    warriors: []
                };

            state.builder.warbands.push(warband);
            state.builder.generalWarbandId = warband.id;
            return;
        }
    }
}
function moveGeneralToTop() {

    const index = state.builder.warbands
        .findIndex(wb => wb.id === state.builder.generalWarbandId);

    if (index <= 0) return;

    const general = state.builder.warbands.splice(index, 1)[0];
    state.builder.warbands.unshift(general);
}
function getGeneralCandidates() {

    const warbands = state.builder.warbands;

    const mandatory = warbands.find(wb => wb.isMandatoryGeneral);
    if (mandatory) return [mandatory];

    const tierPriority = {
        "Heroes of Legend": 4,
        "Heroes of Valour": 3,
        "Heroes of Fortitude": 2,
        "Minor Heroes": 1,
        "Independent Heroes": 0
    };

    let highest = -1;

    warbands.forEach(wb => {
        const value = tierPriority[wb.tier] ?? 0;
        if (value > highest) highest = value;
    });

    return warbands.filter(wb =>
        (tierPriority[wb.tier] ?? 0) === highest
    );
}


 /* =========================
    UTIL
 ========================= */
 
 function normalize(text) {
     return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
 }
 
function formatDescription(text) {
    if (!text) return "";
    return text
        .replace(/\n/g, "<br>")
        .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
}
function isHeroAlreadyInArmy(heroName) {

    return state.builder.warbands.some(wb => {

        // 1️⃣ Hero der Warband
        if (wb.hero.name === heroName) return true;

        // 2️⃣ Hero innerhalb Warband
        const existsInFollowers = wb.warriors.some(w =>
            w.name === heroName
        );

        return existsInFollowers;
    });
}
function calculateModelCost(model) {

    let total = Number(model.basePoints);

    if (model.selectedOptions?.length) {
        model.selectedOptions.forEach(opt => {
            total += Number(opt.cost);
        });
    }

    return total;
}
function formatMandatoryWargear(items) {

    if (items.length === 1) return `with ${items[0]}`;
    if (items.length === 2) return `with ${items[0]} and ${items[1]}`;

    return `with ${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
function createProfileLink(name) {

    const profileId = state.profileByName?.[name];

    if (!profileId) return name;

    return `
        <span 
            class="profile-link"
            data-profile="${profileId}">
            ${name}
        </span>
    `;
}
function countTaggedWarriorsInWarband(wb, tagName) {

    let total = 0;

    wb.warriors.forEach(w => {

        const count = w.count || 0;

        // 🔹 A: Profil-Tag (z.B. WarriorBow)
        const hasProfileTag =
            w.tag?.includes(tagName);

        if (hasProfileTag) {
            total += count;
            return; // Option muss nicht mehr geprüft werden
        }

        // 🔹 B: Option-Tag
        const hasTaggedOption =
            w.selectedOptions?.some(opt =>
                opt.tag?.includes(tagName)
            );

        if (hasTaggedOption) {
            total += count;
        }
    });

    return total;
}
function getTierTranslationKey(tier) {

    const map = {
        "Heroes of Legend": "heroesOfLegend",
        "Heroes of Valour": "heroesOfValour",
        "Heroes of Fortitude": "heroesOfFortitude",
        "Minor Heroes": "heroesMinor",
        "Independent Heroes": "heroesIndependent"
    };

    return map[tier] || tier;
}