const catalogApi = window.ComintCatalogData || null;
const companyApi = window.ComintCompanyData || null;

const fallbackSearchCopy = {
  визитки: [
    "Визитки",
    "Стильные визитки, которые работают на ваш имидж.",
    "Подберем бумагу, тираж и отделку под ваш сценарий.",
  ],
  листовки: [
    "Листовки",
    "Яркая печать для акций, презентаций и ежедневных задач бизнеса.",
    "Подготовим материалы и макет под ваши сроки.",
  ],
  сувениры: [
    "Сувениры",
    "Брендированная продукция для подарков, промо и корпоративных наборов.",
    "Подберем основу, нанесение и тираж под ваш формат.",
  ],
};

const sortLabels = catalogApi?.sortLabels || {
  popular: "Сначала основные",
  name: "По названию",
  section: "По разделу",
};

const headerNavGroups = {
  print: (service) => service.catalogKind === "print",
  souvenirs: (service) => service.catalogKind === "souvenirs",
  calendar: (service) => service.section === "Печать и изготовление календарей",
  wide: (service) => service.section === "Широкоформатная печать",
};

function normalize(value) {
  return value.trim().toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCatalogItemLink(service) {
  const params = new URLSearchParams({
    title: service.title,
    section: service.section,
    kind: service.catalogKind,
    slug: service.slug,
  });

  return `catalog-item.html?${params.toString()}`;
}

function findCatalogService(query) {
  if (!catalogApi) {
    return null;
  }

  return catalogApi.search(query);
}

function getHeaderMenuServices(group) {
  if (!catalogApi || !headerNavGroups[group]) {
    return [];
  }

  return catalogApi.services
    .filter(headerNavGroups[group])
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title, "ru", { sensitivity: "base" }));
}

function buildHeaderServiceLink(service) {
  const link = document.createElement("a");
  link.href = buildCatalogItemLink(service);
  link.textContent = service.title;
  return link;
}

function buildHeaderMenuFragment(services) {
  const fragment = document.createDocumentFragment();
  services.forEach((service) => {
    fragment.append(buildHeaderServiceLink(service));
  });
  return fragment;
}

function initSiteHeaderMenu() {
  const headers = [...document.querySelectorAll(".site-header")];

  headers.forEach((header) => {
    const toggle = header.querySelector("[data-menu-toggle]");
    const menu = header.querySelector("[data-site-menu]");
    const dropdowns = [...header.querySelectorAll("[data-nav-group]")];
    const mobileSubmenu = header.querySelector("[data-mobile-submenu]");
    const mobileSubmenuBack = header.querySelector("[data-mobile-submenu-back]");
    const mobileSubmenuTitle = header.querySelector("[data-mobile-submenu-title]");
    const mobileSubmenuLinks = header.querySelector("[data-mobile-submenu-links]");
    const menuGroups = new Map();
    let wasMobileViewport = window.innerWidth <= 760;

    if (!toggle || !menu) {
      return;
    }

    dropdowns.forEach((dropdown) => {
      const group = dropdown.dataset.navGroup || "";
      const trigger = dropdown.querySelector("[data-nav-trigger]");
      const popup = dropdown.querySelector(".nav-dropdown-menu");
      const services = getHeaderMenuServices(group);

      if (!trigger || !popup || !services.length) {
        return;
      }

      const triggerHref = trigger.getAttribute("href") || "";

      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      popup.replaceChildren(buildHeaderMenuFragment(services));
      menuGroups.set(group, {
        group,
        services,
        title: trigger.textContent.trim(),
        triggerHref,
      });
    });

    const links = [...header.querySelectorAll(".main-nav a, .quick-order")];

    function closeSubmenu() {
      header.classList.remove("is-submenu-open");

      if (mobileSubmenu) {
        mobileSubmenu.hidden = true;
      }

      if (mobileSubmenuTitle) {
        mobileSubmenuTitle.textContent = "";
      }

      if (mobileSubmenuLinks) {
        mobileSubmenuLinks.replaceChildren();
      }
    }

    function openSubmenu(group) {
      const menuGroup = menuGroups.get(group);

      if (!menuGroup || !mobileSubmenu || !mobileSubmenuTitle || !mobileSubmenuLinks) {
        return;
      }

      const fragment = document.createDocumentFragment();
      const hasOverviewLink =
        menuGroup.triggerHref &&
        !menuGroup.services.some((service) => buildCatalogItemLink(service) === menuGroup.triggerHref);

      if (hasOverviewLink) {
        const overviewLink = document.createElement("a");
        overviewLink.href = menuGroup.triggerHref;
        overviewLink.textContent = `Перейти в раздел "${menuGroup.title}"`;
        overviewLink.className = "mobile-submenu-overview";
        fragment.append(overviewLink);
      }

      fragment.append(buildHeaderMenuFragment(menuGroup.services));
      mobileSubmenuTitle.textContent = menuGroup.title;
      mobileSubmenuLinks.replaceChildren(fragment);
      mobileSubmenu.hidden = false;
      mobileSubmenuLinks.scrollTop = 0;

      requestAnimationFrame(() => {
        header.classList.add("is-submenu-open");
      });
    }

    function closeDropdowns() {
      dropdowns.forEach((dropdown) => {
        dropdown.classList.remove("is-open");
        dropdown.querySelector("[data-nav-trigger]")?.setAttribute("aria-expanded", "false");
      });
    }

    function closeMenu() {
      header.classList.remove("is-menu-open");
      toggle.setAttribute("aria-expanded", "false");
      closeSubmenu();
      closeDropdowns();
    }

    function openMenu() {
      header.classList.add("is-menu-open");
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", () => {
      if (header.classList.contains("is-menu-open")) {
        closeMenu();
        return;
      }

      openMenu();
    });

    links.forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 760 && link.hasAttribute("data-nav-trigger")) {
          return;
        }

        closeMenu();
      });
    });

    dropdowns.forEach((dropdown) => {
      const trigger = dropdown.querySelector("[data-nav-trigger]");
      const group = dropdown.dataset.navGroup || "";

      trigger?.addEventListener("click", (event) => {
        if (window.innerWidth > 760) {
          return;
        }

        event.preventDefault();
        closeDropdowns();
        openSubmenu(group);
        trigger.setAttribute("aria-expanded", "true");
      });
    });

    mobileSubmenuBack?.addEventListener("click", () => {
      closeSubmenu();
      closeDropdowns();
    });

    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    window.addEventListener("resize", () => {
      const isMobileViewport = window.innerWidth <= 760;

      if (isMobileViewport !== wasMobileViewport) {
        closeMenu();
      }

      wasMobileViewport = isMobileViewport;
    });
  });
}

