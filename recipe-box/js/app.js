// ---- Storage ----

const STORAGE_KEY = 'recipeBox.recipes.v1';

function loadRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveRecipes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- State ----

let recipes = loadRecipes();
let activeCuisine = 'All';
let searchQuery = '';
let editingId = null;

// ---- DOM refs ----

const addBtn = document.getElementById('addBtn');
const emptyAddBtn = document.getElementById('emptyAddBtn');
const controls = document.getElementById('controls');
const searchInput = document.getElementById('searchInput');
const cuisinePills = document.getElementById('cuisinePills');
const emptyState = document.getElementById('emptyState');
const noResults = document.getElementById('noResults');
const grid = document.getElementById('grid');

const formDialog = document.getElementById('formDialog');
const recipeForm = document.getElementById('recipeForm');
const formTitle = document.getElementById('formTitle');
const sourceUrlInput = document.getElementById('sourceUrl');
const fetchBtn = document.getElementById('fetchBtn');
const fetchStatus = document.getElementById('fetchStatus');
const titleInput = document.getElementById('titleInput');
const cuisineSelect = document.getElementById('cuisineSelect');
const customCuisineField = document.getElementById('customCuisineField');
const customCuisineInput = document.getElementById('customCuisineInput');
const imageInput = document.getElementById('imageInput');
const ingredientsInput = document.getElementById('ingredientsInput');
const instructionsInput = document.getElementById('instructionsInput');
const notesInput = document.getElementById('notesInput');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const cancelFormBtnX = document.getElementById('cancelFormBtnX');

const detailDialog = document.getElementById('detailDialog');
const detailContent = document.getElementById('detailContent');

const toast = document.getElementById('toast');

const PRESET_CUISINES = Array.from(cuisineSelect.options)
  .map(o => o.value)
  .filter(v => v && v !== '__other__');

// ---- Helpers ----

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.href);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch (e) { /* ignore */ }
  return '';
}

function showToast(message, duration = 2600) {
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('show'));
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => { toast.hidden = true; }, 200);
  }, duration);
}

// ---- Recipe schema (JSON-LD) parsing ----

