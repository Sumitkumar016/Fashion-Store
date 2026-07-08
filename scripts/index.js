"use strict";

const STORAGE_KEY = "fashion_store_bag_items";
const CONVENIENCE_FEE = 99;
const PLATFORM_FEE = 20;

const state = {
  bagItems: loadFromLocalStorage(),
  searchQuery: "",
};

const selectors = {
  header: document.querySelector(".site-header"),
  navToggle: document.querySelector(".nav-toggle"),
  searchInput: document.querySelector(".search_input"),
  itemsContainer: document.querySelector(".items-container"),
  noResults: document.querySelector(".no-results"),
  bagItemsContainer: document.querySelector(".bag-items-container"),
  bagSummaryContainer: document.querySelector(".bag-details-container"),
  placeOrderButton: document.querySelector(".btn-place-order"),
  bagCounters: document.querySelectorAll(".bag-items"),
  bagSearchForm: document.querySelector(".bag-search-form"),
  productDetailContainer: document.querySelector(".product-detail-container"),
};

const isNestedPage = window.location.pathname.includes("/pages/");
const assetPrefix = isNestedPage ? "../" : "";
const homePath = isNestedPage ? "../index.html" : "index.html";
const bagPath = isNestedPage ? "bag.html" : "pages/bag.html";
const productPath = isNestedPage ? "../product.html" : "product.html";
const products = Array.isArray(items) ? items : [];

init();

function init() {
  setupNavigation();
  setupSearch();
  setupProductEvents();
  setupBagEvents();
  updateBagCount();

  if (selectors.itemsContainer) {
    const query = new URLSearchParams(window.location.search).get("q") || "";
    state.searchQuery = query.trim();
    if (selectors.searchInput) {
      selectors.searchInput.value = state.searchQuery;
    }
    searchItems(state.searchQuery);
  }

  if (selectors.bagItemsContainer) {
    loadBag();
  }

  if (selectors.productDetailContainer) {
    renderProductPage();
  }
}

function setupNavigation() {
  if (!selectors.navToggle || !selectors.header) return;

  selectors.navToggle.addEventListener("click", () => {
    const isOpen = selectors.header.classList.toggle("nav-open");
    document.body.classList.toggle("nav-open", isOpen);
    selectors.navToggle.setAttribute("aria-expanded", String(isOpen));
    selectors.navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  });

  selectors.header.addEventListener("click", (event) => {
    if (!event.target.closest(".nav_bar a")) return;
    selectors.header.classList.remove("nav-open");
    document.body.classList.remove("nav-open");
    selectors.navToggle.setAttribute("aria-expanded", "false");
  });
}

function setupSearch() {
  if (selectors.itemsContainer && selectors.searchInput) {
    selectors.searchInput.addEventListener("input", searchItems);
  }

  if (selectors.bagSearchForm) {
    selectors.bagSearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = selectors.searchInput?.value.trim() || "";
      const search = query ? `?q=${encodeURIComponent(query)}` : "";
      window.location.href = `${homePath}${search}#products`;
    });
  }
}

function setupProductEvents() {
  if (selectors.itemsContainer) {
    selectors.itemsContainer.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (button) {
        event.stopPropagation();
        handleProductAction(button);
        return;
      }

      const card = event.target.closest(".item-card[data-product-id]");
      if (!card) return;
      navigateToProduct(card.dataset.productId);
    });

    selectors.itemsContainer.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("button[data-action]")) return;

      const card = event.target.closest(".item-card[data-product-id]");
      if (!card) return;
      event.preventDefault();
      navigateToProduct(card.dataset.productId);
    });
  }

  if (selectors.productDetailContainer) {
    selectors.productDetailContainer.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      handleProductAction(button);
    });
  }
}

function setupBagEvents() {
  if (!selectors.bagItemsContainer) return;

  selectors.bagItemsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".remove-from-cart");
    if (!button) return;
    removeFromBag(button.dataset.id);
  });
}

function displayItems(productList = products) {
  if (!selectors.itemsContainer) return;

  if (!productList.length) {
    selectors.itemsContainer.innerHTML = "";
    if (selectors.noResults) selectors.noResults.hidden = false;
    return;
  }

  if (selectors.noResults) selectors.noResults.hidden = true;
  selectors.itemsContainer.innerHTML = productList.map(createProductCard).join("");
}

