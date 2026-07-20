import { Settings } from "../settings.js";
import { loadDefinitions, loadProfiles } from "../utility/dataLoader.js";
import { t } from "../utility/i18n.js";

const state = {
    definitions: null,
    profiles: null,
    profileByName: {},
    manual: null,
    activeRule: null,
    activeReference: null,
    referenceHistory: [],
    referenceHistoryIndex: -1,
    detailEl: null,
    referenceEl: null,
    expandedChapters: new Set(),
    expandedSections: new Set()
};

export async function initRulesManual(container) {
    state.definitions = await loadDefinitions();

    if (Settings.language !== "en") {
        try {
            const fallbackResponse = await fetch(`data/en/${Settings.version}/definitions.json`);
            const fallbackDefinitions = await fallbackResponse.json();
            state.definitions = { ...fallbackDefinitions, ...state.definitions };
        } catch (error) {
            console.warn("Could not load English definitions fallback:", error);
        }
    }

    if (!state.profiles) {
        state.profiles = await loadProfiles();
        state.profileByName = {};
        Object.values(state.profiles || {}).forEach(profile => {
            if (profile?.name) {
                state.profileByName[profile.name] = profile;
            }
        });
    }

    const manualResponse = await fetch(`data/${Settings.language}/${Settings.version}/rulesManual.json`);
    state.manual = await manualResponse.json();

    container.innerHTML = `
        <div class="rules-manual">
            <div class="rules-manual-layout">
                <div class="rules-manual-panel rules-manual-overview">
                    <h2 class="rules-manual-panel-title">${t("rules.manual.chapters")}</h2>
                    <div id="rulesManualTree"></div>
                </div>

                <div class="rules-manual-panel rules-manual-detail">
                    <h2 class="rules-manual-panel-title">${t("rules.manual.rules")}</h2>
                    <div id="rulesManualDetail"></div>
                </div>

                <div class="rules-manual-panel rules-manual-reference">
                    <h2 class="rules-manual-panel-title">${t("rules.manual.references")}</h2>
                    <div id="rulesManualReference"></div>
                </div>
            </div>
        </div>
    `;

    const treeEl = container.querySelector("#rulesManualTree");
    state.detailEl = container.querySelector("#rulesManualDetail");
    state.referenceEl = container.querySelector("#rulesManualReference");

    renderOverview(treeEl, state.detailEl, state.referenceEl);
}

function renderOverview(treeEl, detailEl, referenceEl) {
    treeEl.innerHTML = "";

    const chapters = state.manual?.chapters || [];
    const fragment = document.createDocumentFragment();

    chapters.forEach(chapter => {
        const chapterKey = chapter.title;
        const chapterEl = document.createElement("details");
        chapterEl.className = "rules-manual-chapter";
        chapterEl.open = state.expandedChapters.has(chapterKey);

        const chapterTitle = document.createElement("summary");
        chapterTitle.className = "rules-manual-chapter-title";
        chapterTitle.textContent = chapter.title;
        chapterTitle.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            const isOpen = state.expandedChapters.has(chapterKey);
            if (isOpen) {
                state.expandedChapters.delete(chapterKey);
                chapterEl.open = false;
            } else {
                state.expandedChapters.add(chapterKey);
                chapterEl.open = true;
            }
        });
        chapterEl.appendChild(chapterTitle);

        const contentEl = document.createElement("div");
        contentEl.className = "rules-manual-chapter-content";

        (chapter.sections || []).forEach(section => {
            const sectionKey = `${chapter.title}::${section.title}`;
            const sectionEl = document.createElement("details");
            sectionEl.className = "rules-manual-section";
            sectionEl.open = state.expandedSections.has(sectionKey);

            const sectionTitle = document.createElement("summary");
            sectionTitle.className = "rules-manual-section-title";
            sectionTitle.textContent = section.title;
            sectionTitle.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();

                const isOpen = state.expandedSections.has(sectionKey);
                if (isOpen) {
                    state.expandedSections.delete(sectionKey);
                    sectionEl.open = false;
                } else {
                    state.expandedSections.add(sectionKey);
                    sectionEl.open = true;
                }
            });
            sectionEl.appendChild(sectionTitle);

            const sectionContent = document.createElement("div");
            sectionContent.className = "rules-manual-section-content";

            const ruleList = document.createElement("div");
            ruleList.className = "rules-manual-rule-list";

            (section.rules || []).forEach(rule => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "rules-manual-rule";

                const definition = findDefinition(rule.definition);
                if (definition) {
                    button.classList.add("linked");
                }

                if (state.activeRule?.definition === rule.definition) {
                    button.classList.add("active");
                }

                button.textContent = rule.title;
                button.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    state.activeRule = {
                        ...rule,
                        chapterTitle: chapter.title,
                        sectionTitle: section.title
                    };
                    state.activeReference = null;
                    state.referenceHistory = [];
                    state.referenceHistoryIndex = -1;
                    renderOverview(treeEl, detailEl, referenceEl);
                    renderDetail(detailEl);
                    renderReference(referenceEl);
                };

                ruleList.appendChild(button);
            });

            sectionContent.appendChild(ruleList);
            sectionEl.appendChild(sectionContent);
            contentEl.appendChild(sectionEl);
        });

        chapterEl.appendChild(contentEl);
        fragment.appendChild(chapterEl);
    });

    treeEl.appendChild(fragment);
}