function initHomeSearch() {
  const input = document.querySelector("#product-search");
  const clearButton = document.querySelector(".clear-search");
  const resultCard = document.querySelector(".result-card");
  const resultTitle = document.querySelector(".result-copy h2");
  const resultText = document.querySelectorAll(".result-copy p");
  const resultImage = document.querySelector(".result-image");
  const resultButton = document.querySelector(".result-button");

  function updateResult() {
    if (!input || !resultCard || !resultTitle || resultText.length < 2 || !resultButton) {
      return;
    }

    const value = normalize(input.value);
    resultCard.hidden = value.length === 0;

    if (!value) {
      return;
    }

    const matchedService = findCatalogService(value);

    if (matchedService) {
      resultTitle.textContent = matchedService.title;
      resultText[0].textContent = matchedService.section;
      resultText[1].textContent = matchedService.lead;
      resultButton.href = buildCatalogItemLink(matchedService);
      resultButton.textContent = "Открыть карточку";

      if (resultImage) {
        resultImage.src = matchedService.image;
        resultImage.alt = matchedService.title;
      }

      return;
    }

    const key = Object.keys(fallbackSearchCopy).find((item) => value.includes(item));
    const copy = fallbackSearchCopy[key] || [
      input.value.trim(),
      "Подготовим услугу под ваши задачи и сроки.",
      "Поможем с материалами, дизайном, тиражом и финальной отделкой.",
    ];

    resultTitle.textContent = copy[0];
    resultText[0].textContent = copy[1];
    resultText[1].textContent = copy[2];
    resultButton.href = "#contacts";
    resultButton.textContent = "Оставить заявку";
  }

  if (clearButton && input) {
    clearButton.addEventListener("click", () => {
      input.value = "";
      input.focus();
      updateResult();
    });

    input.addEventListener("input", updateResult);
    updateResult();
  }
}

function initOrderModal() {
  const orderModalTriggers = [...document.querySelectorAll("[data-open-order-modal]")];
  const orderModal = document.querySelector("#order-modal");
  const orderModalClose = orderModal?.querySelector(".modal-close");
  const orderForm = document.querySelector(".order-form");
  const modalKicker = orderModal?.querySelector(".modal-kicker");
  const modalTitle = orderModal?.querySelector("#order-modal-title");
  const modalDescription = orderModal?.querySelector("[data-modal-description]");
  const modalSummary = orderModal?.querySelector("[data-modal-order-summary]");
  const modalSummaryMedia = orderModal?.querySelector("[data-modal-order-media]");
  const modalSummaryImage = orderModal?.querySelector("[data-modal-order-image]");
  const modalSummaryTitle = orderModal?.querySelector("[data-modal-order-title]");
  const modalSummaryOptions = orderModal?.querySelector("[data-modal-order-options]");
  const modalSummaryUnit = orderModal?.querySelector("[data-modal-order-unit]");
  const modalSummaryTotal = orderModal?.querySelector("[data-modal-order-total]");

  if (!orderModal) {
    return;
  }

  const defaultCopy = {
    kicker: "Быстрый заказ",
    title: "Расскажите, что нужно напечатать",
    description:
      "Оставьте контакты и короткое описание задачи. Мы свяжемся с вами, уточним детали и предложим подходящий формат.",
  };

  function resetModalContent() {
    if (modalKicker) {
      modalKicker.textContent = defaultCopy.kicker;
    }

    if (modalTitle) {
      modalTitle.textContent = defaultCopy.title;
    }

    if (modalDescription) {
      modalDescription.textContent = defaultCopy.description;
    }

    if (modalSummary) {
      modalSummary.hidden = true;
    }
  }

  function applyProductModalContent(trigger) {
    if (!trigger) {
      return;
    }

    if (modalKicker) {
      modalKicker.textContent = "Заявка по услуге";
    }

    if (modalTitle) {
      modalTitle.textContent = "Проверьте состав заявки";
    }

    if (modalDescription) {
      modalDescription.textContent =
        "Мы уже подставили выбранную услугу и параметры. Оставьте контакты, и мы уточним материалы, сроки и финальный расчет.";
    }

    if (modalSummary) {
      modalSummary.hidden = false;
    }

    if (modalSummaryMedia && trigger.dataset.orderImageFrame) {
      modalSummaryMedia.className = `modal-order-media ${trigger.dataset.orderImageFrame} ${trigger.dataset.orderColorClass || ""}`.trim();
    }

    if (modalSummaryImage && trigger.dataset.orderImage) {
      modalSummaryImage.src = trigger.dataset.orderImage;
      modalSummaryImage.alt = trigger.dataset.orderTitle || "Услуга";
    }

    if (modalSummaryTitle) {
      modalSummaryTitle.textContent = trigger.dataset.orderTitle || "Услуга";
    }

    if (modalSummaryOptions) {
      modalSummaryOptions.textContent = trigger.dataset.orderOptions || "";
    }

    if (modalSummaryUnit) {
      modalSummaryUnit.textContent = trigger.dataset.orderUnit || "";
    }

    if (modalSummaryTotal) {
      modalSummaryTotal.textContent = trigger.dataset.orderTotal || "";
    }
  }

  function openOrderModal(trigger) {
    resetModalContent();

    if (trigger?.dataset.orderMode === "product") {
      applyProductModalContent(trigger);
    }

    orderModal.hidden = false;
    document.body.classList.add("modal-open");
    orderModal.querySelector("input, textarea, button")?.focus();
  }

  function closeOrderModal() {
    orderModal.hidden = true;
    document.body.classList.remove("modal-open");
    resetModalContent();
  }

  orderModalTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openOrderModal(trigger);
    });
  });

  orderModalClose?.addEventListener("click", closeOrderModal);

  orderModal.addEventListener("click", (event) => {
    if (event.target === orderModal) {
      closeOrderModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !orderModal.hidden) {
      closeOrderModal();
    }
  });

  orderForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    closeOrderModal();
    orderForm.reset();
    resetModalContent();
  });

  resetModalContent();
}

function buildPagination(currentPage, totalPages) {
  if (totalPages <= 1) {
    return [1];
  }

  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "...", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage, "...", totalPages];
}

