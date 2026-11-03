"use strict";

const API_URL = "/api/products";
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

let products = [];
let selectedCategory = "all";
let currentModalProduct = null;
let searchTimer;
let latestRequest = 0;
let currentUser = null;
let csrfToken = null;

const authNav = document.getElementById("auth-nav");
const sellFormMessage = document.getElementById("auth-required-message");
const sellerInput = document.getElementById("item-seller");
const productsGrid = document.getElementById("products");
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");
const productsMessage = document.getElementById("products-message");
const searchInput = document.getElementById("search");
const searchButton = document.getElementById("search-button");
const clearSearchButton = document.getElementById("clear-search-button");
const categoryButtons = document.querySelectorAll(".category-button");
const clearFiltersButton = document.getElementById("clear-filters");
const sellForm = document.getElementById("sell-form");

const contactModal = document.getElementById("contact-modal");
const closeModalButton = document.getElementById("close-modal");
const modalTitle = document.getElementById("modal-title");
const modalPrice = document.getElementById("modal-price");
const sellerAvatar = document.getElementById("seller-avatar");
const sellerName = document.getElementById("seller-name");
const modalDescription = document.getElementById("modal-description");
const meetupLocation = document.getElementById("meetup-location");
const emailAction = document.getElementById("email-action");
const emailLabel = document.getElementById("email-label");
const copyContactButton = document.getElementById("copy-contact");
const copyLabel = document.getElementById("copy-label");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-text");

function showToast(message, isError = false) {
  toastMessage.textContent = message;
  toast.querySelector(".material-symbols-outlined").textContent = isError
    ? "error"
    : "check_circle";
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 3200);
}

function showProductsMessage(message) {
  productsMessage.textContent = message;
  productsMessage.classList.remove("hidden");
}

function hideProductsMessage() {
  productsMessage.textContent = "";
  productsMessage.classList.add("hidden");
}

function createAuthLink(label, href, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = href;
  link.textContent = label;
  return link;
}

function updateAuthenticationUI(user) {
  currentUser = user;
  authNav.replaceChildren();

  if (!user) {
    authNav.append(
      createAuthLink("Login", "/login", "auth-nav__link"),
      createAuthLink("Sign Up", "/signup", "auth-nav__signup"),
    );
    sellerInput.value = "";
    sellerInput.readOnly = false;
    sellForm.hidden = true;
    sellFormMessage.classList.remove("hidden");
    sellFormMessage.hidden = false;
    return;
  }

  const account = document.createElement("div");
  account.className = "auth-nav__account";
  const name = document.createElement("span");
  name.className = "auth-nav__name";
  name.textContent = user.name;
  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "auth-nav__logout";
  logoutButton.textContent = "Log Out";
  logoutButton.addEventListener("click", logout);
  account.append(name, logoutButton);
  authNav.append(account);

  sellerInput.value = user.name;
  sellerInput.readOnly = true;
  document.getElementById("item-contact").value = user.email;
  sellForm.hidden = false;
  sellFormMessage.classList.add("hidden");
  sellFormMessage.hidden = true;
}

async function checkAuthentication() {
  try {
    const response = await fetch("/api/auth/me");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not check your account.");

    csrfToken = result.csrfToken;
    updateAuthenticationUI(result.authenticated ? result.user : null);
  } catch (error) {
    updateAuthenticationUI(null);
    showProductsMessage(`Could not check your login session. ${error.message}`);
  }
}

async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfToken || "" },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not log out.");

    csrfToken = null;
    updateAuthenticationUI(null);
    showToast(result.message);
  } catch (error) {
    showProductsMessage(`Could not log out. ${error.message}`);
  }
}

function getConditionBadge(condition) {
  const badge = document.createElement("span");
  badge.className = "product-card__condition";

  switch (condition) {
    case "Brand New":
      badge.classList.add("product-card__condition--new");
      break;
    case "Like New":
      badge.classList.add("product-card__condition--like-new");
      break;
    case "Good":
      badge.classList.add("product-card__condition--good");
      break;
    default:
      badge.classList.add("product-card__condition--default");
  }

  badge.textContent = condition;
  return badge;
}

function createIcon(name) {
  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = name;
  return icon;
}