function renderDetail(detailEl) {
    if (!state.activeRule) {
        detailEl.innerHTML = `<div class="rules-manual-empty">${t("rules.manual.selectRule")}</div>`;
        return;
    }

    const definition = findDefinition(state.activeRule.definition);

    if (!definition) {
        detailEl.innerHTML = `
            <div class="rules-manual-definition-header">
                <h3 class="rules-manual-definition-title">${state.activeRule.title}</h3>
            </div>
            <p class="rules-manual-empty">${t("rules.manual.noDefinitionFound")}</p>
        `;
        return;
    }

    detailEl.innerHTML = `
        <div class="rules-manual-definition-header">
            <h3 class="rules-manual-definition-title">${definition.name}</h3>
        </div>

        ${renderMeta(definition)}

        <div class="rules-manual-definition-block">
            <p class="rules-manual-definition-text"></p>
        </div>

        ${Settings.profileSettings.showGWFAQNotes && definition.descriptionGWFAQ ? `
            <div class="rules-manual-gwfaq">
                <h4>${t("rules.manual.gwFaq")}</h4>
                <p class="rules-manual-gwfaq-text"></p>
            </div>
        ` : ""}
    `;

    renderDefinitionText(definition.description, detailEl.querySelector(".rules-manual-definition-text"), definition);

    if (Settings.profileSettings.showGWFAQNotes && definition.descriptionGWFAQ) {
        renderDefinitionText(definition.descriptionGWFAQ, detailEl.querySelector(".rules-manual-gwfaq-text"), definition);
    }
}

function renderReference(referenceEl) {
    if (!state.activeReference) {
        referenceEl.innerHTML = `<div class="rules-manual-empty">${t("rules.manual.selectReference")}</div>`;
        return;
    }

    const reference = state.activeReference;

    if (reference.type === "profile") {
        const profile = reference.data;
        referenceEl.innerHTML = `
            <div class="rules-manual-definition-header">
                <h3 class="rules-manual-definition-title">${profile.name}</h3>
                <div class="rules-manual-definition-toolbar">
                    <button class="def-back">←</button>
                    <button class="def-forward">→</button>
                    <button class="def-close">✕</button>
                </div>
            </div>
            <p class="rules-manual-definition-text">${profile.description || t("rules.manual.noProfileDescription")}</p>
        `;
        bindReferenceToolbar(referenceEl);
        return;
    }

    const definition = reference.data;

    referenceEl.innerHTML = `
        <div class="rules-manual-definition-header">
            <h3 class="rules-manual-definition-title">${definition.name}</h3>
            <div class="rules-manual-definition-toolbar">
                <button class="def-back">←</button>
                <button class="def-forward">→</button>
                <button class="def-close">✕</button>
            </div>
        </div>

        ${renderMeta(definition)}

        <div class="rules-manual-definition-block">
            <p class="rules-manual-definition-text"></p>
        </div>

        ${Settings.profileSettings.showGWFAQNotes && definition.descriptionGWFAQ ? `
            <div class="rules-manual-gwfaq">
                <h4>${t("rules.manual.gwFaq")}</h4>
                <p class="rules-manual-gwfaq-text"></p>
            </div>
        ` : ""}
    `;

    renderDefinitionText(definition.description, referenceEl.querySelector(".rules-manual-definition-text"), definition, "reference");

    if (Settings.profileSettings.showGWFAQNotes && definition.descriptionGWFAQ) {
        renderDefinitionText(definition.descriptionGWFAQ, referenceEl.querySelector(".rules-manual-gwfaq-text"), definition, "reference");
    }

    bindReferenceToolbar(referenceEl);
}

