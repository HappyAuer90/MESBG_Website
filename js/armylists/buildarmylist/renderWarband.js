import { t } from "../../utility/i18n.js";
import { navigate } from "../../main.js";
import { state, HERO_LIMITS, countTaggedWarriorsInWarband, calculateModelCost  } from "./armyState.js";
import {
    updateGeneral,
    moveWarbandUp,
    moveWarbandDown,
    deleteWarband,
    getGeneralCandidates,
    handleOptionSelection,
    isHeroAlreadyInArmy
} from "./warbandUtility.js";
import { rerenderArmyList } from "./renderArmy.js";

export function renderWarbands() {

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
                ${createProfileLink(wb.hero.name, state)}
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
                        ${createProfileLink(w.name, state)}
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
                    ${renderFollower(index)}
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
function renderFollower(warbandIndex) {

    const models = state.builder.armylist.models;

    const warriors = models["Warriors"] || [];
    const independents = models["Independent Heroes"] || [];

    const combined = [...warriors, ...independents];

    const captain = state.builder.warbands[warbandIndex]?.hero;
    const captainTags = captain?.tag || [];

    const available = combined.filter(model => {

        // UNIQUE CHECK
        const isUnique = model.tag?.includes("Unique");
        if (isUnique && isHeroAlreadyInArmy(model.name)) {
            return false;
        }
        const modelTags = model.tag || [];

        const matchTags = modelTags.filter(t => t.startsWith("Match_"));

        // Kein Match Tag → immer erlaubt
        if (!matchTags.length) return true;

        // Captain muss mindestens einen Match Tag teilen
        const captainMatchTags = captainTags.filter(t => t.startsWith("Match_"));
console.log("Captain:", captain.name, captainTags);
console.log("Warrior:", model.name, modelTags);
console.log("Match result:", matchTags.some(tag => captainMatchTags.includes(tag)));

        return matchTags.some(tag => captainMatchTags.includes(tag));
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