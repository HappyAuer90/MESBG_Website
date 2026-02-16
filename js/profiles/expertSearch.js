import { navigate } from "../main.js";
import { Settings } from "../settings.js";
import { loadProfiles, loadDefinitions } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";

/* =========================
   STATE
========================= */

const state = {
    container: null,
    profiles: null,
    definitions: null,
    filters: {},
};

/* =========================
   INIT
========================= */

export async function initProfilesExpert(container) {

    state.container = container;

    if (!state.profiles) {
        state.profiles = await loadProfiles(Settings.version);
    }

    if (!state.definitions) {
        state.definitions = await loadDefinitions(Settings.version);
    }

    state.filters = createInitialFilters();

    container.innerHTML = renderLayout();

    bindEvents();

    renderResults();
}

/* =========================
   RENDERING
========================= */

function renderLayout() {
    return `
        <div class="expert-search">
            <div class="expert-left">
                ${renderFilters()}
            </div>
            <div class="expert-right">
                <h1 class="filter-title">
                    ${t("profiles.expert.results")}
                    <span id="expert-count"></span>
                </h1>
                <h2></h2>
                <div id="expert-results" class="expert-results-list"></div>
            </div>
        </div>
    `;
}
function renderFilters() {
    return `
        <div class="filter-panel">

            <h1 class="filter-title">${t("profiles.expert.filter")}</h1>

            <div class="filter-reset">
                <button id="expert-reset">Reset</button>
            </div>

            ${renderGeneralBox()}

            ${renderCharacteristicsTables()}

            ${renderMultiCheckboxFilter(t("profiles.expert.race"), "race")}

            ${renderMultiCheckboxFilter(t("profiles.expert.faction"), "faction")}

            ${renderMultiCheckboxFilter(t("profiles.expert.unitTypes"), "unitTypes")}

            ${renderSelectFilter(t("profiles.expert.baseSize"), "baseSize", [
        { value: "25mm", label: "25mm" },
        { value: "40mm", label: "40mm" },
        { value: "50mm", label: "50mm" },
        { value: "60mm", label: "60mm" },
        { value: "80mm", label: "80mm" },
        { value: "100mm", label: "100mm" },
        { value: "105mm oval", label: "105mm oval" },
        { value: "120mm oval", label: "120mm oval" },
        { value: "130mm", label: "130mm" },
        { value: "160mm", label: "160mm" },
        { value: "170mm oval", label: "170mm oval" },
        { value: "180x140mm oval", label: "180x140mm oval" },
        { value: "231x133mm oval", label: "231x133mm oval" }
    ])}

            ${renderMultiAutocompleteFilter(t("profiles.expert.wargear"), "wargear")}

            ${renderMultiCheckboxFilter(t("profiles.expert.heroicActions"), "heroicActions")}

            ${renderMultiAutocompleteFilter(t("profiles.expert.options"), "options")}

            ${renderMultiAutocompleteFilter(t("profiles.expert.specialRules"), "specialRules")}

            ${renderMultiAutocompleteFilter(t("profiles.expert.magicalPowers"), "magicalPowers")}

        </div>
    `;
}
function renderResults() {

    const container = state.container.querySelector("#expert-results");
    const count = state.container.querySelector("#expert-count");

    container.innerHTML = "";

    const profiles = Object.values(state.profiles)
        .filter(applyFilters);

    count.textContent = `(${profiles.length})`;

    profiles.forEach(profile => {

        const div = document.createElement("div");
        div.className = "expert-entry";
        div.dataset.id = profile.id;
        div.textContent = profile.name;

        div.onclick = () => {
            navigate("profiles", "search", {
                profileId: profile.id
            });
        };

        container.appendChild(div);
    });

}
function createInitialFilters() {
    return {
        alignment: "",
        source: "",
        pointsMin: "",
        pointsMax: "",
        moveMin: "",
        moveMax: "",
        fightValueMin: "",
        fightValueMax: "",
        shootValueMin: "",
        shootValueMax: "",
        strengthMin: "",
        strengthMax: "",
        defenceMin: "",
        defenceMax: "",
        attacksMin: "",
        attacksMax: "",
        woundsMin: "",
        woundsMax: "",
        courageMin: "",
        courageMax: "",
        intelligenceMin: "",
        intelligenceMax: "",
        mightMin: "",
        mightMax: "",
        willMin: "",
        willMax: "",
        fateMin: "",
        fateMax: "",
        rangeMin: "",
        rangeMax: "",
        siegeEngineStrengthMin: "",
        siegeEngineStrengthMax: "",
        siegeEngineDefenceMin: "",
        siegeEngineDefenceMax: "",
        siegeEngineWoundsMin: "",
        siegeEngineWoundsMax: "",
        race: [],
        raceMode: "AND",
        faction: [],
        factionMode: "AND",
        unitTypes: [],
        unitTypesMode: "AND",
        baseSize: "",
        wargear: [],
        wargearMode: "AND",
        heroicActions: [],
        heroicActionsMode: "AND",
        options: [],
        optionsMode: "AND",
        specialRules: [],
        specialRulesMode: "AND",
        magicalPowers: [],
        magicalPowersMode: "AND",

    };
}
function bindEvents() {

    // Filter inputs
    // Select + Number + Checkbox
    state.container.querySelectorAll("[data-filter]").forEach(el => {

        el.addEventListener("change", e => {

            const key = e.target.dataset.filter;

            if (e.target.type === "checkbox") {
                state.filters[key] = e.target.checked;
            } else {
                state.filters[key] = e.target.value;
            }

            renderResults();
        });

    });

    // Multi checkbox filters (z.B. faction)
    state.container.querySelectorAll("[data-multi-filter]").forEach(el => {

        el.addEventListener("change", e => {

            const key = e.target.dataset.multiFilter;
            const value = e.target.value;

            if (!state.filters[key]) {
                state.filters[key] = [];
            }

            if (e.target.checked) {
                if (!state.filters[key].includes(value)) {
                    state.filters[key].push(value);
                }
            } else {
                state.filters[key] =
                    state.filters[key].filter(v => v !== value);
            }

            renderResults();
        });
    });
    // Mode selection
    state.container.querySelectorAll("[data-filter-mode]").forEach(el => {

        el.addEventListener("change", e => {

            const key = e.target.dataset.filterMode;
            state.filters[`${key}Mode`] = e.target.value;

            renderResults();
        });
    });

    // AUTOCOMPLETE INPUTS
    state.container.querySelectorAll("[data-autocomplete]").forEach(input => {

        const key = input.dataset.autocomplete;
        const list = state.container.querySelector(`[data-autolist="${key}"]`);

        input.addEventListener("input", () => {
            renderDefinitionSuggestions(input.value, key, list);
        });

    });

    // Reset
    state.container.querySelector("#expert-reset").onclick = () => {
        state.filters = createInitialFilters();
        initProfilesExpert(state.container);
    };

    // Result click
    // Remove selected chip
    state.container.addEventListener("click", e => {

        const removeBtn = e.target.closest(".remove-chip");
        if (!removeBtn) return;

        const key = removeBtn.dataset.key;
        const value = removeBtn.dataset.value;

        state.filters[key] =
            state.filters[key].filter(v => v !== value);

        renderSelectedChips(key);
        renderResults();
    });

}

