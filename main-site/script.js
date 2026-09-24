// Cocktail Guide: theme wiring (uwuapps-theme.md, section 6) and search.

import {
  COLOR_THEMES,
  applyColorTheme,
  applyMode,
  getStoredColorTheme,
  getStoredMode,
  getModePreference,
  initTheme,
} from "./js/theme.js";
import { hydrateIcons, openModal, closeModal } from "./js/ui.js";
import "./js/update.js";

/* ---- theme ---- */

function buildThemeModal() {
  const grid = document.getElementById("swatchGrid");
  grid.innerHTML = COLOR_THEMES.map(
    (t) => `
      <button class="swatch" data-theme-id="${t.id}" style="--swatch-color:${t.hex}" type="button" aria-label="${t.label}">
        <span class="swatch-dot"></span>
        <span class="swatch-label">${t.label}</span>
      </button>`
  ).join("");

  syncThemeModalState();

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-id]");
    if (!btn) return;
    applyColorTheme(btn.dataset.themeId);
    syncThemeModalState();
  });

  document.getElementById("modeToggle").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;
    applyMode(btn.dataset.mode);
    syncThemeModalState();
  });

  // A tab left open across 09:00 or 18:00 re-resolves itself; redraw the
  // modal so the note and pressed state stay in step with the change.
  document.addEventListener("uwu:modechange", syncThemeModalState);
}

function syncThemeModalState() {
  const activeTheme = getStoredColorTheme();
  const activePreference = getModePreference();
  const resolvedMode = getStoredMode();

  document.querySelectorAll("#swatchGrid .swatch").forEach((el) => {
    el.classList.toggle("active", el.dataset.themeId === activeTheme);
  });
  document.querySelectorAll("#modeToggle .mode-btn").forEach((el) => {
    const isActive = el.dataset.mode === activePreference;
    el.classList.toggle("active", isActive);
    el.setAttribute("aria-pressed", String(isActive));
  });

  const note = document.getElementById("modeNote");
  if (note) {
    note.hidden = activePreference !== "time";
    if (activePreference === "time") {
      note.textContent = `Following the clock. Currently ${resolvedMode}.`;
    }
  }

  updateThemeButtonIcon();
}

function updateThemeButtonIcon() {
  const span = document.querySelector("#themeBtn [data-icon]");
  span.setAttribute("data-icon", getStoredMode() === "dark" ? "moon" : "sun");
  hydrateIcons(document.getElementById("themeBtn"));
}

function wireModals() {
  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });
  document.getElementById("themeBtn").addEventListener("click", () => openModal("themeModal"));
}

/* ---- search ---- */

// Same origin proxy, so the TheCocktailDB key stays on the server. See api/search.js.
const SEARCH_URL = "/api/search?s=";
const MAX_INGREDIENTS = 15;

const result = document.getElementById("result");
const searchForm = document.getElementById("search-form");
const userInp = document.getElementById("user-inp");

function showMessage(text, tone = "") {
  const msg = document.createElement("h3");
  msg.className = tone ? `msg ${tone}` : "msg";
  msg.textContent = text;
  result.replaceChildren(msg);
}

function renderDrink(drink) {
  const img = document.createElement("img");
  img.src = drink.strDrinkThumb;
  img.alt = drink.strDrink;

  const name = document.createElement("h2");
  name.textContent = drink.strDrink;

  const ingredientsTitle = document.createElement("h3");
  ingredientsTitle.textContent = "Ingredients:";

  const ingredients = document.createElement("ul");
  ingredients.className = "ingredients";
  for (let i = 1; i <= MAX_INGREDIENTS; i++) {
    const ingredient = drink[`strIngredient${i}`];
    if (!ingredient) continue;
    const item = document.createElement("li");
    item.textContent = `${drink[`strMeasure${i}`] ?? ""} ${ingredient}`.trim();
    ingredients.append(item);
  }

  const instructionsTitle = document.createElement("h3");
  instructionsTitle.textContent = "Instructions:";

  const instructions = document.createElement("p");
  instructions.textContent = drink.strInstructions;

  result.replaceChildren(img, name, ingredientsTitle, ingredients, instructionsTitle, instructions);
}

async function getInfo() {
  // Lower case so "Margarita" and "margarita" share one cache entry, at
  // Vercel's edge and in the service worker. The API ignores case anyway.
  const query = userInp.value.trim().toLowerCase();

  if (!query) {
    showMessage("The input field cannot be empty");
    return;
  }

  result.setAttribute("aria-busy", "true");

  try {
    let response;
    try {
      response = await fetch(SEARCH_URL + encodeURIComponent(query));
    } catch {
      // No service worker in control yet, and no network.
      showMessage("You're offline and this one isn't saved yet.");
      return;
    }

    const data = await response.json().catch(() => null);

    if (data?.offline) {
      showMessage("You're offline and this one isn't saved yet.");
      return;
    }
    if (!response.ok || !data) {
      showMessage("Something went wrong looking that up. Try again in a moment.", "error");
      return;
    }
    if (!data.drinks?.length) {
      showMessage(`No cocktail found for "${query}".`);
      return;
    }

    userInp.value = "";
    renderDrink(data.drinks[0]);
  } finally {
    result.removeAttribute("aria-busy");
  }
}

/* ---- boot ---- */

function boot() {
  initTheme();
  hydrateIcons();
  updateThemeButtonIcon();
  buildThemeModal();
  wireModals();

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    getInfo();
  });
  getInfo();
}

boot();