function collectRecipeNodes(node, out) {
  if (Array.isArray(node)) {
    node.forEach(n => collectRecipeNodes(n, out));
    return;
  }
  if (!node || typeof node !== 'object') return;
  const type = node['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.includes('Recipe')) out.push(node);
  if (node['@graph']) collectRecipeNodes(node['@graph'], out);
}

function extractRecipeNode(htmlString) {
  const doc = new DOMParser().parseFromString(htmlString, 'text/html');
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  const found = [];
  scripts.forEach(script => {
    try {
      const data = JSON.parse(script.textContent);
      collectRecipeNodes(data, found);
    } catch (e) { /* skip malformed JSON-LD */ }
  });
  return found[0] || null;
}

function normalizeImage(img) {
  if (!img) return '';
  if (Array.isArray(img)) return normalizeImage(img[0]);
  if (typeof img === 'string') return img;
  if (typeof img === 'object') return img.url || img['@id'] || '';
  return '';
}

function normalizeCuisine(cuisine) {
  if (!cuisine) return '';
  if (Array.isArray(cuisine)) return cuisine[0] || '';
  return String(cuisine);
}

function flattenInstructions(instr) {
  if (!instr) return [];
  if (typeof instr === 'string') {
    return instr.split(/\n+/).map(s => s.trim()).filter(Boolean);
  }
  if (Array.isArray(instr)) {
    let out = [];
    instr.forEach(item => {
      if (typeof item === 'string') {
        out.push(item.trim());
      } else if (item && typeof item === 'object') {
        if (item['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
          out = out.concat(flattenInstructions(item.itemListElement));
        } else {
          out.push(String(item.text || item.name || '').trim());
        }
      }
    });
    return out.filter(Boolean);
  }
  return [];
}

function schemaToRecipe(node) {
  return {
    title: String(node.name || '').trim(),
    image: normalizeImage(node.image),
    cuisine: normalizeCuisine(node.recipeCuisine),
    ingredients: Array.isArray(node.recipeIngredient) ? node.recipeIngredient.map(s => String(s).trim()).filter(Boolean) : [],
    instructions: flattenInstructions(node.recipeInstructions),
  };
}

// ---- Fetching via CORS proxy ----

async function fetchHtmlViaProxy(url) {
  const proxyUrls = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  ];
  let lastError = null;
  for (const proxyUrl of proxyUrls) {
    try {
      const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 200) return text;
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('Could not reach that page');
}

async function handleFetchClick() {
  const url = sourceUrlInput.value.trim();
  if (!url) {
    fetchStatus.textContent = 'Enter a URL first.';
    return;
  }
  fetchBtn.disabled = true;
  fetchStatus.textContent = 'Fetching…';
  try {
    const html = await fetchHtmlViaProxy(url);
    const node = extractRecipeNode(html);
    if (!node) throw new Error('No recipe data found on that page');
    const parsed = schemaToRecipe(node);
    applyParsedRecipe(parsed);
    fetchStatus.textContent = 'Filled in from the page — double-check everything below.';
  } catch (err) {
    fetchStatus.textContent = "Couldn't auto-fill from that link — enter the details below manually.";
  } finally {
    fetchBtn.disabled = false;
  }
}

function applyParsedRecipe(parsed) {
  if (parsed.title) titleInput.value = parsed.title;
  if (parsed.image) imageInput.value = parsed.image;
  if (parsed.ingredients.length) ingredientsInput.value = parsed.ingredients.join('\n');
  if (parsed.instructions.length) instructionsInput.value = parsed.instructions.join('\n');
  setCuisineFields(parsed.cuisine);
}

function setCuisineFields(cuisine) {
  if (!cuisine) {
    cuisineSelect.value = '';
    customCuisineField.hidden = true;
    customCuisineInput.value = '';
    return;
  }
  const match = PRESET_CUISINES.find(c => c.toLowerCase() === cuisine.toLowerCase());
  if (match) {
    cuisineSelect.value = match;
    customCuisineField.hidden = true;
    customCuisineInput.value = '';
  } else {
    cuisineSelect.value = '__other__';
    customCuisineField.hidden = false;
    customCuisineInput.value = cuisine;
  }
}

cuisineSelect.addEventListener('change', () => {
  customCuisineField.hidden = cuisineSelect.value !== '__other__';
});

// ---- Form dialog ----

function resetForm() {
  recipeForm.reset();
  fetchStatus.textContent = '';
  customCuisineField.hidden = true;
}

function openAddDialog() {
  editingId = null;
  formTitle.textContent = 'Add a recipe';
  resetForm();
  formDialog.showModal();
}

function openEditDialog(recipe) {
  editingId = recipe.id;
  formTitle.textContent = 'Edit recipe';
  resetForm();
  sourceUrlInput.value = recipe.sourceUrl || '';
  titleInput.value = recipe.title || '';
  imageInput.value = recipe.image || '';
  ingredientsInput.value = (recipe.ingredients || []).join('\n');
  instructionsInput.value = (recipe.instructions || []).join('\n');
  notesInput.value = recipe.notes || '';
  setCuisineFields(recipe.cuisine || '');
  formDialog.showModal();
}

function closeFormDialog() {
  formDialog.close();
  resetForm();
}

addBtn.addEventListener('click', openAddDialog);
emptyAddBtn.addEventListener('click', openAddDialog);
cancelFormBtn.addEventListener('click', closeFormDialog);
cancelFormBtnX.addEventListener('click', closeFormDialog);
fetchBtn.addEventListener('click', handleFetchClick);

formDialog.addEventListener('click', e => {
  if (e.target === formDialog) closeFormDialog();
});

recipeForm.addEventListener('submit', e => {
  e.preventDefault();

  const title = titleInput.value.trim();
  if (!title) return;

  let cuisine = cuisineSelect.value;
  if (cuisine === '__other__') cuisine = customCuisineInput.value.trim();

  const sourceUrl = sourceUrlInput.value.trim();
  const ingredients = ingredientsInput.value.split('\n').map(s => s.trim()).filter(Boolean);
  const instructions = instructionsInput.value.split('\n').map(s => s.trim()).filter(Boolean);
  const notes = notesInput.value.trim();
  const image = imageInput.value.trim();

  if (!editingId && sourceUrl) {
    const dup = recipes.find(r => r.sourceUrl === sourceUrl);
    if (dup && !window.confirm('You already saved a recipe from this URL. Save it again anyway?')) {
      return;
    }
  }

  if (editingId) {
    const existing = recipes.find(r => r.id === editingId);
    const updated = {
      ...existing,
      title, cuisine, sourceUrl, image, ingredients, instructions, notes,
    };
    recipes = recipes.map(r => (r.id === editingId ? updated : r));
  } else {
    recipes.push({
      id: generateId(),
      title, cuisine, sourceUrl, image, ingredients, instructions, notes,
      savedAt: Date.now(),
    });
  }

  saveRecipes();
  closeFormDialog();
  render();
  showToast('Recipe saved.');
});

// ---- Detail dialog ----

function openDetail(id) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;

  const safeImage = sanitizeUrl(recipe.image);
  const safeSource = sanitizeUrl(recipe.sourceUrl);

  const imageHtml = safeImage
    ? `<img class="detail-img" src="${escapeHtml(safeImage)}" alt="">`
    : `<div class="detail-img" style="display:flex;align-items:center;justify-content:center;font-size:3rem;">🍽️</div>`;

  const ingredientsHtml = recipe.ingredients && recipe.ingredients.length
    ? `<ul>${recipe.ingredients.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`
    : '<p class="detail-notes">No ingredients listed.</p>';

  const instructionsHtml = recipe.instructions && recipe.instructions.length
    ? `<ol>${recipe.instructions.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`
    : '<p class="detail-notes">No instructions listed.</p>';

  const notesHtml = recipe.notes
    ? `<div class="detail-section"><h3>Notes</h3><p class="detail-notes">${escapeHtml(recipe.notes)}</p></div>`
    : '';

  const sourceHtml = safeSource
    ? `<a class="detail-source" href="${escapeHtml(safeSource)}" target="_blank" rel="noopener noreferrer">View original recipe ↗</a>`
    : '';

  detailContent.innerHTML = `
    ${imageHtml}
    <div class="detail-text">
      <div class="detail-top">
        <h2>${escapeHtml(recipe.title)}</h2>
        <button type="button" class="icon-btn" id="detailCloseBtn" aria-label="Close">×</button>
      </div>
      ${recipe.cuisine ? `<span class="badge">${escapeHtml(recipe.cuisine)}</span>` : ''}
      <br>
      ${sourceHtml}
      <div class="detail-section">
        <h3>Ingredients</h3>
        ${ingredientsHtml}
      </div>
      <div class="detail-section">
        <h3>Instructions</h3>
        ${instructionsHtml}
      </div>
      ${notesHtml}
      <div class="detail-actions">
        <button type="button" class="btn btn-secondary" id="detailEditBtn">Edit</button>
        <button type="button" class="btn btn-danger" id="detailDeleteBtn">Delete</button>
      </div>
    </div>
  `;

  document.getElementById('detailCloseBtn').addEventListener('click', () => detailDialog.close());
  document.getElementById('detailEditBtn').addEventListener('click', () => {
    detailDialog.close();
    openEditDialog(recipe);
  });
  document.getElementById('detailDeleteBtn').addEventListener('click', () => {
    if (window.confirm(`Delete "${recipe.title}"? This can't be undone.`)) {
      recipes = recipes.filter(r => r.id !== recipe.id);
      saveRecipes();
      detailDialog.close();
      render();
      showToast('Recipe deleted.');
    }
  });

  detailDialog.showModal();
}

detailDialog.addEventListener('click', e => {
  if (e.target === detailDialog) detailDialog.close();
});

grid.addEventListener('click', e => {
  const card = e.target.closest('.recipe-card');
  if (card) openDetail(card.dataset.id);
});

// ---- Search / filter ----

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  renderGrid();
});

