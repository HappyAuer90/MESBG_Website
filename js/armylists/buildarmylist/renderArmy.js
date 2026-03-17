import { t } from "../../utility/i18n.js";
import { state, getArmyStats } from "./armyState.js";
import { createMandatoryModels } from "./warbandUtility.js";
import { renderWarbands, attachWarbandControls } from "./renderWarband.js";
import { createWarbandsFromModel, updateGeneral, createHero } from "./warbandUtility.js";
import { Rules, getWarbandMode, hasHeroFollower } from "./armylistRules.js";
import { openPrintOverlay } from "./printPDF.js";

/* =========================
   ARMYLIST BUILDER RENDERING
========================= */

export function renderArmyListBuilder(container, armylist) {

    state.builder.armylist = armylist;
    state.builder.warbands = [];
    state.builder.generalWarbandId = null;

    createMandatoryModels();

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
        const mode = getWarbandMode(state.builder);

        const availableHeroes = models[tier].filter(hero => {

            if (!Rules.canAddHero(state.builder, hero)) return false;

            if (mode.type === "One") {
                if (state.builder.warbands.length >= 1)
                    return false;
            }

            if (mode.type === "Optional") {

                const heroFollower = hasHeroFollower(state.builder);

                if (heroFollower)
                    return false;
            }

            return true;
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

                                            ${hero.mandatory?.length
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

                const mode = getWarbandMode(state.builder);

                if (mode.type === "One" && state.builder.warbands.length >= 1)
                    return;

                if (mode.type === "Optional" && hasHeroFollower(state.builder))
                    return;

                const heroName = card.dataset.hero;
                const tier = card.dataset.tier;

                const heroData = state.builder.armylist.models[tier]
                    .find(h => h.name === heroName);

                const newWarbands = createWarbandsFromModel(heroData, tier);

                newWarbands.forEach(wb =>
                    state.builder.warbands.push(wb)
                );

                updateGeneral();
                rerenderArmyList();
            };
        });
}

/* =========================
   Army-Builder RENDERING
========================= */

function renderArmyBuilder() {

    const stats = getArmyStats(state.builder, Rules);

    return `
        <div class="armylist-build-header">
            <h1>
                ${state.builder.armylist.name}
            </h1>

            <button class="armylist-build-pdf-btn" id="exportPdfBtn">
                ${t("armylists.build.exportPdf")}
            </button>
        </div>

        ${renderOverviewBox(stats)}

        ${renderWarnings(stats)}

        ${renderSpecialRulesBox(state.builder.armylist)}

        ${renderWarbands()}
    `;
}

export function renderOverviewBox(stats) {

    return `
        <div class="armylist-overview-box">
            <table class="armylist-overview-table">
                <tr>
                    <th>${t("armylists.build.Points")}</th>
                    <th>${t("armylists.build.Models")}</th>
                    <th>${t("armylists.build.Broken")}</th>
                    <th>${t("armylists.build.Quartered")}</th>
                    <th class="${stats.bowsExceeded ? "limit-exceeded" : ""}">
                        ${t("armylists.build.BowLimit")}
                    </th>
                    <th class="${stats.throwingExceeded ? "limit-exceeded" : ""}">
                        ${t("armylists.build.ThrowingLimit")}
                    </th>
                </tr>
                <tr>
                    <td>${stats.totalPoints}</td>
                    <td>${stats.modelCount}</td>
                    <td>${stats.broken} ${t("armylists.build.killed")}</td>
                    <td>${stats.quartered} ${t("armylists.build.left")}</td>
                    <td>${stats.bowCount} / ${stats.bowLimit}</td>
                    <td>${stats.throwingCount} / ${stats.throwingLimit}</td>
                </tr>
            </table>
            <br>
            <table class="armylist-overview-table">
                <tr>
                    <th>${t("armylists.build.Bows")}</th>
                    <th>${t("armylists.build.ThrowingWeapons")}</th>
                    <th>${t("armylists.build.MWF")}</th>
                    <th>${t("armylists.build.Banners")}</th>
                    <th>${t("armylists.build.Cavalry")}</th>
                    <th>${t("armylists.build.Monster")}</th>
                </tr>
                <tr>
                    <td>${stats.bows}</td>
                    <td>${stats.throwing}</td>
                    <td>${stats.might} / ${stats.will} / ${stats.fate}</td>
                    <td>${stats.banners}</td>
                    <td>${stats.cavalry}</td>
                    <td>${stats.monster}</td>
                </tr>
            </table>
        </div>
    `;
}
export function renderSpecialRulesBox(armylist) {
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
function renderWarnings(stats) {

    const warnings = Rules.validateArmy(
        state.builder,
        stats
    );

    if (!warnings.length) return "";

    return `
        <div class="armylist-build-warning-box">

            <ul class="armylist-build-warning-list">
                ${warnings.map(w => `
                    <li class="armylist-build-warning-item">
                        ${w.message}
                    </li>
                `).join("")}
            </ul>

        </div>
    `;
}
export function rerenderArmyList() {
    const left = document.querySelector(".armylist-build-left");
    left.innerHTML = renderArmyBuilder();

    const btn = document.querySelector("#exportPdfBtn");
    if (btn) {
            btn.onclick = () => openPrintOverlay();
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
        "Independent Heroes": "heroesIndependent",
        "Siege Engines": "siegeEngines"
    };

    return map[tier] || tier;
}