function createProductCard(item) {
  const isAdded = state.bagItems.includes(item.id);
  const addText = isAdded ? "Added to Bag" : "Add to Bag";
  const addIcon = isAdded ? "check_circle" : "shopping_bag";

  return `
    <article class="item-card" data-product-id="${item.id}" tabindex="0" role="link" aria-label="View ${escapeHtml(item.company)} ${escapeHtml(item.item_name)}">
      <div class="item-image-wrap">
        <img class="item-image" src="${assetPrefix}${item.image}" alt="${escapeHtml(item.company)} ${escapeHtml(item.item_name)}">
        <span class="discount-badge">${item.discount_percentage}% OFF</span>
      </div>
      <div class="item-details">
        <span class="rating" aria-label="Rating ${item.rating.stars} out of 5 from ${item.rating.count} reviews">
          <span aria-hidden="true">${formatRating(item.rating.stars)}</span>
          <span class="material-symbols-outlined" aria-hidden="true">star</span>
          <span aria-hidden="true">| ${formatCount(item.rating.count)}</span>
        </span>
        <h3 class="company">${escapeHtml(item.company)}</h3>
        <p class="item-name">${escapeHtml(item.item_name)}</p>
        <div class="price-container" aria-label="Price">
          <span class="current-price">${formatCurrency(item.current_price)}</span>
          <span class="original-price">${formatCurrency(item.original_price)}</span>
          <span class="discount-percentage">(${item.discount_percentage}% OFF)</span>
        </div>
        <div class="card-actions">
          <button class="btn-buy" type="button" data-action="buy" data-id="${item.id}">
            <span class="material-symbols-outlined" aria-hidden="true">bolt</span>
            Buy Now
          </button>
          <button class="btn-bag ${isAdded ? "is-added" : ""}" type="button" data-action="add" data-id="${item.id}" aria-pressed="${isAdded}">
            <span class="material-symbols-outlined" aria-hidden="true">${addIcon}</span>
            ${addText}
          </button>
        </div>
      </div>
    </article>
  `;
}

function handleProductAction(button) {
  const itemId = button.dataset.id;

  if (button.dataset.action === "add") {
    addToBag(itemId);
  }

  if (button.dataset.action === "buy") {
    addToBag(itemId);
    window.location.href = bagPath;
  }
}

function navigateToProduct(itemId) {
  if (!itemId) return;
  window.location.href = `${productPath}?id=${encodeURIComponent(itemId)}`;
}

function addToBag(itemId) {
  if (!itemId || state.bagItems.includes(itemId)) {
    updateProductButtons();
    return;
  }

  state.bagItems = [...state.bagItems, itemId];
  saveToLocalStorage();
  updateBagCount();
  updateProductButtons();
}

function removeFromBag(itemId) {
  state.bagItems = state.bagItems.filter((id) => id !== itemId);
  saveToLocalStorage();
  updateBagCount();
  loadBag();
  updateProductButtons();
}

function loadBag() {
  if (!selectors.bagItemsContainer) return;

  const cartItems = getCartItems();

  if (!cartItems.length) {
    selectors.bagItemsContainer.innerHTML = createEmptyBag();
    renderSummary([]);
    return;
  }

  selectors.bagItemsContainer.innerHTML = cartItems.map(createBagItem).join("");
  renderSummary(cartItems);
}

function createBagItem(item) {
  return `
    <article class="bag-item-container">
      <div class="item-left-part">
        <img class="bag-item-img" src="${assetPrefix}${item.image}" alt="${escapeHtml(item.company)} ${escapeHtml(item.item_name)}">
      </div>
      <div class="item-right-part">
        <div class="bag-item-header">
          <h2 class="company">${escapeHtml(item.company)}</h2>
          <span class="bag-rating" aria-label="Rating ${item.rating.stars} out of 5">
            <span aria-hidden="true">${formatRating(item.rating.stars)}</span>
            <span class="material-symbols-outlined" aria-hidden="true">star</span>
          </span>
        </div>
        <p class="item-name">${escapeHtml(item.item_name)}</p>
        <div class="price-container">
          <span class="current-price">${formatCurrency(item.current_price)}</span>
          <span class="original-price">${formatCurrency(item.original_price)}</span>
          <span class="discount-percentage">(${item.discount_percentage}% OFF)</span>
        </div>
        <div class="bag-meta">
          <p class="return-period"><span class="return-period-days">${item.return_period || 14} days</span> return available</p>
          <p class="delivery-details">Delivery by <span class="delivery-details-days">${escapeHtml(item.delivery_date || "10 Oct 2023")}</span></p>
        </div>
      </div>
      <button class="remove-from-cart" type="button" data-id="${item.id}" aria-label="Remove ${escapeHtml(item.item_name)} from bag">
        <span class="material-symbols-outlined" aria-hidden="true">close</span>
      </button>
    </article>
  `;
}