function initCatalogPage() {
  const page = document.querySelector(".catalog-page[data-catalog-kind]");

  if (!page || !catalogApi) {
    return;
  }

  const kind = page.dataset.catalogKind;
  const catalog = catalogApi.getCatalog(kind);
  const categoryList = document.querySelector("[data-category-list]");
  const searchInput = document.querySelector("[data-catalog-search-input]");
  const searchClearButton = document.querySelector("[data-catalog-search-clear]");
  const grid = document.querySelector("[data-catalog-grid]");
  const emptyState = document.querySelector("[data-catalog-empty]");
  const pagination = document.querySelector("[data-catalog-pagination]");
  const viewButtons = [...document.querySelectorAll("[data-view]")];
  const heroTitle = document.querySelector("[data-catalog-title]");
  const heroDescription = document.querySelector("[data-catalog-description]");
  const breadcrumbCurrent = document.querySelector("[data-catalog-breadcrumb-current]");

  if (
    !catalog ||
    !categoryList ||
    !searchInput ||
    !searchClearButton ||
    !grid ||
    !emptyState ||
    !pagination
  ) {
    return;
  }

  document.title = `COMINT - ${catalog.label}`;

  if (heroTitle) {
    heroTitle.textContent = catalog.heroTitle;
  }

  if (heroDescription) {
    heroDescription.innerHTML = escapeHtml(catalog.heroDescription).replace(/\n/g, "<br />");
  }

  if (breadcrumbCurrent) {
    breadcrumbCurrent.textContent = catalog.label;
  }

  searchInput.placeholder = catalog.searchPlaceholder;
  searchInput.setAttribute("aria-label", catalog.searchPlaceholder);

  const state = {
    category: catalog.defaultCategory || "all",
    query: "",
    page: 1,
    sort: "popular",
    view: "grid",
  };

  const itemsPerPage = 8;

  function renderCategories() {
    categoryList.innerHTML = catalog.categories
      .map((category) => {
        const isActive = category.id === state.category;
        return `
          <button
            class="category-item ${isActive ? "is-active" : ""}"
            type="button"
            data-category="${escapeHtml(category.id)}"
            aria-pressed="${String(isActive)}"
          >
            <span>${escapeHtml(category.label)}</span>
            <strong>${category.count}</strong>
          </button>
        `;
      })
      .join("");
  }

  function getVisibleProducts() {
    const query = normalize(state.query);
    const baseProducts =
      state.category === "all"
        ? catalog.items
        : catalog.items.filter((product) => (product.categoryId || product.sectionId) === state.category);

    let products = baseProducts;

    if (query && catalogApi.searchAll) {
      const rankedIds = new Map(
        catalogApi
          .searchAll(query, {
            kind,
            limit: catalog.items.length,
            minScore: 10,
          })
          .map((product, index) => [product.id, index]),
      );

      products = baseProducts
        .filter((product) => rankedIds.has(product.id))
        .sort((left, right) => rankedIds.get(left.id) - rankedIds.get(right.id));
    } else if (query) {
      products = baseProducts.filter((product) => {
        const haystack = normalize([product.title, product.section, product.categoryLabel, product.label].join(" "));
        return haystack.includes(query);
      });
    }

    if (query) {
      return products;
    }

    return products.sort((left, right) => {
      if (state.sort === "name") {
        return left.title.localeCompare(right.title, "ru");
      }

      if (state.sort === "section") {
        return left.section.localeCompare(right.section, "ru") || left.title.localeCompare(right.title, "ru");
      }

      return right.popularity - left.popularity;
    });
  }

  function renderProducts(products) {
    grid.classList.toggle("is-list-view", state.view === "list");

    if (!products.length) {
      grid.innerHTML = "";
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;

    grid.innerHTML = products
      .map((product) => {
        return `
          <article class="product-card">
            <a class="product-visual" href="${buildCatalogItemLink(product)}" aria-label="Открыть ${escapeHtml(product.title)}">
              <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" />
            </a>
            <div class="product-info">
              <h3>${escapeHtml(product.title)}</h3>
              <p>${escapeHtml(product.section)}</p>
              <div class="product-meta">
                <strong>${escapeHtml(product.estimateLabel)}</strong>
                <a class="product-open-link" href="${buildCatalogItemLink(product)}" aria-label="Открыть карточку">
                  Открыть
                </a>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderPagination(totalPages) {
    const tokens = buildPagination(state.page, totalPages);
    const prevDisabled = state.page <= 1;
    const nextDisabled = state.page >= totalPages;

    pagination.innerHTML = `
      <button type="button" aria-label="Предыдущая страница" data-page-shift="-1" ${prevDisabled ? "disabled" : ""}>
        ←
      </button>
      ${tokens
        .map((token) => {
          if (token === "...") {
            return "<span>…</span>";
          }

          return `
            <button
              type="button"
              class="${token === state.page ? "is-active" : ""}"
              data-page="${token}"
              aria-label="Страница ${token}"
              ${token === state.page ? 'aria-current="page"' : ""}
            >
              ${token}
            </button>
          `;
        })
        .join("")}
      <button type="button" aria-label="Следующая страница" data-page-shift="1" ${nextDisabled ? "disabled" : ""}>
        →
      </button>
    `;
  }

  function renderControls() {
    renderCategories();
    searchClearButton.hidden = state.query.length === 0;

    viewButtons.forEach((button) => {
      const isActive = button.dataset.view === state.view;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function renderCatalog() {
    const visibleProducts = getVisibleProducts();
    const totalPages = Math.max(1, Math.ceil(visibleProducts.length / itemsPerPage));

    if (state.page > totalPages) {
      state.page = 1;
    }

    const from = (state.page - 1) * itemsPerPage;
    const currentProducts = visibleProducts.slice(from, from + itemsPerPage);

    renderControls();
    renderProducts(currentProducts);
    renderPagination(totalPages);
  }

  categoryList.addEventListener("click", (event) => {
    const target = event.target.closest("[data-category]");
    if (!target) {
      return;
    }

    state.category = target.dataset.category || "all";
    state.page = 1;
    renderCatalog();
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value;
    state.page = 1;
    renderCatalog();
  });

  searchClearButton.addEventListener("click", () => {
    state.query = "";
    searchInput.value = "";
    searchInput.focus();
    renderCatalog();
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view || "grid";
      renderCatalog();
    });
  });

  pagination.addEventListener("click", (event) => {
    const target = event.target.closest("[data-page], [data-page-shift]");

    if (!target || target.hasAttribute("disabled")) {
      return;
    }

    if (target.dataset.page) {
      state.page = Number(target.dataset.page);
      renderCatalog();
      return;
    }

    state.page += Number(target.dataset.pageShift || 0);
    renderCatalog();
  });

  renderCatalog();
}

const productPagePresets = {
  pen: {
    headings: {
      colors: "Вариант изделия",
      methods: "Нанесение",
      quantity: "Тираж",
      quantityUnit: "шт",
      tiers: "Рекомендуемый тираж",
    },
    colors: [
      { id: "black", label: "Черный", className: "is-black", swatch: true },
      { id: "blue", label: "Синий", className: "is-blue", swatch: true },
      { id: "silver", label: "Серебристый", className: "is-silver", swatch: true },
    ],
    methods: [
      { id: "print", label: "Печать", icon: "print" },
      { id: "engraving", label: "Гравировка", icon: "engraving" },
    ],
    tiers: [
      { qty: 50, note: "минимальный тираж" },
      { qty: 100, note: "для промо-наборов" },
      { qty: 300, note: "для корпоративной раздачи" },
      { qty: 500, note: "стандартный тираж" },
      { qty: 1000, note: "для масштабных кампаний" },
    ],
    quantityStep: 50,
    specs: [
      ["Основа", "Сувенирная продукция"],
      ["Подходит для", "ручек, брелоков, зажигалок и небольших сувениров"],
      ["Подготовка", "подбор модели и проверка макета перед нанесением"],
      ["Срок запуска", "после согласования тиража и нанесения"],
    ],
    gallery: [
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-hero", label: "Основной вид" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-logo", label: "Нанесение" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-tip", label: "Деталь" },
    ],
    examples: [
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-logo", tone: "" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-box", tone: "is-dark" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-detail", tone: "is-metal" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-angle", tone: "is-dark" },
    ],
  },
  mug: {
    headings: {
      colors: "Вариант изделия",
      methods: "Нанесение",
      quantity: "Тираж",
      quantityUnit: "шт",
      tiers: "Рекомендуемый тираж",
    },
    colors: [
      { id: "black", label: "Темный", className: "is-black", swatch: true },
      { id: "blue", label: "Синий", className: "is-blue", swatch: true },
      { id: "silver", label: "Светлый", className: "is-silver", swatch: true },
    ],
    methods: [
      { id: "print", label: "Печать", icon: "print" },
      { id: "engraving", label: "Деколь", icon: "engraving" },
    ],
    tiers: [
      { qty: 24, note: "малый тираж" },
      { qty: 50, note: "подарочные наборы" },
      { qty: 100, note: "корпоративный заказ" },
      { qty: 300, note: "массовое брендирование" },
      { qty: 500, note: "для акций и мероприятий" },
    ],
    quantityStep: 25,
    specs: [
      ["Основа", "Сувенирная продукция"],
      ["Подходит для", "кружек, тарелок и аксессуаров для кухни и офиса"],
      ["Подготовка", "проверка цвета и зоны нанесения перед запуском"],
      ["Срок запуска", "после подтверждения тиража и макета"],
    ],
    gallery: [
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-front", label: "Основной вид" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-angle", label: "Под углом" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-detail", label: "Деталь" },
    ],
    examples: [
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-front", tone: "" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-angle", tone: "is-dark" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-detail", tone: "is-metal" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-angle", tone: "" },
    ],
  },
  thermos: {
    headings: {
      colors: "Вариант изделия",
      methods: "Нанесение",
      quantity: "Тираж",
      quantityUnit: "шт",
      tiers: "Рекомендуемый тираж",
    },
    colors: [
      { id: "black", label: "Темный", className: "is-black", swatch: true },
      { id: "blue", label: "Синий", className: "is-blue", swatch: true },
      { id: "silver", label: "Светлый", className: "is-silver", swatch: true },
    ],
    methods: [
      { id: "print", label: "Печать", icon: "print" },
      { id: "engraving", label: "Гравировка", icon: "engraving" },
    ],
    tiers: [
      { qty: 25, note: "малый тираж" },
      { qty: 50, note: "welcome-pack наборы" },
      { qty: 100, note: "корпоративные подарки" },
      { qty: 300, note: "массовый заказ" },
      { qty: 500, note: "промо-кампания" },
    ],
    quantityStep: 25,
    specs: [
      ["Основа", "Сувенирная продукция"],
      ["Подходит для", "термосов, флешек, ковриков для мыши и функциональных сувениров"],
      ["Подготовка", "подбор модели и проверка логотипа под нанесение"],
      ["Срок запуска", "после согласования тиража и комплектации"],
    ],
    gallery: [
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-full", label: "Основной вид" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-angle", label: "Под углом" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-detail", label: "Деталь" },
    ],
    examples: [
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-angle", tone: "" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-full", tone: "is-dark" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-detail", tone: "is-metal" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-angle", tone: "is-dark" },
    ],
  },
  bag: {
    headings: {
      colors: "Вариант изделия",
      methods: "Нанесение",
      quantity: "Тираж",
      quantityUnit: "шт",
      tiers: "Рекомендуемый тираж",
    },
    colors: [
      { id: "black", label: "Темный", className: "is-black", swatch: true },
      { id: "blue", label: "Цветной", className: "is-blue", swatch: true },
      { id: "silver", label: "Светлый", className: "is-silver", swatch: true },
    ],
    methods: [
      { id: "print", label: "Печать", icon: "print" },
      { id: "engraving", label: "Тиснение / шеврон", icon: "engraving" },
    ],
    tiers: [
      { qty: 25, note: "пробный тираж" },
      { qty: 50, note: "подарочная упаковка" },
      { qty: 100, note: "корпоративный заказ" },
      { qty: 300, note: "для мероприятий" },
      { qty: 500, note: "для постоянной выдачи" },
    ],
    quantityStep: 25,
    specs: [
      ["Основа", "Сувенирная продукция"],
      ["Подходит для", "пакетов, коробок, сумок, текстиля, флажков и подарочных наборов"],
      ["Подготовка", "подбор материала и проверка зоны брендирования"],
      ["Срок запуска", "после утверждения формата и тиража"],
    ],
    gallery: [
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-front", label: "Основной вид" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-angle", label: "Под углом" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-detail", label: "Деталь" },
    ],
    examples: [
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-front", tone: "" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-angle", tone: "is-dark" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-detail", tone: "is-metal" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-angle", tone: "" },
    ],
  },
  "print-flat": {
    headings: {
      colors: "Основа",
      methods: "Технология",
      quantity: "Тираж",
      quantityUnit: "шт",
      tiers: "Рекомендуемый тираж",
    },
    colors: [
      { id: "paper", label: "Бумага" },
      { id: "cardboard", label: "Картон" },
      { id: "designer", label: "Дизайнерская бумага" },
    ],
    methods: [
      { id: "digital", label: "Цифровая печать", icon: "print" },
      { id: "offset", label: "Офсет / постпечатка", icon: "engraving" },
    ],
    tiers: [
      { qty: 100, note: "оперативный тираж" },
      { qty: 300, note: "оптимально для промо" },
      { qty: 500, note: "для регулярных заказов" },
      { qty: 1000, note: "для крупных тиражей" },
      { qty: 3000, note: "для массового распространения" },
    ],
    quantityStep: 100,
    specs: [
      ["Основа", "Полиграфическая продукция"],
      ["Подходит для", "визиток, листовок, буклетов, меню, брошюр, конвертов и бланков"],
      ["Подготовка", "проверка макета, размеров и цветового профиля"],
      ["Срок запуска", "после утверждения макета и тиража"],
    ],
    gallery: [
      { src: "assets/result-business-cards.png", frame: "product-frame-flat", label: "Основной вид" },
      { src: "assets/service-print.png", frame: "product-frame-flat-detail", label: "Деталь" },
      { src: "assets/hero-products.png", frame: "product-frame-flat-wide", label: "В подборке" },
    ],
    examples: [
      { src: "assets/result-business-cards.png", frame: "product-frame-flat", tone: "" },
      { src: "assets/service-print.png", frame: "product-frame-flat-detail", tone: "is-dark" },
      { src: "assets/hero-products.png", frame: "product-frame-flat-wide", tone: "" },
      { src: "assets/result-business-cards.png", frame: "product-frame-flat", tone: "is-metal" },
    ],
  },
  "print-display": {
    headings: {
      colors: "Основа",
      methods: "Технология",
      quantity: "Количество",
      quantityUnit: "шт",
      tiers: "Типовой объем",
    },
    colors: [
      { id: "banner", label: "Баннер / пленка" },
      { id: "plastic", label: "Пластик / ПВХ" },
      { id: "composite", label: "Композит / каркас" },
    ],
    methods: [
      { id: "wide", label: "Широкоформатная печать", icon: "print" },
      { id: "assembly", label: "Сборка / монтаж", icon: "engraving" },
    ],
    tiers: [
      { qty: 1, note: "единичный проект" },
      { qty: 3, note: "небольшая серия" },
      { qty: 5, note: "для сети точек" },
      { qty: 10, note: "для кампании или выставки" },
      { qty: 20, note: "для масштабного оформления" },
    ],
    quantityStep: 1,
    specs: [
      ["Основа", "Рекламные конструкции и оформление"],
      ["Подходит для", "баннеров, стендов, вывесок, витрин и выставочных решений"],
      ["Подготовка", "замеры, подбор материала и схема монтажа"],
      ["Срок запуска", "после согласования конструкции и макета"],
    ],
    gallery: [
      { src: "assets/hero-products.png", frame: "product-frame-display", label: "Основной вид" },
      { src: "assets/service-print.png", frame: "product-frame-flat-wide", label: "Концепт" },
      { src: "assets/result-business-cards.png", frame: "product-frame-flat-detail", label: "Деталь" },
    ],
    examples: [
      { src: "assets/hero-products.png", frame: "product-frame-display", tone: "" },
      { src: "assets/service-print.png", frame: "product-frame-flat-wide", tone: "is-dark" },
      { src: "assets/result-business-cards.png", frame: "product-frame-flat-detail", tone: "" },
      { src: "assets/hero-products.png", frame: "product-frame-display", tone: "is-metal" },
    ],
  },
  "print-sticker": {
    headings: {
      colors: "Основа",
      methods: "Технология",
      quantity: "Тираж",
      quantityUnit: "шт",
      tiers: "Рекомендуемый тираж",
    },
    colors: [
      { id: "film", label: "Самоклеящаяся пленка" },
      { id: "paper", label: "Самоклеящаяся бумага" },
      { id: "durable", label: "Износостойкий материал" },
    ],
    methods: [
      { id: "print", label: "Печать", icon: "print" },
      { id: "cut", label: "Плоттерная резка", icon: "engraving" },
    ],
    tiers: [
      { qty: 50, note: "малый тираж" },
      { qty: 100, note: "для маркировки" },
      { qty: 300, note: "для промо и упаковки" },
      { qty: 500, note: "для поточного использования" },
      { qty: 1000, note: "для крупных партий" },
    ],
    quantityStep: 50,
    specs: [
      ["Основа", "Самоклеящаяся продукция"],
      ["Подходит для", "наклеек, этикеток, пломб, трафаретов и автонаклеек"],
      ["Подготовка", "проверка контура, размера и способа резки"],
      ["Срок запуска", "после согласования материала и макета"],
    ],
    gallery: [
      { src: "assets/service-print.png", frame: "product-frame-sticker", label: "Основной вид" },
      { src: "assets/result-business-cards.png", frame: "product-frame-flat-detail", label: "Деталь" },
      { src: "assets/service-print.png", frame: "product-frame-flat", label: "Лист" },
    ],
    examples: [
      { src: "assets/service-print.png", frame: "product-frame-sticker", tone: "" },
      { src: "assets/result-business-cards.png", frame: "product-frame-flat-detail", tone: "is-dark" },
      { src: "assets/service-print.png", frame: "product-frame-flat", tone: "" },
      { src: "assets/service-print.png", frame: "product-frame-sticker", tone: "is-metal" },
    ],
  },
  "print-sign": {
    headings: {
      colors: "Основа",
      methods: "Технология",
      quantity: "Количество",
      quantityUnit: "шт",
      tiers: "Типовой объем",
    },
    colors: [
      { id: "plastic", label: "Пластик" },
      { id: "composite", label: "Композит" },
      { id: "acrylic", label: "Акрил" },
    ],
    methods: [
      { id: "print", label: "Печать / аппликация", icon: "print" },
      { id: "mount", label: "Резка / монтаж", icon: "engraving" },
    ],
    tiers: [
      { qty: 1, note: "индивидуальное изделие" },
      { qty: 5, note: "для одного офиса или точки" },
      { qty: 10, note: "для нескольких кабинетов" },
      { qty: 20, note: "для сети помещений" },
      { qty: 50, note: "для комплексной навигации" },
    ],
    quantityStep: 1,
    specs: [
      ["Основа", "Навигация и таблички"],
      ["Подходит для", "стендов, офисных табличек, указателей и внутренней навигации"],
      ["Подготовка", "согласование размеров, крепления и читаемости"],
      ["Срок запуска", "после утверждения макета и материала"],
    ],
    gallery: [
      { src: "assets/service-print.png", frame: "product-frame-flat-wide", label: "Основной вид" },
      { src: "assets/hero-products.png", frame: "product-frame-display", label: "В интерьере" },
      { src: "assets/result-business-cards.png", frame: "product-frame-flat-detail", label: "Деталь" },
    ],
    examples: [
      { src: "assets/service-print.png", frame: "product-frame-flat-wide", tone: "" },
      { src: "assets/hero-products.png", frame: "product-frame-display", tone: "is-dark" },
      { src: "assets/result-business-cards.png", frame: "product-frame-flat-detail", tone: "" },
      { src: "assets/service-print.png", frame: "product-frame-flat-wide", tone: "is-metal" },
    ],
  },
};

function buildFallbackService(params) {
  const kind = params.get("kind") || "souvenirs";
  const title = params.get("title") || "Услуга";
  const section = params.get("section") || (kind === "print" ? "Полиграфия" : "Сувениры");
  const catalogConfig = catalogApi?.catalogConfigs?.[kind];

  return {
    title,
    section,
    slug: params.get("slug") || catalogApi?.slugify?.(title) || "usluga",
    catalogKind: kind,
    label: catalogConfig?.label || (kind === "print" ? "Полиграфия" : "Сувениры"),
    image: kind === "print" ? "assets/service-print.png" : "assets/souvenir-pen.png",
    presetKey: kind === "print" ? "print-flat" : "pen",
    lead:
      kind === "print"
        ? `${title} в разделе «${section}». Подберем материалы и технологию под ваш проект.`
        : `${title} с фирменным нанесением и подбором подходящего тиража под вашу задачу.`,
  };
}

function buildProductDescription(service) {
  return service.lead;
}

function initCompanyPage() {
  const page = document.querySelector("[data-company-page]");

  if (!page || !companyApi) {
    return;
  }

  const heroTitleNode = document.querySelector("[data-company-hero-title]");
  const heroSubtitleNode = document.querySelector("[data-company-hero-subtitle]");
  const heroImageNode = document.querySelector("[data-company-hero-image]");
  const introNode = document.querySelector("[data-company-intro]");
  const todayLeadNode = document.querySelector("[data-company-today-lead]");
  const todayItemsNode = document.querySelector("[data-company-today-items]");
  const closingNode = document.querySelector("[data-company-closing]");
  const certificatesNode = document.querySelector("[data-company-certificates]");
  const equipmentLeadNode = document.querySelector("[data-company-equipment-lead]");
  const equipmentWatchNode = document.querySelector("[data-company-equipment-watch]");
  const equipmentGroupsNode = document.querySelector("[data-company-equipment-groups]");
  const videosLeadNode = document.querySelector("[data-company-videos-lead]");
  const videosIntroNode = document.querySelector("[data-company-videos-intro]");
  const videosChannelNode = document.querySelector("[data-company-videos-channel]");
  const videosNode = document.querySelector("[data-company-videos]");
  const contactsNode = document.querySelector("[data-company-contacts]");
  const photoModal = document.querySelector("#company-photo-modal");
  const photoModalImage = photoModal?.querySelector("[data-company-modal-image]");
  const photoModalClose = photoModal?.querySelector(".photo-modal-close");

  if (
    !heroTitleNode ||
    !heroSubtitleNode ||
    !heroImageNode ||
    !introNode ||
    !todayLeadNode ||
    !todayItemsNode ||
    !closingNode ||
    !certificatesNode ||
    !equipmentLeadNode ||
    !equipmentWatchNode ||
    !equipmentGroupsNode ||
    !videosLeadNode ||
    !videosIntroNode ||
    !videosChannelNode ||
    !videosNode ||
    !contactsNode
  ) {
    return;
  }

  function buildParagraphs(items) {
    return items.map((item) => `<p>${escapeHtml(item)}</p>`).join("");
  }

  function buildPhoneHref(phone) {
    return `tel:${phone.replace(/[^\d+]/g, "")}`;
  }

  function openPhotoModal(src, alt) {
    if (!photoModal || !photoModalImage) {
      return;
    }

    photoModalImage.src = src;
    photoModalImage.alt = alt;
    photoModal.hidden = false;
    document.body.classList.add("modal-open");
    photoModalClose?.focus();
  }

  function closePhotoModal() {
    if (!photoModal || photoModal.hidden) {
      return;
    }

    photoModal.hidden = true;

    if (!document.querySelector(".modal-backdrop:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
  }

  document.title = `COMINT - ${companyApi.hero.title}`;
  heroTitleNode.textContent = companyApi.hero.title;
  heroSubtitleNode.textContent = companyApi.hero.subtitle;
  heroImageNode.src = companyApi.hero.image;
  heroImageNode.alt = companyApi.hero.title;

  introNode.innerHTML = buildParagraphs(companyApi.intro);
  todayLeadNode.textContent = companyApi.todayLead;
  todayItemsNode.innerHTML = companyApi.todayItems
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  closingNode.innerHTML = buildParagraphs(companyApi.closing);

  certificatesNode.innerHTML = companyApi.certificates
    .slice(0, 2)
    .map((src, index) => {
      return `
        <button
          class="company-media-card company-certificate-card"
          type="button"
          data-company-media-src="${escapeHtml(src)}"
          data-company-media-alt="Сертификат COMINT ${index + 1}"
          aria-label="Открыть сертификат ${index + 1}"
        >
          <img src="${escapeHtml(src)}" alt="Сертификат COMINT ${index + 1}" loading="lazy" />
        </button>
      `;
    })
    .join("");

  equipmentLeadNode.textContent = companyApi.equipmentLead;
  equipmentWatchNode.textContent = companyApi.equipmentWatch;
  equipmentWatchNode.href = companyApi.equipmentWatchUrl;

  equipmentGroupsNode.innerHTML = companyApi.equipmentGroups
    .map((group) => {
      return `
        <article class="company-group-card company-panel">
          <div class="company-group-head">
            <h3>${escapeHtml(group.title)}</h3>
            <span>${group.items.length} ${
              group.items.length === 1 ? "позиция" : group.items.length < 5 ? "позиции" : "позиций"
            }</span>
          </div>
          <div class="company-equipment-grid">
            ${group.items
              .map((item) => {
                return `
                  <button
                    class="company-equipment-card"
                    type="button"
                    data-company-media-src="${escapeHtml(item.image)}"
                    data-company-media-alt="${escapeHtml(item.title)}"
                    aria-label="Открыть фото ${escapeHtml(item.title)}"
                  >
                    <span class="company-equipment-media">
                      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" />
                    </span>
                    <span class="company-equipment-copy">
                      <strong>${escapeHtml(item.title)}</strong>
                      <span>${escapeHtml(item.description)}</span>
                    </span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </article>
      `;
    })
    .join("");

  videosLeadNode.textContent = companyApi.videosLead;
  videosIntroNode.innerHTML = buildParagraphs(companyApi.videosIntro);
  videosChannelNode.href = companyApi.videosChannelUrl;

  videosNode.innerHTML = companyApi.videos
    .map((video) => {
      const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
      const previewUrl = `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`;

      return `
        <a class="company-video-card" href="${videoUrl}" target="_blank" rel="noreferrer">
          <span class="company-video-preview">
            <img src="${previewUrl}" alt="${escapeHtml(video.title)}" loading="lazy" />
            <span class="company-video-play" aria-hidden="true">▶</span>
          </span>
          <span class="company-video-copy">
            <strong>${escapeHtml(video.title)}</strong>
            <span>${escapeHtml(video.description)}</span>
            <em>${escapeHtml(video.category)}</em>
          </span>
        </a>
      `;
    })
    .join("");

  contactsNode.innerHTML = `
    <article class="company-contact-card company-panel">
      <h3>О компании</h3>
      <p>${escapeHtml(companyApi.contacts.description)}</p>
      <strong>Адрес и время работы</strong>
      <p>${escapeHtml(companyApi.contacts.address)}</p>
    </article>
    <article class="company-contact-card company-panel">
      <h3>Телефоны</h3>
      <div class="company-contact-links">
        ${companyApi.contacts.phones
          .map(
            (phone) =>
              `<a href="${buildPhoneHref(phone)}">${escapeHtml(phone)}</a>`,
          )
          .join("")}
      </div>
    </article>
    <article class="company-contact-card company-panel">
      <h3>Email</h3>
      <div class="company-contact-links">
        <a href="mailto:${escapeHtml(companyApi.contacts.email)}">${escapeHtml(companyApi.contacts.email)}</a>
      </div>
      <button class="company-contact-button" type="button" data-open-order-modal>
        Оставить заявку
      </button>
    </article>
  `;

  page.addEventListener("click", (event) => {
    const mediaTrigger = event.target.closest("[data-company-media-src]");

    if (!mediaTrigger) {
      return;
    }

    openPhotoModal(
      mediaTrigger.dataset.companyMediaSrc || "",
      mediaTrigger.dataset.companyMediaAlt || "Изображение",
    );
  });

  photoModalClose?.addEventListener("click", closePhotoModal);

  photoModal?.addEventListener("click", (event) => {
    if (event.target === photoModal) {
      closePhotoModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePhotoModal();
    }
  });
}

function initCatalogItemPage() {
  const page = document.querySelector("[data-product-page]");

  if (!page) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const kind = params.get("kind") || "souvenirs";
  const service =
    catalogApi?.findService({
      kind,
      slug: params.get("slug") || "",
      title: params.get("title") || "",
    }) || buildFallbackService(params);

  const preset = productPagePresets[service.presetKey] || productPagePresets.pen;
  const title = service.title;
  const catalogConfig = catalogApi?.catalogConfigs?.[service.catalogKind];

  const titleNode = document.querySelector("[data-product-title]");
  const trailNode = document.querySelector("[data-product-trail]");
  const descriptionNode = document.querySelector("[data-product-description]");
  const priceNode = document.querySelector("[data-product-price]");
  const pricePrefixNode = document.querySelector("[data-product-price-prefix]");
  const priceSuffixNode = document.querySelector("[data-product-price-suffix]");
  const colorsHeadingNode = document.querySelector("[data-product-colors-heading]");
  const methodsHeadingNode = document.querySelector("[data-product-methods-heading]");
  const quantityHeadingNode = document.querySelector("[data-product-quantity-heading]");
  const quantityUnitNode = document.querySelector("[data-product-quantity-unit]");
  const tiersHeadingNode = document.querySelector("[data-product-tiers-heading]");
  const colorsNode = document.querySelector("[data-product-colors]");
  const methodsNode = document.querySelector("[data-product-methods]");
  const quantityInput = document.querySelector("[data-product-quantity]");
  const priceTableNode = document.querySelector("[data-product-price-table]");
  const specsNode = document.querySelector("[data-product-specs]");
  const examplesNode = document.querySelector("[data-product-examples]");
  const stageMediaNode = document.querySelector("[data-product-stage-media]");
  const stageImageNode = document.querySelector("[data-product-stage-image]");
  const thumbnailsNode = document.querySelector("[data-product-thumbnails]");
  const orderTrigger = document.querySelector("[data-product-order-trigger]");
  const orderComment = document.querySelector(".order-form textarea[name='comment']");
  const catalogLinkNode = document.querySelector("[data-product-catalog-link]");
  const examplePhotoModal = document.querySelector("#example-photo-modal");
  const examplePhotoModalImage = examplePhotoModal?.querySelector("[data-example-modal-image]");
  const examplePhotoModalClose = examplePhotoModal?.querySelector(".photo-modal-close");

  if (
    !titleNode ||
    !trailNode ||
    !descriptionNode ||
    !priceNode ||
    !colorsNode ||
    !methodsNode ||
    !quantityInput ||
    !priceTableNode ||
    !specsNode ||
    !examplesNode ||
    !stageMediaNode ||
    !stageImageNode ||
    !thumbnailsNode
  ) {
    return;
  }

  document.title = `COMINT - ${title}`;
  titleNode.textContent = title;
  trailNode.textContent = service.section;
  descriptionNode.textContent = buildProductDescription(service);

  if (catalogLinkNode && catalogConfig) {
    catalogLinkNode.href = catalogConfig.pagePath;
    catalogLinkNode.textContent = catalogConfig.label;
  }

  if (pricePrefixNode) {
    pricePrefixNode.textContent = "Стоимость";
  }

  if (priceNode) {
    priceNode.textContent = "по запросу";
  }

  if (priceSuffixNode) {
    priceSuffixNode.textContent = "после уточнения тиража, материалов и сроков";
  }

  if (colorsHeadingNode) {
    colorsHeadingNode.textContent = preset.headings.colors;
  }

  if (methodsHeadingNode) {
    methodsHeadingNode.textContent = preset.headings.methods;
  }

  if (quantityHeadingNode) {
    quantityHeadingNode.textContent = preset.headings.quantity;
  }

  if (quantityUnitNode) {
    quantityUnitNode.textContent = preset.headings.quantityUnit;
  }

  if (tiersHeadingNode) {
    tiersHeadingNode.textContent = preset.headings.tiers;
  }

  const state = {
    color: preset.colors[0].id,
    method: preset.methods[0].id,
    quantity: preset.tiers[Math.min(3, preset.tiers.length - 1)].qty,
    galleryIndex: 0,
  };

  const colorClassById = Object.fromEntries(preset.colors.map((color) => [color.id, color.className || ""]));

  function getCurrentTier() {
    return preset.tiers.find((tier) => state.quantity <= tier.qty) || preset.tiers[preset.tiers.length - 1];
  }

  function renderThumbnails() {
    const colorClass = colorClassById[state.color] || "";

    thumbnailsNode.innerHTML = preset.gallery
      .map((item, index) => {
        const isActive = index === state.galleryIndex;
        return `
          <button
            class="product-thumb ${isActive ? "is-active" : ""}"
            type="button"
            data-thumb-index="${index}"
            aria-label="${escapeHtml(item.label)}"
            aria-pressed="${String(isActive)}"
          >
            <span class="product-thumb-media ${item.frame} ${colorClass}">
              <img src="${escapeHtml(item.src)}" alt="" />
            </span>
          </button>
        `;
      })
      .join("");
  }

  function renderStage() {
    const item = preset.gallery[state.galleryIndex] || preset.gallery[0];
    const colorClass = colorClassById[state.color] || "";

    stageImageNode.src = item.src;
    stageImageNode.alt = title;
    stageMediaNode.className = `product-stage-media ${item.frame} ${colorClass}`.trim();
    renderThumbnails();
  }

  function renderFirstOptions() {
    colorsNode.innerHTML = preset.colors
      .map((color) => {
        const activeClass = color.id === state.color ? "is-active" : "";
        const swatch = color.swatch
          ? `<span class="product-color-swatch ${color.className || ""}"></span>`
          : "";

        return `
          <button
            type="button"
            class="product-option-button ${activeClass}"
            data-color-id="${escapeHtml(color.id)}"
            aria-pressed="${String(color.id === state.color)}"
          >
            ${swatch}
            ${escapeHtml(color.label)}
          </button>
        `;
      })
      .join("");
  }

  function renderMethods() {
    methodsNode.innerHTML = preset.methods
      .map((method) => {
        const activeClass = method.id === state.method ? "is-active" : "";
        const iconClass = method.icon === "engraving" ? "is-engraving" : "is-print";

        return `
          <button
            type="button"
            class="product-option-button ${activeClass}"
            data-method-id="${escapeHtml(method.id)}"
            aria-pressed="${String(method.id === state.method)}"
          >
            <span class="product-method-icon ${iconClass}"></span>
            ${escapeHtml(method.label)}
          </button>
        `;
      })
      .join("");
  }

  function renderTiers() {
    const currentTier = getCurrentTier();
    quantityInput.value = String(state.quantity);

    priceTableNode.innerHTML = preset.tiers
      .map((tier) => {
        const activeClass = tier.qty === currentTier.qty ? "is-active" : "";
        return `
          <button
            type="button"
            class="product-price-row ${activeClass}"
            data-tier-qty="${tier.qty}"
            aria-pressed="${String(tier.qty === currentTier.qty)}"
          >
            <span>${tier.qty} ${escapeHtml(preset.headings.quantityUnit)}</span>
            <span>${escapeHtml(tier.note)}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderSpecs() {
    const specs = [
      ["Категория", service.label],
      ["Раздел", service.section],
      ...preset.specs,
    ];

    specsNode.innerHTML = specs.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("");
  }

  function renderExamples() {
    const colorClass = colorClassById[state.color] || "";

    examplesNode.innerHTML = preset.examples
      .map((item, index) => {
        return `
          <button
            class="product-example-card ${item.tone}"
            type="button"
            data-example-index="${index}"
            aria-label="Открыть пример работы ${index + 1}"
          >
            <span class="product-example-media ${item.frame} ${colorClass}">
              <img src="${escapeHtml(item.src)}" alt="${escapeHtml(title)}" />
            </span>
          </button>
        `;
      })
      .join("");
  }

  function openExamplePhoto(index) {
    const item = preset.examples[index];

    if (!item || !examplePhotoModal || !examplePhotoModalImage) {
      return;
    }

    examplePhotoModalImage.src = item.src;
    examplePhotoModalImage.alt = `${title} — пример работы ${index + 1}`;
    examplePhotoModal.hidden = false;
    document.body.classList.add("modal-open");
    examplePhotoModalClose?.focus();
  }

  function closeExamplePhoto() {
    if (!examplePhotoModal || examplePhotoModal.hidden) {
      return;
    }

    examplePhotoModal.hidden = true;

    if (!document.querySelector(".modal-backdrop:not([hidden])")) {
      document.body.classList.remove("modal-open");
    }
  }

  function syncOrderComment() {
    if (!orderComment) {
      return;
    }

    const firstOption = preset.colors.find((item) => item.id === state.color)?.label || "";
    const method = preset.methods.find((item) => item.id === state.method)?.label || "";
    orderComment.value = `${title}, раздел: ${service.section}, параметр: ${firstOption}, технология: ${method}, ${preset.headings.quantity.toLowerCase()}: ${state.quantity} ${preset.headings.quantityUnit}`;
  }

  function commitQuantityInput() {
    const parsed = Number(quantityInput.value.replace(/[^\d]/g, ""));
    const minimum = preset.tiers[0].qty;
    const maximum = preset.tiers[preset.tiers.length - 1].qty;

    if (!Number.isFinite(parsed) || parsed <= 0) {
      quantityInput.value = String(state.quantity);
      return;
    }

    state.quantity = Math.max(minimum, Math.min(maximum, parsed));
  }

  function syncOrderTrigger() {
    if (!orderTrigger) {
      return;
    }

    const firstOption = preset.colors.find((item) => item.id === state.color)?.label || "";
    const method = preset.methods.find((item) => item.id === state.method)?.label || "";
    const currentGallery = preset.gallery[state.galleryIndex] || preset.gallery[0];

    orderTrigger.dataset.orderTitle = title;
    orderTrigger.dataset.orderImage = currentGallery.src;
    orderTrigger.dataset.orderImageFrame = currentGallery.frame;
    orderTrigger.dataset.orderColorClass = colorClassById[state.color] || "";
    orderTrigger.dataset.orderOptions = `${firstOption} • ${method} • ${state.quantity} ${preset.headings.quantityUnit}`;
    orderTrigger.dataset.orderUnit = "Стоимость: по запросу";
    orderTrigger.dataset.orderTotal = `${preset.headings.quantity}: ${state.quantity} ${preset.headings.quantityUnit}`;
  }

  function renderPage() {
    renderFirstOptions();
    renderMethods();
    renderStage();
    renderTiers();
    renderSpecs();
    renderExamples();
    syncOrderComment();
    syncOrderTrigger();
  }

  colorsNode.addEventListener("click", (event) => {
    const target = event.target.closest("[data-color-id]");
    if (!target) {
      return;
    }

    state.color = target.dataset.colorId || preset.colors[0].id;
    renderPage();
  });

  methodsNode.addEventListener("click", (event) => {
    const target = event.target.closest("[data-method-id]");
    if (!target) {
      return;
    }

    state.method = target.dataset.methodId || preset.methods[0].id;
    renderPage();
  });

  thumbnailsNode.addEventListener("click", (event) => {
    const target = event.target.closest("[data-thumb-index]");
    if (!target) {
      return;
    }

    state.galleryIndex = Number(target.dataset.thumbIndex || 0);
    renderStage();
    syncOrderTrigger();
  });

  examplesNode.addEventListener("click", (event) => {
    const target = event.target.closest("[data-example-index]");
    if (!target) {
      return;
    }

    openExamplePhoto(Number(target.dataset.exampleIndex));
  });

  examplePhotoModalClose?.addEventListener("click", closeExamplePhoto);

  examplePhotoModal?.addEventListener("click", (event) => {
    if (event.target === examplePhotoModal) {
      closeExamplePhoto();
    }
  });

  document.querySelectorAll("[data-qty-change]").forEach((button) => {
    button.addEventListener("click", () => {
      commitQuantityInput();
      const direction = Math.sign(Number(button.dataset.qtyChange || 0));
      const step = preset.quantityStep || 50;
      const minimum = preset.tiers[0].qty;
      const maximum = preset.tiers[preset.tiers.length - 1].qty;
      const nextValue = state.quantity + direction * step;
      state.quantity = Math.max(minimum, Math.min(maximum, nextValue));
      renderTiers();
      syncOrderComment();
      syncOrderTrigger();
    });
  });

  quantityInput.addEventListener("change", () => {
    commitQuantityInput();
    renderTiers();
    syncOrderComment();
    syncOrderTrigger();
  });

  priceTableNode.addEventListener("click", (event) => {
    const target = event.target.closest("[data-tier-qty]");
    if (!target) {
      return;
    }

    state.quantity = Number(target.dataset.tierQty || state.quantity);
    renderTiers();
    syncOrderComment();
    syncOrderTrigger();
  });

  orderTrigger?.addEventListener(
    "click",
    () => {
      commitQuantityInput();
      renderTiers();
      syncOrderComment();
      syncOrderTrigger();
    },
    { capture: true },
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeExamplePhoto();
    }
  });

  renderPage();
}

initSiteHeaderMenu();
initHomeSearch();
initCatalogPage();
initCompanyPage();
initCatalogItemPage();
initOrderModal();
