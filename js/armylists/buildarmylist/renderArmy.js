import { t } from "../../utility/i18n.js";
import { state, getArmyStats } from "./armyState.js";
import { createMandatoryGeneralIfExists } from "./warbandUtility.js";
import { renderWarbands, attachWarbandControls } from "./renderWarband.js";
import { updateGeneral, isHeroAlreadyInArmy } from "./warbandUtility.js";

 /* =========================
    ARMYLIST BUILDER RENDERING
 ========================= */
 
 export function renderArmyListBuilder(container, armylist) {

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

export function renderHeroSelection(models) {

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
export function attachHeroAddEvents() {

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
                        tag: heroData.tag || [],   
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


    const stats = getArmyStats(state.builder);

    return `
        <div class="armylist-overview-box">
            <table class="armylist-overview-table">
                <tr>
                    <th>${t("armylists.build.Points")}</th>
                    <th>${t("armylists.build.Models")}</th>
                    <th>${t("armylists.build.Broken")}</th>
                    <th>${t("armylists.build.Quartered")}</th>
                    <th class="${stats.bowsExceeded ? "limit-exceeded" : ""}">
                        ${t("armylists.build.Bows")}
                    </th>
                    <th class="${stats.throwingExceeded ? "limit-exceeded" : ""}">
                        ${t("armylists.build.ThrowingWeapons")}
                    </th>
                </tr>
                <tr>
                    <td>${stats.totalPoints}</td>
                    <td>${stats.modelCount}</td>
                    <td>${stats.broken}</td>
                    <td>${stats.quartered}</td>
                    <td>${stats.bowCount} / ${stats.bowlimit}</td>
                    <td>${stats.throwingCount} / ${stats.bowlimit}</td>
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
export function rerenderArmyList() {
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

 /* =========================
    UTILITY
 ========================= */
 
function formatDescription(text) {
    if (!text) return "";
    return text
        .replace(/\n/g, "<br>")
        .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
}
 function formatMandatoryWargear(items) {

    if (items.length === 1) return `with ${items[0]}`;
    if (items.length === 2) return `with ${items[0]} and ${items[1]}`;

    return `with ${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
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