function createEmptyBag() {
  return `
    <div class="empty-bag">
      <div>
        <div class="empty-bag-illustration">
          <span class="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
        </div>
        <h2>Your Bag is Empty</h2>
        <p>Add products you love and they will stay here until you are ready to check out.</p>
        <a class="btn-primary" href="${homePath}#products">Continue Shopping</a>
      </div>
    </div>
  `;
}

function renderProductPage() {
  const productId = new URLSearchParams(window.location.search).get("id");
  const product = products.find((item) => item.id === productId);

  if (!product) {
    renderProductNotFound();
    return;
  }

  document.title = `${product.company} ${product.item_name} | Fashion Store`;
  selectors.productDetailContainer.innerHTML = createProductDetail(product);
  updateProductButtons();
}

function createProductDetail(item) {
  const isAdded = state.bagItems.includes(item.id);
  const addText = isAdded ? "Added to Bag" : "Add to Bag";
  const addIcon = isAdded ? "check_circle" : "shopping_bag";
  const description = item.description || `${item.item_name} from ${item.company} is selected for everyday comfort, polished styling, and easy pairing with your wardrobe favourites.`;
  const deliveryDate = item.delivery_date || "10 Oct 2023";
  const returnPeriod = item.return_period || 14;

  return `
    <article class="product-layout">
      <div class="product-media">
        <div class="product-image-frame">
          <img class="product-image" src="${assetPrefix}${item.image}" alt="${escapeHtml(item.company)} ${escapeHtml(item.item_name)}">
        </div>
      </div>

      <div class="product-info">
        <div class="product-heading">
          <p class="product-brand">${escapeHtml(item.company)}</p>
          <h1>${escapeHtml(item.item_name)}</h1>
          <span class="product-rating" aria-label="Rating ${item.rating.stars} out of 5 from ${item.rating.count} reviews">
            <span aria-hidden="true">${formatRating(item.rating.stars)}</span>
            <span class="material-symbols-outlined" aria-hidden="true">star</span>
            <span aria-hidden="true">| ${formatCount(item.rating.count)} Reviews</span>
          </span>
        </div>

        <div class="product-price-block" aria-label="Price">
          <span class="product-current-price">${formatCurrency(item.current_price)}</span>
          <span class="original-price">${formatCurrency(item.original_price)}</span>
          <span class="discount-percentage">(${item.discount_percentage}% OFF)</span>
        </div>

        <div class="product-actions">
          <button class="btn-bag product-add-btn ${isAdded ? "is-added" : ""}" type="button" data-action="add" data-id="${item.id}" aria-pressed="${isAdded}">
            <span class="material-symbols-outlined" aria-hidden="true">${addIcon}</span>
            ${addText}
          </button>
          <button class="btn-buy product-buy-btn" type="button" data-action="buy" data-id="${item.id}">
            <span class="material-symbols-outlined" aria-hidden="true">bolt</span>
            Buy Now
          </button>
        </div>

        <div class="product-section-panel">
          <h2>Delivery Information</h2>
          <p><strong>Delivery by ${escapeHtml(deliveryDate)}</strong> with reliable doorstep shipping on eligible orders.</p>
        </div>

        <div class="product-section-panel">
          <h2>Return Policy</h2>
          <p><strong>${returnPeriod} days return available.</strong> Keep the product unused with tags for a smooth return pickup.</p>
        </div>

        <div class="product-section-panel">
          <h2>Available Offers</h2>
          <ul class="offer-list">
            <li>10% instant discount on select bank cards.</li>
            <li>Free shipping on prepaid orders above Rs 999.</li>
            <li>Extra savings may apply at checkout.</li>
          </ul>
        </div>

        <div class="product-section-panel">
          <h2>Product Description</h2>
          <p>${escapeHtml(description)}</p>
        </div>
      </div>
    </article>
  `;
}

function renderProductNotFound() {
  document.title = "Product Not Found | Fashion Store";
  selectors.productDetailContainer.innerHTML = `
    <div class="product-not-found">
      <div class="empty-bag-illustration">
        <span class="material-symbols-outlined" aria-hidden="true">inventory_2</span>
      </div>
      <h1>Product Not Found</h1>
      <p>The product you are looking for is unavailable or the link is incorrect.</p>
      <a class="btn-primary" href="${homePath}#products">Continue Shopping</a>
    </div>
  `;
}