function renderDefinitionText(text, container, def, context) {
    if (!text) return;

    let html = formatText(text)
        .replace("{Character}", t("rules.all.Character"))
        .replace("{character}", t("rules.all.character"));

    const protectedTokens = [];

    if (def.excludeFromLinking?.length) {
        def.excludeFromLinking.forEach((phrase, i) => {
            const token = `__PROTECTED_${i}__`;
            const escaped = escapeRegex(phrase.trim());
            html = html.replace(new RegExp(`\\b${escaped}\\b`, "g"), token);
            protectedTokens.push({ token, value: phrase.trim() });
        });
    }

    let refs = buildReferenceList(def);
    refs = refs.sort((a, b) => b.display.length - a.display.length);

    refs.forEach((ref, i) => {
        if (def.excludeFromLinking?.includes(ref.display)) return;

        const escaped = escapeRegex(ref.display);
        const token = `__LINK_${i}__`;
        html = html.replace(new RegExp(`\\b${escaped}\\b`, "g"), token);
        protectedTokens.push({
            token,
            value: `<span class="rules-definition-link" data-target="${ref.target}" data-type="${ref.type}">${ref.display}</span>`
        });
    });

    protectedTokens.forEach(entry => {
        html = html.replaceAll(entry.token, entry.value);
    });

    container.innerHTML = html;

    container.querySelectorAll(".rules-definition-link").forEach(el => {
        el.onclick = () => {
            const target = el.dataset.target;
            const type = el.dataset.type;

            if (type === "profile") {
                const profile = findProfile(target);
                if (profile) {
                    pushReferenceState({ type: "profile", data: profile });
                    renderReference(state.referenceEl);
                }
                return;
            }

            const definition = findDefinition(target);
            if (definition) {
                pushReferenceState({ type: "rule", data: definition });
                renderReference(state.referenceEl);
            }
        };
    });
}

function pushReferenceState(entry) {
    state.referenceHistory = state.referenceHistory.slice(0, state.referenceHistoryIndex + 1);
    state.referenceHistory.push(entry);
    state.referenceHistoryIndex = state.referenceHistory.length - 1;
    state.activeReference = entry;
}

function bindReferenceToolbar(referenceEl) {
    const backBtn = referenceEl.querySelector(".def-back");
    const forwardBtn = referenceEl.querySelector(".def-forward");
    const closeBtn = referenceEl.querySelector(".def-close");

    if (backBtn) {
        backBtn.disabled = state.referenceHistoryIndex <= 0;
        backBtn.onclick = () => {
            if (state.referenceHistoryIndex > 0) {
                state.referenceHistoryIndex--;
                state.activeReference = state.referenceHistory[state.referenceHistoryIndex] || null;
                renderReference(referenceEl);
            }
        };
    }

    if (forwardBtn) {
        forwardBtn.disabled = state.referenceHistoryIndex >= state.referenceHistory.length - 1;
        forwardBtn.onclick = () => {
            if (state.referenceHistoryIndex < state.referenceHistory.length - 1) {
                state.referenceHistoryIndex++;
                state.activeReference = state.referenceHistory[state.referenceHistoryIndex] || null;
                renderReference(referenceEl);
            }
        };
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            state.activeReference = null;
            state.referenceHistory = [];
            state.referenceHistoryIndex = -1;
            renderReference(referenceEl);
        };
    }
}

function renderMeta(def) {
    if (!def.status && !def.phase && !def.duration) return "";

    return `
        <div class="rules-definition-meta">
            ${def.status ? `<span>${def.status}</span>` : ""}
            ${def.phase ? `<span>${def.phase}</span>` : ""}
            ${def.duration ? `<span>${def.duration}</span>` : ""}
        </div>
    `;
}

function buildReferenceList(def) {
    const refs = [];

    if (Settings.profileSettings.enableRulesLink && def.linkedRules) {
        def.linkedRules.forEach(r => refs.push({ raw: r, type: "definition" }));
    }

    if (Settings.profileSettings.enableDetailsLink && def.linkedDetails) {
        def.linkedDetails.forEach(r => refs.push({ raw: r, type: "definition" }));
    }

    if (Settings.profileSettings.enableProfilesLink && def.linkedProfiles) {
        def.linkedProfiles.forEach(p => refs.push({ raw: p, type: "profile" }));
    }

    return refs.map(entry => {
        const [text, target] = entry.raw.split("|");
        return {
            display: text.trim(),
            target: (target || text).trim(),
            type: entry.type
        };
    }).sort((a, b) => b.display.length - a.display.length);
}

function findDefinition(name) {
    if (!name) return null;

    const rawName = String(name).trim();

    if (state.definitions?.[rawName]) return state.definitions[rawName];

    const cleanedName = normalizeEntryName(name);

    if (state.definitions?.[cleanedName]) return state.definitions[cleanedName];

    const directMatch = Object.entries(state.definitions || {}).find(([key, def]) => {
        if (!def || typeof def !== "object") return false;
        return key === cleanedName || def.name === cleanedName || def.name?.toLowerCase() === cleanedName.toLowerCase();
    });

    if (directMatch) return directMatch[1];

    for (const def of Object.values(state.definitions || {})) {
        if (def.alias?.includes(cleanedName)) return def;
    }

    return null;
}

function findProfile(name) {
    if (!name) return null;

    const cleanedName = normalizeEntryName(name);

    if (state.profileByName?.[cleanedName]) return state.profileByName[cleanedName];

    return Object.values(state.profiles || {}).find(profile => {
        return profile?.name === cleanedName || profile?.name?.toLowerCase() === cleanedName.toLowerCase() || profile?.alias?.includes(cleanedName);
    }) || null;
}

function formatText(text) {
    return text
        .replace(/\n/g, "<br>")
        .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeEntryName(name) {
    return String(name || "")
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/\s*\[[^\]]*\]/g, "")
        .trim();
}