/* =========================
   FILTER FUNCTIONS
========================= */

function applyFilters(profile) {

    // Alignment filter
    if (state.filters.alignment) {

        if (profile.alignment !== state.filters.alignment)
            return false;
    }
    // Source filter
    if (state.filters.source) {

        if (!profile.source || !profile.source.length)
            return false;

        const hasSource = profile.source.some(s =>
            s.book === state.filters.source
        );

        if (!hasSource)
            return false;
    }
    // POINTS FILTER
    if (state.filters.pointsMin || state.filters.pointsMax) {

        const value = extractNumber(profile.points);

        if (!evaluateMinMax(value, state.filters.pointsMin, state.filters.pointsMax))
            return false;
    }

    // CHARACTERISTICS FILTER

    if (!evaluateCharacteristic(profile, "move",
        state.filters.moveMin, state.filters.moveMax)) return false;

    if (!evaluateCharacteristic(profile, "fightValue",
        state.filters.fightValueMin, state.filters.fightValueMax)) return false;

    if (!evaluateCharacteristic(profile, "shootValue",
        state.filters.shootValueMin, state.filters.shootValueMax)) return false;

    if (!evaluateCharacteristic(profile, "strength",
        state.filters.strengthMin, state.filters.strengthMax)) return false;

    if (!evaluateCharacteristic(profile, "defence",
        state.filters.defenceMin, state.filters.defenceMax)) return false;

    if (!evaluateCharacteristic(profile, "attacks",
        state.filters.attacksMin, state.filters.attacksMax)) return false;

    if (!evaluateCharacteristic(profile, "wounds",
        state.filters.woundsMin, state.filters.woundsMax)) return false;

    if (!evaluateCharacteristic(profile, "courage",
        state.filters.courageMin, state.filters.courageMax)) return false;

    if (!evaluateCharacteristic(profile, "intelligence",
        state.filters.intelligenceMin, state.filters.intelligenceMax)) return false;

    // CHARACTERISTICS HERO FILTER

    if (!evaluateHeroCharacteristic(profile, "might",
        state.filters.mightMin, state.filters.mightMax)) return false;

    if (!evaluateHeroCharacteristic(profile, "will",
        state.filters.willMin, state.filters.willMax)) return false;

    if (!evaluateHeroCharacteristic(profile, "fate",
        state.filters.fateMin, state.filters.fateMax)) return false;

    // CHARACTERISTICS SIEGE ENGINE FILTER

    if (!evaluateSiegeRange(profile,
        state.filters.rangeMin, state.filters.rangeMax)) return false;

    if (!evaluateSiegeCharacteristic(profile, "siegeEngineStrength",
        state.filters.siegeEngineStrengthMin, state.filters.siegeEngineStrengthMax)) return false;

    if (!evaluateSiegeCharacteristic(profile, "siegeEngineDefence",
        state.filters.siegeEngineDefenceMin, state.filters.siegeEngineDefenceMax)) return false;

    if (!evaluateSiegeCharacteristic(profile, "siegeEngineWounds",
        state.filters.siegeEngineWoundsMin, state.filters.siegeEngineWoundsMax)) return false;

    // Race filter
    if (!evaluateMultiSelectFilter(
        profile.race || [],
        state.filters.race,
        state.filters.raceMode
    )) return false;

    // Faction filter
    if (!evaluateMultiSelectFilter(
        profile.faction || [],
        state.filters.faction,
        state.filters.factionMode
    )) return false;

    // UnitTypes filter
    if (!evaluateMultiSelectFilter(
        profile.unitTypes || [],
        state.filters.unitTypes,
        state.filters.unitTypesMode
    )) return false;

    // BaseSize filter
    if (state.filters.baseSize) {

        if (profile.baseSize !== state.filters.baseSize)
            return false;
    }


    // Wargear
    if (!evaluateObjectArrayFilter(
        profile.wargear,
        state.filters.wargear,
        state.filters.wargearMode
    )) return false;


    // Heroic Actions filter
    if (!evaluateMultiSelectFilter(
        profile.heroicActions || [],
        state.filters.heroicActions,
        state.filters.heroicActionsMode
    )) return false;
    // Options
    if (!evaluateObjectArrayFilter(
        profile.options,
        state.filters.options,
        state.filters.optionsMode
    )) return false;

    // Special Rules
    if (!evaluateMultiSelectFilter(
        profile.specialRules || [],
        state.filters.specialRules,
        state.filters.specialRulesMode
    )) return false;

    // Magical Powers
    if (!evaluateObjectArrayFilter(
        profile.magicalPowers,
        state.filters.magicalPowers,
        state.filters.magicalPowersMode
    )) return false;


    return true;
}
function renderGeneralBox() {

    return `
        <details class="filter-box">

            <summary>General</summary>

            <div class="box-content general-box">

                <div class="general-section">
                    <h4 class="general-title">
                        ${t("profiles.expert.alignment")}
                    </h4>
        <select data-filter="alignment">
            <option value="">-- ${t("profiles.expert.select")} --</option>
            ${[
        { value: "Good", label: t("profiles.expert.good") },
        { value: "Evil", label: t("profiles.expert.evil") },
        { value: "Neither", label: t("profiles.expert.neither") }].map(o =>
        `<option value="${o.value}">${o.label}</option>`
    ).join("")}
        </select>
                </div>

                <div class="general-section">
                    <h4 class="general-title">
                        ${t("profiles.expert.source")}
                    </h4>
        <select data-filter="source">
            <option value="">-- ${t("profiles.expert.select")} --</option>
            ${[
        { value: "Armies of The Lord of the Rings", label: "Armies of The Lord of the Rings" },
        { value: "Armies of The Hobbit", label: "Armies of The Hobbit" },
        { value: "Armies of Middle-Earth", label: "Armies of Middle-Earth" },
        { value: "Legacies of Middle-Earth - Forces of Good", label: "Legacies of Middle-Earth - Forces of Good" },
        { value: "Legacies of Middle-Earth - Forces of Evil", label: "Legacies of Middle-Earth - Forces of Evil" },
        { value: "Rules Manual", label: "Rules Manual" }
    ] .map(o =>
        `<option value="${o.value}">${o.label}</option>`
    ).join("")}
        </select>
                </div>

                <div class="general-section">
                    <h4 class="general-title">
                        ${t("profiles.expert.points")}
                    </h4>
                    <div class="range-inline">
            <input type="number"
                   min="0"
                   placeholder="Min"
                   data-filter="${"points"}Min">
            <input type="number"
                   min="0"
                   placeholder="Max"
                   data-filter="${"points"}Max">
        </div>
                </div>

            </div>

        </details>
    `;
}
function renderCharacteristicsTables() {

    return `
        <details class="filter-box">

            <summary>${t("profiles.expert.characteristics")}</summary>

            <div class="box-content characteristics-wrapper">

                ${renderCharacteristicTable([
        { label: t("profiles.expert.move"), key: "move" },
        { label: t("profiles.expert.fightValue"), key: "fightValue" },
        { label: t("profiles.expert.shootValue"), key: "shootValue" },
        { label: t("profiles.expert.strength"), key: "strength" },
        { label: t("profiles.expert.defence"), key: "defence" },
        { label: t("profiles.expert.attacks"), key: "attacks" },
        { label: t("profiles.expert.wounds"), key: "wounds" },
        { label: t("profiles.expert.courage"), key: "courage" },
        { label: t("profiles.expert.intelligence"), key: "intelligence" }
    ])}

                ${renderCharacteristicTable([
        { label: t("profiles.expert.might"), key: "might" },
        { label: t("profiles.expert.will"), key: "will" },
        { label: t("profiles.expert.fate"), key: "fate" }
    ])}

                ${renderCharacteristicTable([
        { label: t("profiles.expert.range"), key: "range", isRange: true },
        { label: t("profiles.expert.strengthSiegeEngine"), key: "siegeEngineStrength" },
        { label: t("profiles.expert.defenceSiegeEngine"), key: "siegeEngineDefence" },
        { label: t("profiles.expert.woundsSiegeEngine"), key: "siegeEngineWounds" }
    ])}

            </div>
        </details>
    `;
}
function renderCharacteristicTable(fields) {

    return `
        <div class="characteristic-section">


            <table class="characteristic-table">

                <thead>
                    <tr>
                        ${fields.map(f => `<th>${f.label}</th>`).join("")}
                    </tr>
                </thead>

                <tbody>

                    <tr>
                        ${fields.map(f =>
        `<td>
                                <input type="number"
                                       
                       min="0"
                       placeholder="Min"
                       data-filter="${f.key}Min"
                       class="char-input">
                            </td>`
    ).join("")}
                    </tr>

                    <tr>
                        ${fields.map(f =>
        `<td>
                                <input type="number"
                       min="0"
                       placeholder="Max"
                                       data-filter="${f.key}Max"
                                       class="char-input">
                            </td>`
    ).join("")}
                    </tr>

                </tbody>

            </table>

        </div>
    `;
}
function renderSelectFilter(title, key, options) {

    return `
        <details class="filter-box">
            <summary>${title}</summary>
            <div class="box-content">
                <select data-filter="${key}">
                    <option value="">-- ${t("profiles.expert.select")} --</option>
                    ${options.map(o =>
        `<option value="${o.value}">${o.label}</option>`
    ).join("")}
                </select>
            </div>
        </details>
    `;
}
function renderMultiCheckboxFilter(title, key) {

    const values = new Set();

    Object.values(state.profiles).forEach(profile => {

        const data = profile[key];

        if (!data) return;

        if (Array.isArray(data)) {
            data.forEach(v => values.add(v));
        } else {
            values.add(data);
        }
    });


    const valuesSort = Array.from(values).sort();

    const listItems = valuesSort.map(value => `
        <li>
            <label>
                <input type="checkbox"
                       data-multi-filter="${key}"
                       value="${value}">
                ${value}
            </label>
        </li>
    `).join("");

    return `
        <details class="filter-box">
            <summary>${title}</summary>

            <div class="box-content">

                <div class="filter-mode">
    <div class="mode-label">${t("profiles.expert.mode")}</div>
    <label>
        <input type="radio"
               name="${key}-mode"
               value="AND"
               data-filter-mode="${key}"
               checked>
        AND
    </label>
    <label>
        <input type="radio"
               name="${key}-mode"
               value="OR"
               data-filter-mode="${key}">
        OR
    </label>
    <label>
        <input type="radio"
               name="${key}-mode"
               value="NOT"
               data-filter-mode="${key}">
        NOT
    </label>
</div>
<hr class="mode-separator">


                <ul class="filter-list">
                    ${listItems}
                </ul>

            </div>
        </details>
    `;
}
function renderMultiAutocompleteFilter(title, key) {

    return `
        <details class="filter-box">
            <summary>${title}</summary>

            <div class="box-content">

                <div class="filter-mode">
    <div class="mode-label">${t("profiles.expert.mode")}</div>
    <label>
        <input type="radio"
               name="${key}-mode"
               value="AND"
               data-filter-mode="${key}"
               checked>
        AND
    </label>
    <label>
        <input type="radio"
               name="${key}-mode"
               value="OR"
               data-filter-mode="${key}">
        OR
    </label>
    <label>
        <input type="radio"
               name="${key}-mode"
               value="NOT"
               data-filter-mode="${key}">
        NOT
    </label>

</div>
<hr class="mode-separator">


                <div class="selected-wrapper" data-wrapper="${key}">
    <div class="selected-items" data-selected="${key}"></div>
</div>


                <input type="text"
                       data-autocomplete="${key}"
                       placeholder="${t("profiles.expert.search")}"
                       autocomplete="off">

                <ul class="autocomplete-results"
                    data-autolist="${key}"></ul>
                    

            </div>
        </details>
    `;
}
function renderDefinitionSuggestions(query, key, list) {

    list.innerHTML = "";
    list.classList.remove("visible");

    const q = normalize(query);
    if (!q) return;

    const allowedTypes = {
        wargear: ["wargear"],
        options: ["wargear"],
        specialRules: ["specialrule"],
        magicalPowers: ["magicalpower"]
    };

    const results = [];

    Object.values(state.definitions)
        .filter(def => allowedTypes[key]?.includes(def.type))
        .forEach(def => {

            const nameMatch =
                normalize(def.name).includes(q);

            if (nameMatch) {
                results.push({
                    label: def.name,
                    value: def.name
                });
            }
        });

    if (!results.length) return;

    results.slice(0, 10).forEach(result => {

        const li = document.createElement("li");
        li.textContent = result.label;

        li.onclick = () => {

            if (!state.filters[key].includes(result.value)) {
                state.filters[key].push(result.value);
            }

    renderSelectedChips(key);
    renderResults();

            const input = state.container.querySelector(
                `[data-autocomplete="${key}"]`
            );
            if (input) input.value = "";

            list.innerHTML = "";
            list.classList.remove("visible");
        };

        list.appendChild(li);
    });

    list.classList.add("visible");
}
function renderSelectedChips(key) {

    const container =
        state.container.querySelector(
            `[data-selected="${key}"]`
        );

    const wrapper =
        state.container.querySelector(
            `[data-wrapper="${key}"]`
        );

    container.innerHTML = "";

    const values = state.filters[key];

    if (!values.length) {
        wrapper.classList.remove("has-values");
        return;
    }

    wrapper.classList.add("has-values");

    values.forEach(value => {

        const chip = document.createElement("div");
        chip.className = "filter-chip";

        chip.innerHTML = `
            ${value}
            <span class="remove-chip"
                  data-key="${key}"
                  data-value="${value}">
                ×
            </span>
        `;

        container.appendChild(chip);
    });
}