function calculateSummary(cartItems = getCartItems()) {
  const totalItems = cartItems.length;
  const totalMRP = cartItems.reduce((sum, item) => sum + item.original_price, 0);
  const totalSellingPrice = cartItems.reduce((sum, item) => sum + item.current_price, 0);
  const discount = totalMRP - totalSellingPrice;
  const convenienceFee = totalItems ? CONVENIENCE_FEE : 0;
  const platformFee = totalItems ? PLATFORM_FEE : 0;
  const grandTotal = totalSellingPrice + convenienceFee + platformFee;

  return {
    totalItems,
    totalMRP,
    discount,
    convenienceFee,
    platformFee,
    grandTotal,
  };
}

function renderSummary(cartItems) {
  if (!selectors.bagSummaryContainer) return;

  const summary = calculateSummary(cartItems);
  const hasItems = summary.totalItems > 0;

  selectors.bagSummaryContainer.innerHTML = `
    <div class="price-header" id="summary-title">
      <span>Price Summary</span>
      <span class="price-count">${summary.totalItems} ${summary.totalItems === 1 ? "item" : "items"}</span>
    </div>
    <div class="price-item">
      <span class="price-item-tag">Total Items</span>
      <span class="price-item-value">${summary.totalItems}</span>
    </div>
    <div class="price-item">
      <span class="price-item-tag">Total MRP</span>
      <span class="price-item-value">${formatCurrency(summary.totalMRP)}</span>
    </div>
    <div class="price-item">
      <span class="price-item-tag">Discount</span>
      <span class="price-item-value priceDetail-base-discount">- ${formatCurrency(summary.discount)}</span>
    </div>
    <div class="price-item">
      <span class="price-item-tag">Convenience Fee</span>
      <span class="price-item-value">${formatCurrency(summary.convenienceFee)}</span>
    </div>
    <div class="price-item">
      <span class="price-item-tag">Platform Fee</span>
      <span class="price-item-value">${formatCurrency(summary.platformFee)}</span>
    </div>
    <div class="price-footer">
      <span>Grand Total</span>
      <span>${formatCurrency(summary.grandTotal)}</span>
    </div>
    ${hasItems ? `<div class="savings-note">You save ${formatCurrency(summary.discount)} on this order.</div>` : `<p class="summary-empty">Your summary will appear after you add products.</p>`}
  `;

  if (selectors.placeOrderButton) {
    selectors.placeOrderButton.disabled = !hasItems;
    selectors.placeOrderButton.setAttribute("aria-disabled", String(!hasItems));
  }
}

function updateBagCount() {
  selectors.bagCounters.forEach((counter) => {
    counter.textContent = state.bagItems.length;
    counter.setAttribute("aria-label", `${state.bagItems.length} items in bag`);
  });
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bagItems));
  } catch (error) {
    console.warn("Unable to save bag items to localStorage.", error);
  }
}

function loadFromLocalStorage() {
  try {
    const storedItems = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(storedItems) ? [...new Set(storedItems.map(String))] : [];
  } catch {
    return [];
  }
}

function searchItems(eventOrQuery = "") {
  const query = typeof eventOrQuery === "string" ? eventOrQuery : eventOrQuery.target.value;
  state.searchQuery = query.trim().toLowerCase();

  const filteredItems = products.filter((item) => {
    const company = item.company.toLowerCase();
    const name = item.item_name.toLowerCase();
    return company.includes(state.searchQuery) || name.includes(state.searchQuery);
  });

  if (selectors.itemsContainer) {
    displayItems(filteredItems);
  }

  return filteredItems;
}

function updateProductButtons() {
  document.querySelectorAll(".btn-bag[data-action='add']").forEach((button) => {
    const isAdded = state.bagItems.includes(button.dataset.id);
    button.classList.toggle("is-added", isAdded);
    button.setAttribute("aria-pressed", String(isAdded));
    button.innerHTML = `
      <span class="material-symbols-outlined" aria-hidden="true">${isAdded ? "check_circle" : "shopping_bag"}</span>
      ${isAdded ? "Added to Bag" : "Add to Bag"}
    `;
  });
}

function getCartItems() {
  return state.bagItems
    .map((id) => products.find((item) => item.id === id))
    .filter(Boolean);
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatCount(value) {
  const count = Number(value || 0);
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}k`;
  }
  return String(count);
}

function formatRating(value) {
  return Number(value || 0).toFixed(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
