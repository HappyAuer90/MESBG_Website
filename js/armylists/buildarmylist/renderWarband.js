import { t } from "../../utility/i18n.js";
import { navigate } from "../../main.js";
import { state, countRuleModelsInWarband, calculateModelCost } from "./armyState.js";
import {
    updateGeneral,
    moveWarbandUp,
    moveWarbandDown,
    deleteWarband,
    getGeneralCandidates,
    handleOptionSelection
} from "./warbandUtility.js";
import { rerenderArmyList } from "./renderArmy.js";
import { Rules, checkMaximum } from "./armylistRules.js";

export function renderWarbands(options = {}) {
    const isPrint = options.print === true;

    return `
        <div class="armylist-warbands">

            ${state.builder.warbands.map((wb, index) => `
                
                <div class="armylist-warband">

                    ${renderWarbandHeader(wb, index, isPrint)}
                    ${renderWarbandCaptainGrid(wb, index, isPrint)}
                    ${renderWarbandFollowers(wb, index, isPrint)}

                </div>

            `).join("")}

        </div>
    `;
}
function renderWarbandHeader(wb, index, isPrint = false) {

    const followers = wb.followers.reduce((s, w) => s + (w.count || 1), 0);
    const ignoredFollowers = countRuleModelsInWarband(wb, "NotCount");
    const followerCount = followers - ignoredFollowers;

    const totalPoints =
        calculateModelCost(wb.hero) +
        wb.followers.reduce((s, w) =>
            s + calculateModelCost(w) * w.count, 0);

    const isGeneral = wb.id === state.builder.generalWarbandId;

    let limit;
    if (wb.tier === "Siege Engines") {
        limit = followerCount;
    } else {
        limit = Rules.getWarbandLimit(wb, state.builder);
    }

    return `
        <div class="warband-header-grid ${isPrint ? "print-mode" : ""}">

            <div class="warband-header-warband">
                ${t("armylists.build.Warband")} ${index + 1}
                ${isGeneral ? " (" + t("armylists.build.General") + ")" : ""}
            </div>

            <div class="warband-header-follower-count">
                ${followerCount}/${limit} ${t("armylists.build.Followers")}
            </div>

            <div class="warband-header-points">
                ${totalPoints > 0 ? `${totalPoints} ${t("armylists.build.Points")}` : ""}
            </div>

            ${!isPrint ? `
                <div class="warband-header-bows"></div>
                <div class="warband-header-throwing-weapons"></div>

                <div class="warband-header-mechanics">
                    ${renderGeneralButton(wb)}
                    <button data-up="${index}" ${isGeneral ? "disabled" : ""}>↑</button>
                    <button data-down="${index}" ${isGeneral ? "disabled" : ""}>↓</button>
                    <button data-delete="${index}" ${wb.isMandatoryGeneral || wb.isMandatoryCaptain ? "disabled" : ""}>X</button>
                </div>
            ` : ""}

        </div>
    `;
}
function renderGeneralButton(wb) {

    const candidates = getGeneralCandidates();
    const isCandidate = candidates.some(c => c.id === wb.id);
    const isGeneral = wb.id === state.builder.generalWarbandId;

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
function renderWarbandCaptainGrid(wb, index, isPrint = false) {

    return `
        <div class="warband-captain-grid ${isPrint ? "print-mode" : ""}">

            <div class="warband-captain-name">
                ${createProfileLink(wb.hero.name, state)}
                ${renderSelectedOptions(wb.hero)}
            </div>

            <div class="warband-captain-points">
                ${calculateModelCost(wb.hero)} ${t("armylists.build.Points")}
            </div>

            ${!isPrint ? `
                <div class="warband-captain-options-button">
                    ${renderAddOptionsSelect(wb.hero, index, "hero") || ""}
                </div>

                <div class="warband-empty-cell"></div>
            ` : ""}

        </div>
    `;
}

/* =========================
   WARBAND RENDERING FOLLOWERS
========================= */

function renderWarbandFollowers(wb, index, isPrint = false) {

    const limit = Rules.getWarbandLimit(wb, state.builder);
    const currentCount = wb.followers.reduce((s, w) => s + w.count, 0);
    const limitReached = currentCount >= limit;

    return `
        <div class="warband-followers-grid ${isPrint ? "print-mode" : ""}">

            ${wb.followers.map((w, wIndex) => {

        const singleCost = calculateModelCost(w);
        const totalCost = singleCost * w.count;

        return `
            <div class="warband-followers-count">
                ${w.count}x
            </div>

            <div class="warband-followers-name">
                ${createProfileLink(w.name, state)}
                ${renderSelectedOptions(w)}
                ${renderMandatoryWarriorWarning(w)}
            </div>

            <div class="warband-followers-points">
                ${totalCost > 0 ? `${totalCost} ${t("armylists.build.Points")}` : ""}
            </div>

            ${!isPrint ? `
                <div class="warband-followers-options-button">
                    ${renderAddOptionsSelect(w, index, "warrior", wIndex) || ""}
                </div>

                <div class="warband-followers-controls">
                    <button data-minus="${index}_${wIndex}" ${w.compositionLocked ? "disabled" : ""}>-</button>
                    <button 
                        data-plus="${index}_${wIndex}"
                        ${checkMaximum(state.builder, w) ? "disabled" : ""}
                        ${w.compositionLocked ? "disabled" : ""}
                        ${limitReached ? "disabled" : ""}
                    >+</button>
                </div>
            ` : ""}
        `;
    }).join("")}

        </div>

        ${!isPrint ? renderAddFollowerSelect(index, limitReached) : ""}
    `;
}
function renderAddFollowerSelect(warbandIndex, limitReached) {

    const captain = state.builder.warbands[warbandIndex]?.hero;

    const available = Rules.getAvailableFollowers(state.builder, captain);

    if (!available.length) return "";
    if (limitReached) return "";

    return `
        <div class="warband-add-follower-wrapper">
            <select 
                class="warband-add-follower"
                data-warband="${warbandIndex}"
            >
                <option value="">${t("armylists.build.addFollower")}</option>

                ${available.map(p => `
                    <option value="${p.name}" data-points="${p.points}">
                        ${p.name} (${p.points})
                    </option>
                `).join("")}

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
/* =========================
   WARBAND RENDERING UTILS
========================= */

export function attachWarbandControls() {

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

                const captain = warband.hero;

                const available = Rules.getAvailableFollowers(state.builder, captain);

                const followerData = available.find(m => m.name === select.value);

                if (followerData.composition) {

                    followerData.composition.forEach(m => {

                        warband.followers.push({
                            name: m.name,
                            basePoints: Number(m.points) || 0,
                            count: m.amount || 1,
                            tier: "Warriors",

                            selectedOptions: [],

                            mandatory: m.mandatory || [],
                            options: m.options || [],

                            optionalWarrior: m.optionalWarrior || [],
                            mandatoryWarrior: m.mandatoryWarrior || [],

                            armyRules: m.armyRules || {},

                            compositionLocked: true
                        });

                    });

                } else {

                    warband.followers.push({
                        name: followerData.name,
                        basePoints: Number(followerData.points),
                        count: 1,
                        tag: followerData.tag || [],
                        tier: followerData.tier,

                        selectedOptions: [],

                        mandatory: followerData.mandatory || [],
                        options: followerData.options || [],

                        optionalWarrior:
                            followerData.optionalWarrior ||
                            followerData.optionalwarrior ||
                            [],

                        mandatoryWarrior: followerData.mandatoryWarrior || [],

                        armyRules: followerData.armyRules || {}
                    });

                }

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
                    : wb.followers[Number(wIndex)];

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

            const limit = Rules.getWarbandLimit(wb, state.builder);
            const current = wb.followers.reduce((s, w) => s + w.count, 0);

            if (current >= limit) return;

            wb.followers[wIndex].count++;
            rerenderArmyList();
        };
    });

    // MINUS
    document.querySelectorAll("[data-minus]").forEach(btn => {
        btn.onclick = () => {

            const [wbIndex, wIndex] = btn.dataset.minus.split("_").map(Number);
            const wb = state.builder.warbands[wbIndex];
            const warrior = wb.followers[wIndex];

            warrior.count--;

            if (warrior.count <= 0) {
                wb.followers.splice(wIndex, 1);
            }

            rerenderArmyList();
        };
    });

}
function renderSelectedOptions(model) {

    const mandatory = (model.mandatory || []).map(name => ({
        name,
        uiName: name
    }));

    const selected = (model.selectedOptions || []).map(o => ({
        name: o.name,
        uiName: o.uiName || o.name
    }));

    const all = [...mandatory, ...selected];

    if (!all.length) return "";

    const displayNames = all.map(o => o.uiName);

    return `
        <div class="profile-selected-options">
            ${formatMandatoryWargear(displayNames)}
        </div>
    `;
}
function renderAddOptionsSelect(model, wbIndex, type, wIndex = null) {

    let entries = [
    ...(model.options || []),
    ...(model.optionalWarrior || []),
    ...(model.mandatoryWarrior || [])
];

//ExcludeOptions Filter
entries = entries.filter(opt => !isOptionExcluded(model, opt));

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

/* =========================
   UTILITY
========================= */

function formatMandatoryWargear(items) {

    if (items.length === 1) return `with ${items[0]}`;
    if (items.length === 2) return `with ${items[0]} and ${items[1]}`;

    return `with ${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function createProfileLink(name, state) {

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
function isOptionExcluded(model, option) {

    if (!option.armyRules?.ExcludeOptions) return false;

    const selectedNames = model.selectedOptions?.map(o => o.name) || [];

    return option.armyRules.ExcludeOptions.some(excluded =>
        selectedNames.includes(excluded)
    );
}