function formatPrice(price) {
  return `₹${Number(price).toFixed(2)}`;
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const imageArea = document.createElement("div");
  imageArea.className = "product-card__image";

  if (product.image) {
    const image = document.createElement("img");
    image.className = "product-card__photo";
    image.alt = product.title;
    image.src = product.image;
    imageArea.append(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "product-card__placeholder";
    placeholder.append(createIcon("inventory_2"));
    placeholder.setAttribute("aria-label", "No product photo provided");
    imageArea.append(placeholder);
  }

  const categoryPosition = document.createElement("div");
  categoryPosition.className = "product-card__category-position";
  const categoryBadge = document.createElement("span");
  categoryBadge.className = "product-card__category";
  categoryBadge.textContent = product.category;
  categoryPosition.append(categoryBadge);

  const conditionPosition = document.createElement("div");
  conditionPosition.className = "product-card__condition-position";
  conditionPosition.append(getConditionBadge(product.condition));
  imageArea.append(categoryPosition, conditionPosition);

  const cardBody = document.createElement("div");
  cardBody.className = "product-card__body";
  const details = document.createElement("div");
  const summary = document.createElement("div");
  summary.className = "product-card__summary";

  const price = document.createElement("span");
  price.className = "product-card__price";
  price.textContent = formatPrice(product.price);

  const location = document.createElement("span");
  location.className = "product-card__location";
  location.append(createIcon("location_on"), document.createTextNode(product.location));
  summary.append(price, location);

  const title = document.createElement("h3");
  title.className = "product-card__title";
  title.textContent = product.title;

  const description = document.createElement("p");
  description.className = "product-card__description";
  description.textContent = product.description;
  details.append(summary, title, description);

  const sellerArea = document.createElement("div");
  sellerArea.className = "product-card__seller-area";
  const seller = document.createElement("div");
  seller.className = "product-card__seller";
  seller.append(createIcon("account_circle"));
  const sellerText = document.createElement("span");
  sellerText.textContent = product.seller;
  seller.append(sellerText);

  const contactButton = document.createElement("button");
  contactButton.className = "product-card__contact";
  contactButton.type = "button";
  contactButton.dataset.productId = product.id;
  contactButton.append(createIcon("chat"), document.createTextNode("Contact Seller"));
  sellerArea.append(seller, contactButton);

  cardBody.append(details, sellerArea);
  card.append(imageArea, cardBody);
  return card;
}

function renderProducts() {
  productsGrid.replaceChildren(...products.map(createProductCard));

  if (products.length === 0) {
    emptyState.classList.remove("hidden");
    emptyState.classList.add("visible");
  } else {
    emptyState.classList.add("hidden");
    emptyState.classList.remove("visible");
  }
}

function buildProductsUrl() {
  const query = new URLSearchParams();
  const search = searchInput.value.trim();

  if (selectedCategory !== "all") query.set("category", selectedCategory);
  if (search) query.set("search", search);

  const queryString = query.toString();
  return queryString ? `${API_URL}?${queryString}` : API_URL;
}

async function loadProducts() {
  const requestNumber = ++latestRequest;
  loadingState.classList.remove("hidden");
  emptyState.classList.add("hidden");
  productsGrid.classList.add("hidden");
  hideProductsMessage();

  try {
    const response = await fetch(buildProductsUrl());
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Could not load marketplace listings.");
    }
    if (!Array.isArray(result)) {
      throw new Error("The server returned an unexpected product list.");
    }

    if (requestNumber !== latestRequest) return;
    products = result;
    renderProducts();
  } catch (error) {
    if (requestNumber !== latestRequest) return;
    products = [];
    productsGrid.replaceChildren();
    emptyState.classList.add("hidden");
    emptyState.classList.remove("visible");
    showProductsMessage(
      `Could not load listings. ${error.message} Check that the Campus Cart server is running and try again.`,
    );
  } finally {
    if (requestNumber === latestRequest) {
      loadingState.classList.add("hidden");
      productsGrid.classList.remove("hidden");
    }
  }
}

function scheduleProductLoad() {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadProducts, 300);
}

function resetAllFilters() {
  window.clearTimeout(searchTimer);
  selectedCategory = "all";
  searchInput.value = "";
  clearSearchButton.classList.add("hidden");
  categoryButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.category === "all");
  });
  loadProducts();
}

