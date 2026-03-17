import { state, getArmyStats, calculateModelCost } from "./armyState.js";
import { Rules } from "./armylistRules.js";
import { renderOverviewBox, renderSpecialRulesBox } from "./renderArmy.js";
import { renderWarbands } from "./renderWarband.js";
import { t } from "../../utility/i18n.js";

/* =========================
   ENTRY
========================= */

export function openPrintOverlay() {

    const stats = getArmyStats(state.builder, Rules);
    const warnings = Rules.validateArmy(state.builder, stats);

    if (warnings.length) {
        const proceed = confirm(
            "Your armylist has validation errors. Continue anyway?"
        );
        if (!proceed) return;
    }

    renderOverlay();
}

/* =========================
   OVERLAY
========================= */

function renderOverlay() {

    const overlay = document.createElement("div");
    overlay.id = "printOverlay";

    overlay.innerHTML = `
        <div class="print-overlay-content">

            <div class="print-toolbar">
                <button id="printBack">← Back</button>
                <button id="printNow">Print / PDF</button>
            </div>

            <div class="print-settings">
                <label><input type="checkbox" checked data-opt="overview1"> Overview 1</label>
                <label><input type="checkbox" checked data-opt="overview2"> Overview 2</label>
                <label><input type="checkbox" checked data-opt="rules"> Rules</label>
                <label><input type="checkbox" checked data-opt="warbands"> Warbands</label>
            </div>

            <div id="printPreview" class="print-preview"></div>

        </div>
    `;

    document.body.appendChild(overlay);

    bindOverlayEvents(overlay);
    renderPreview();
}

/* =========================
   EVENTS
========================= */

function bindOverlayEvents(overlay) {

    overlay.querySelector("#printBack").onclick = () => {
        overlay.remove();
    };

    overlay.querySelector("#printNow").onclick = () => {
        window.print();
    };

    overlay.querySelectorAll("[data-opt]").forEach(cb => {
        cb.onchange = renderPreview;
    });
}

/* =========================
   PREVIEW RENDER
========================= */

function renderPreview() {

    const preview = document.querySelector("#printPreview");
    const opts = getOptions();
    const stats = getArmyStats(state.builder, Rules);

    // komplette Box holen
    const fullOverview = renderOverviewBox(stats);

    // splitten in beide Tabellen (dirty aber effektiv)
    const parts = fullOverview.split("<br>");

    preview.innerHTML = `
        <div class="print-page">

            <h1 class="print-title">
                ${state.builder.armylist.name}
            </h1>

            ${opts.overview1 ? parts[0] : ""}
            <br>
            ${opts.overview2 ? parts[1] : ""}

            ${opts.rules ?  renderSpecialRulesBox(state.builder.armylist) : ""}
            <br>
            ${opts.warbands ? renderWarbands({ print: true }) : ""}

        </div>
    `;
}

/* =========================
   OPTIONS
========================= */

function getOptions() {
    const opts = {};
    document.querySelectorAll("[data-opt]").forEach(cb => {
        opts[cb.dataset.opt] = cb.checked;
    });
    return opts;
}
