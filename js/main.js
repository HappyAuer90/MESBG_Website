import { Settings, initSettingsUI } from "./settings.js";

import { renderSearchProfile } from "./profiles/searchProfile.js";
import { renderExpertSearch } from "./profiles/expertSearch.js";
import { renderShowAllProfiles } from "./profiles/showAllProfiles.js";

import { renderSearchArmylist } from "./armylists/searchArmylist.js";
import { renderShowAllArmylists } from "./armylists/showAllArmylists.js";
import { renderBuildArmylist } from "./armylists/buildArmylist.js";

Settings.load();

const content = document.getElementById("content");
const subnav = document.getElementById("subnav");

document.getElementById("settingsBtn").onclick = () => {
    document.getElementById("settingsModal").classList.remove("hidden");
    initSettingsUI();
};

document.querySelectorAll("nav button").forEach(btn => {
    btn.onclick = () => loadSection(btn.dataset.section);
});

function loadSection(section) {
    subnav.innerHTML = "";

    if (section === "profiles") {
        addSubButton("Search Profile", () => renderSearchProfile(content));
        addSubButton("Expert Search", () => renderExpertSearch(content));
        addSubButton("Show All Profiles", () => renderShowAllProfiles(content));
    }

    if (section === "armylists") {
        addSubButton("Search Armylist", () => renderSearchArmylist(content));
        addSubButton("Show All Armylists", () => renderShowAllArmylists(content));
        addSubButton("Build Armylist", () => renderBuildArmylist(content));
    }
}

function addSubButton(label, action) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.onclick = action;
    subnav.appendChild(btn);
}

function setActive(buttons, activeBtn) {
    buttons.forEach(b => b.classList.remove("active"));
    activeBtn.classList.add("active");
}
document.querySelectorAll("#mainCategories button").forEach(btn => {
    btn.addEventListener("click", () => {
        setActive(
            document.querySelectorAll("#mainCategories button"),
            btn
        );
        loadSection(btn.dataset.section);
    });
});