cuisinePills.addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  activeCuisine = pill.dataset.cuisine;
  render();
});

// ---- Rendering ----

function getFilteredRecipes() {
  return recipes.filter(r => {
    const cuisineMatch = activeCuisine === 'All' || (r.cuisine || 'Uncategorized') === activeCuisine;
    if (!cuisineMatch) return false;
    if (!searchQuery) return true;
    const haystack = [r.title, ...(r.ingredients || [])].join(' ').toLowerCase();
    return haystack.includes(searchQuery);
  });
}

function renderCuisinePills() {
  const counts = {};
  recipes.forEach(r => {
    const c = r.cuisine || 'Uncategorized';
    counts[c] = (counts[c] || 0) + 1;
  });
  const cuisines = Object.keys(counts).sort();

  let html = `<button type="button" class="pill ${activeCuisine === 'All' ? 'active' : ''}" data-cuisine="All">All <span class="count">${recipes.length}</span></button>`;
  cuisines.forEach(c => {
    html += `<button type="button" class="pill ${activeCuisine === c ? 'active' : ''}" data-cuisine="${escapeHtml(c)}">${escapeHtml(c)} <span class="count">${counts[c]}</span></button>`;
  });
  cuisinePills.innerHTML = html;
}

function renderGrid() {
  const filtered = getFilteredRecipes();

  if (recipes.length === 0) {
    grid.innerHTML = '';
    noResults.hidden = true;
    return;
  }

  if (filtered.length === 0) {
    grid.innerHTML = '';
    noResults.hidden = false;
    return;
  }

  noResults.hidden = true;
  grid.innerHTML = filtered
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt)
    .map(r => {
      const safeImage = sanitizeUrl(r.image);
      const imgHtml = safeImage
        ? `<img src="${escapeHtml(safeImage)}" alt="" loading="lazy">`
        : '🍽️';
      return `
        <article class="recipe-card" data-id="${r.id}">
          <div class="card-img">${imgHtml}</div>
          <div class="card-body">
            <h3>${escapeHtml(r.title)}</h3>
            ${r.cuisine ? `<span class="badge">${escapeHtml(r.cuisine)}</span>` : ''}
          </div>
        </article>
      `;
    })
    .join('');
}

function render() {
  const hasAny = recipes.length > 0;
  emptyState.hidden = hasAny;
  controls.hidden = !hasAny;
  renderCuisinePills();
  renderGrid();
}

render();