function openContactModal(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  currentModalProduct = product;
  modalTitle.textContent = product.title;
  modalPrice.textContent = formatPrice(product.price);
  sellerAvatar.textContent = product.seller.charAt(0).toUpperCase();
  sellerName.textContent = product.seller;
  modalDescription.textContent = product.description;
  meetupLocation.textContent = product.location;
  copyLabel.textContent = "Copy Contact Info";

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(product.contact)) {
    const subject = encodeURIComponent(`Campus Cart inquiry: ${product.title}`);
    emailAction.href = `mailto:${encodeURIComponent(product.contact)}?subject=${subject}`;
    emailLabel.textContent = `Email ${product.contact}`;
  } else {
    const phoneNumber = product.contact.replace(/[^\d+]/g, "");
    emailAction.href = `tel:${phoneNumber}`;
    emailLabel.textContent = `Call ${product.contact}`;
  }

  contactModal.classList.remove("hidden");
  contactModal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeContactModal() {
  contactModal.classList.remove("open");
  contactModal.classList.add("hidden");
  document.body.style.overflow = "";
  currentModalProduct = null;
}

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    categoryButtons.forEach((categoryButton) => categoryButton.classList.remove("active"));
    button.classList.add("active");
    selectedCategory = button.dataset.category;
    loadProducts();
  });
});

searchInput.addEventListener("input", () => {
  clearSearchButton.classList.toggle("hidden", searchInput.value.length === 0);
  scheduleProductLoad();
});

clearSearchButton.addEventListener("click", () => {
  searchInput.value = "";
  clearSearchButton.classList.add("hidden");
  loadProducts();
  searchInput.focus();
});

searchButton.addEventListener("click", () => {
  window.clearTimeout(searchTimer);
  loadProducts();
  productsGrid.scrollIntoView({ behavior: "smooth", block: "start" });
});

clearFiltersButton.addEventListener("click", resetAllFilters);

productsGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".product-card__contact");
  if (button) openContactModal(button.dataset.productId);
});

closeModalButton.addEventListener("click", closeContactModal);
contactModal.addEventListener("click", (event) => {
  if (event.target === contactModal) closeContactModal();
});

copyContactButton.addEventListener("click", async () => {
  if (!currentModalProduct) return;

  const product = currentModalProduct;
  const text = `Item: ${product.title} (${formatPrice(product.price)}) | Seller: ${product.seller} | Contact: ${product.contact} | Meetup: ${product.location}`;
  try {
    await navigator.clipboard.writeText(text);
    copyLabel.textContent = "Copied to Clipboard!";
    showToast("Seller contact copied!");
    window.setTimeout(() => {
      if (currentModalProduct === product) copyLabel.textContent = "Copy Contact Info";
    }, 2000);
  } catch {
    showToast("Clipboard access is unavailable. Select and copy the contact information.");
  }
});

sellForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideProductsMessage();

  const submitButton = sellForm.querySelector('button[type="submit"]');
  const imageFile = document.getElementById("item-image").files[0];
  if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
    showProductsMessage("Please choose an image smaller than 2 MB.");
    showToast("The selected image is larger than 2 MB.", true);
    return;
  }

  submitButton.disabled = true;
  try {
    let image = "";
    if (imageFile) {
      image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("The selected photo could not be read."));
        reader.readAsDataURL(imageFile);
      });
    }

    const newProduct = {
      title: document.getElementById("item-title").value.trim(),
      category: document.getElementById("item-category").value,
      price: Number(document.getElementById("item-price").value),
      condition: document.getElementById("item-condition").value,
      location: document.getElementById("item-meeting-location").value.trim(),
      contact: document.getElementById("item-contact").value.trim(),
      description: document.getElementById("item-description").value.trim(),
      image,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken || "",
      },
      body: JSON.stringify(newProduct),
    });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        updateAuthenticationUI(null);
      }
      throw new Error(result.error || "The listing could not be posted.");
    }

    sellForm.reset();
    if (currentUser) {
      sellerInput.value = currentUser.name;
      document.getElementById("item-contact").value = currentUser.email;
    }
    showToast("Listing posted successfully to Campus Cart!");
    resetAllFilters();
    document.getElementById("products").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  } catch (error) {
    showProductsMessage(`Your listing was not posted. ${error.message}`);
    showToast(`Could not post listing: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !contactModal.classList.contains("hidden")) {
    closeContactModal();
  }
});

checkAuthentication();
loadProducts();