/* =========================
   UTILITY
========================= */

function extractNumber(value) {
    if (!value) return null;

    const match = String(value).match(/\d+/);

    return match ? Number(match[0]) : null;
}
function evaluateMinMax(value, min, max) {

    if (value === null) return false;

    if (min !== "" && value < Number(min)) return false;
    if (max !== "" && value > Number(max)) return false;

    return true;
}
function evaluateCharacteristic(profile, field, min, max) {

    if (!min && !max) return true;

    const value = extractNumber(profile.characteristics?.[field]);

    return evaluateMinMax(value, min, max);
}
function evaluateHeroCharacteristic(profile, field, min, max) {

    if (!min && !max) return true;

    const value = extractNumber(profile.characteristicsHero?.[field]);

    return evaluateMinMax(value, min, max);
}
function evaluateSiegeCharacteristic(profile, field, min, max) {

    if (!min && !max) return true;

    const value = extractNumber(profile.characteristicsSiegeEngine?.[field]);

    return evaluateMinMax(value, min, max);
}
function evaluateSiegeRange(profile, min, max) {

    if (!min && !max) return true;

    const match = profile.characteristicsSiegeEngine?.range.match(/(\d+).*?(\d+)/);
    if (!match) return null;

    const rangeData = {
        min: Number(match[1]),
        max: Number(match[2])
    };

    if (!rangeData) return false;

    if (min !== "" && rangeData.min < Number(min)) return false;

    if (max !== "" && rangeData.max > Number(max)) return false;

    return true;
}
function evaluateMultiSelectFilter(profileValues = [], selected = [], mode = "AND") {

    if (!selected.length) return true;

    if (!Array.isArray(profileValues)) {
        profileValues = [profileValues];
    }

    if (mode === "AND") {
        return selected.every(v => profileValues.includes(v));
    }

    if (mode === "OR") {
        return selected.some(v => profileValues.includes(v));
    }

    if (mode === "NOT") {
        return !selected.some(v => profileValues.includes(v));
    }

    return true;
}
function normalize(str) {
    return String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
function evaluateObjectArrayFilter(
    profileArray = [],
    selected = [],
    mode = "AND"
) {

    if (!selected.length) return true;

    const names = (profileArray || [])
        .map(obj => obj.name);

    if (mode === "AND") {
        return selected.every(v => names.includes(v));
    }

    if (mode === "OR") {
        return selected.some(v => names.includes(v));
    }

    if (mode === "NOT") {
        return !selected.some(v => names.includes(v));
    }

    return true;
}