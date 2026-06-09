const productCopy = {
  визитки: [
    "Визитки",
    "Стильные визитки, которые работают на ваш имидж.",
    "Премиальная типография, качественные материалы и внимание к деталям.",
  ],
  листовки: [
    "Листовки",
    "Яркая печать для акций, презентаций и ежедневных задач бизнеса.",
    "Подберем бумагу, тираж и отделку под ваш сценарий.",
  ],
  буклеты: [
    "Буклеты",
    "Аккуратная подача информации в удобном печатном формате.",
    "Верстка, печать и постпечатная обработка в одном месте.",
  ],
  баннеры: [
    "Баннеры",
    "Широкоформатная печать для наружной рекламы и мероприятий.",
    "Четкие цвета, прочные материалы и быстрый запуск в производство.",
  ],
};

const categoryLabels = {
  all: "Все сувениры",
  mugs: "Чашки и кружки",
  bottles: "Бутылки и термосы",
  office: "Офисные принадлежности",
  textile: "Одежда и текстиль",
  tech: "Технологичные",
  keychains: "Брелоки",
  eco: "Эко-сувениры",
};

const sortLabels = {
  popular: "По популярности",
  "price-asc": "Сначала дешевле",
  "price-desc": "Сначала дороже",
  name: "По названию",
};

function normalize(value) {
  return value.trim().toLowerCase();
}

function initHomeSearch() {
  const input = document.querySelector("#product-search");
  const clearButton = document.querySelector(".clear-search");
  const resultCard = document.querySelector(".result-card");
  const resultTitle = document.querySelector(".result-copy h2");
  const resultText = document.querySelectorAll(".result-copy p");

  function updateResult() {
    if (!input || !resultCard || !resultTitle || resultText.length < 2) {
      return;
    }

    const value = normalize(input.value);
    resultCard.hidden = value.length === 0;

    if (!value) {
      return;
    }

    const key = Object.keys(productCopy).find((item) => value.includes(item));
    const copy = productCopy[key] || [
      input.value.trim(),
      "Подготовим услугу под ваши задачи и сроки.",
      "Поможем с материалами, дизайном, тиражом и финальной отделкой.",
    ];

    resultTitle.textContent = copy[0];
    resultText[0].textContent = copy[1];
    resultText[1].textContent = copy[2];
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
  const orderModalClose = document.querySelector(".modal-close");
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
      modalKicker.textContent = "Заявка по товару";
    }

    if (modalTitle) {
      modalTitle.textContent = "Проверьте состав заявки";
    }

    if (modalDescription) {
      modalDescription.textContent =
        "Мы уже подставили выбранный товар и параметры. Оставьте контакты, и мы подтвердим стоимость, сроки и запуск в работу.";
    }

    if (modalSummary) {
      modalSummary.hidden = false;
    }

    if (modalSummaryMedia && trigger.dataset.orderImageFrame) {
      modalSummaryMedia.className = `modal-order-media ${trigger.dataset.orderImageFrame} ${trigger.dataset.orderColorClass || "is-black"}`;
    }

    if (modalSummaryImage && trigger.dataset.orderImage) {
      modalSummaryImage.src = trigger.dataset.orderImage;
      modalSummaryImage.alt = trigger.dataset.orderTitle || "Товар";
    }

    if (modalSummaryTitle) {
      modalSummaryTitle.textContent = trigger.dataset.orderTitle || "Товар";
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

function formatPrice(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} бел. руб.`;
}

function formatBelPrice(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} бел. руб.`;
}

function createCatalogProducts() {
  const imagePool = [
    "assets/catalog-mug.png",
    "assets/catalog-thermos.png",
    "assets/catalog-bag.png",
    "assets/catalog-pen.png",
  ];

  const baseItems = [
    {
      title: "Кружка матовая",
      subtitle: "Объем 320 мл",
      price: 890,
      image: "assets/catalog-mug.png",
      category: "mugs",
      popularity: 99,
      slug: "matovaya-kruzhka",
    },
    {
      title: "Термос",
      subtitle: "Объем 500 мл",
      price: 1490,
      image: "assets/catalog-thermos.png",
      category: "bottles",
      popularity: 96,
      slug: "termos",
    },
    {
      title: "Ежедневник",
      subtitle: "Формат A5",
      price: 950,
      image: "assets/catalog-bag.png",
      category: "office",
      popularity: 93,
      slug: "ezhednevnik",
    },
    {
      title: "Ручка металлическая",
      subtitle: "С логотипом",
      price: 550,
      image: "assets/catalog-pen.png",
      category: "office",
      popularity: 90,
      slug: "metallicheskaya-ruchka",
    },
    {
      title: "Худи",
      subtitle: "Размеры S-XXL",
      price: 2990,
      image: "assets/catalog-bag.png",
      category: "textile",
      popularity: 95,
      slug: "hudi",
    },
    {
      title: "Шоппер",
      subtitle: "100% хлопок",
      price: 790,
      image: "assets/catalog-bag.png",
      category: "eco",
      popularity: 89,
      slug: "shopper",
    },
    {
      title: "Брелок",
      subtitle: "Металл",
      price: 390,
      image: "assets/catalog-mug.png",
      category: "keychains",
      popularity: 88,
      slug: "brelok",
    },
    {
      title: "Пауэрбанк",
      subtitle: "Емкость 10000 mAh",
      price: 1890,
      image: "assets/catalog-thermos.png",
      category: "tech",
      popularity: 91,
      slug: "powerbank",
    },
  ];

  const collections = [
    { suffix: "Core", priceShift: 0, popularityShift: 0 },
    { suffix: "Studio", priceShift: 60, popularityShift: -1 },
    { suffix: "Urban", priceShift: 90, popularityShift: -2 },
    { suffix: "Prime", priceShift: 120, popularityShift: -3 },
    { suffix: "Lite", priceShift: -40, popularityShift: -4 },
    { suffix: "Select", priceShift: 170, popularityShift: -5 },
    { suffix: "Smart", priceShift: 110, popularityShift: -6 },
    { suffix: "Black", priceShift: 140, popularityShift: -7 },
  ];

  return collections.flatMap((collection, collectionIndex) =>
    baseItems.map((item, itemIndex) => {
      const isBaseName = collectionIndex === 0;
      return {
        id: `${item.slug}-${collectionIndex + 1}`,
        slug: `${item.slug}-${collection.suffix.toLowerCase()}`,
        title: isBaseName ? item.title : `${item.title} ${collection.suffix}`,
        subtitle: isBaseName ? item.subtitle : `${item.subtitle} • серия ${collection.suffix}`,
        price: Math.max(290, item.price + collection.priceShift + itemIndex * 10),
        image: imagePool[(collectionIndex + itemIndex) % imagePool.length] || item.image,
        category: item.category,
        popularity: item.popularity + collection.popularityShift - itemIndex,
      };
    }),
  );
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

function initSouvenirsCatalog() {
  const page = document.querySelector(".souvenirs-page");

  if (!page) {
    return;
  }

  const categoryButtons = [...document.querySelectorAll("[data-category]")];
  const searchInput = document.querySelector("[data-catalog-search-input]");
  const searchClearButton = document.querySelector("[data-catalog-search-clear]");
  const grid = document.querySelector("[data-catalog-grid]");
  const emptyState = document.querySelector("[data-catalog-empty]");
  const pagination = document.querySelector("[data-catalog-pagination]");
  const sortTrigger = document.querySelector("[data-sort-trigger]");
  const sortMenu = document.querySelector("[data-sort-menu]");
  const sortLabel = document.querySelector("[data-sort-label]");
  const sortOptions = [...document.querySelectorAll("[data-sort-menu] [data-sort]")];
  const viewButtons = [...document.querySelectorAll("[data-view]")];

  if (!grid || !pagination || !searchInput || !searchClearButton || !sortTrigger || !sortMenu || !sortLabel) {
    return;
  }

  const state = {
    category: "all",
    query: "",
    page: 1,
    sort: "popular",
    view: "grid",
    favorites: new Set(),
  };

  const itemsPerPage = 8;
  const allProducts = createCatalogProducts();

  function getVisibleProducts() {
    const query = normalize(state.query);

    return allProducts
      .filter((product) => state.category === "all" || product.category === state.category)
      .filter((product) => {
        if (!query) {
          return true;
        }

        const haystack = normalize(
          [product.title, product.subtitle, categoryLabels[product.category] || ""].join(" "),
        );
        return haystack.includes(query);
      })
      .sort((left, right) => {
        if (state.sort === "price-asc") {
          return left.price - right.price;
        }

        if (state.sort === "price-desc") {
          return right.price - left.price;
        }

        if (state.sort === "name") {
          return left.title.localeCompare(right.title, "ru");
        }

        return right.popularity - left.popularity;
      });
  }

  function getProductLink(product) {
    const params = new URLSearchParams({
      title: product.title,
      category: categoryLabels[product.category] || "Сувениры",
      slug: product.slug,
    });

    return `catalog-item.html?${params.toString()}`;
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
        const isFavorite = state.favorites.has(product.id);
        const label = isFavorite ? "Убрать из избранного" : "В избранное";

        return `
          <article class="product-card">
            <button
              class="product-favorite ${isFavorite ? "is-active" : ""}"
              type="button"
              aria-label="${label}"
              data-favorite-id="${product.id}"
            >
              ${isFavorite ? "♥" : "♡"}
            </button>
            <a class="product-visual" href="${getProductLink(product)}" aria-label="Открыть ${product.title}">
              <img src="${product.image}" alt="${product.title}" />
            </a>
            <div class="product-info">
              <h3>${product.title}</h3>
              <p>${product.subtitle}</p>
              <div class="product-meta">
                <strong>${formatPrice(product.price)}</strong>
                <a href="${getProductLink(product)}" aria-label="Открыть товар">→</a>
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
    categoryButtons.forEach((button) => {
      const isActive = button.dataset.category === state.category;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    searchClearButton.hidden = state.query.length === 0;
    sortLabel.textContent = sortLabels[state.sort];

    sortOptions.forEach((option) => {
      option.classList.toggle("is-active", option.dataset.sort === state.sort);
    });

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

  function closeSortMenu() {
    sortMenu.hidden = true;
    sortTrigger.setAttribute("aria-expanded", "false");
    sortTrigger.parentElement?.classList.remove("is-open");
  }

  function openSortMenu() {
    sortMenu.hidden = false;
    sortTrigger.setAttribute("aria-expanded", "true");
    sortTrigger.parentElement?.classList.add("is-open");
  }

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category || "all";
      state.page = 1;
      renderCatalog();
    });
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

  sortTrigger.addEventListener("click", () => {
    if (sortMenu.hidden) {
      openSortMenu();
      return;
    }

    closeSortMenu();
  });

  sortOptions.forEach((option) => {
    option.addEventListener("click", () => {
      state.sort = option.dataset.sort || "popular";
      state.page = 1;
      closeSortMenu();
      renderCatalog();
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view || "grid";
      renderControls();
      renderProducts(getVisibleProducts().slice((state.page - 1) * itemsPerPage, state.page * itemsPerPage));
    });
  });

  pagination.addEventListener("click", (event) => {
    const target = event.target.closest("[data-page], [data-page-shift]");

    if (!target) {
      return;
    }

    if (target.hasAttribute("disabled")) {
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

  grid.addEventListener("click", (event) => {
    const favoriteButton = event.target.closest("[data-favorite-id]");

    if (!favoriteButton) {
      return;
    }

    const { favoriteId } = favoriteButton.dataset;

    if (!favoriteId) {
      return;
    }

    if (state.favorites.has(favoriteId)) {
      state.favorites.delete(favoriteId);
    } else {
      state.favorites.add(favoriteId);
    }

    renderCatalog();
  });

  document.addEventListener("click", (event) => {
    if (!sortTrigger.parentElement?.contains(event.target)) {
      closeSortMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSortMenu();
    }
  });

  renderCatalog();
}

const productPagePresets = {
  pen: {
    trail: "Ручки",
    title: "Ручка металлическая",
    description:
      "Стильная металлическая ручка с логотипом — элегантный аксессуар для клиентов и сотрудников премиум-класса.",
    colors: [
      { id: "black", label: "Черный", className: "is-black" },
      { id: "blue", label: "Синий", className: "is-blue" },
      { id: "silver", label: "Серебристый", className: "is-silver" },
    ],
    methods: [
      { id: "print", label: "Печать", icon: "print" },
      { id: "engraving", label: "Гравировка", icon: "engraving" },
    ],
    prices: [
      { qty: 50, price: 690 },
      { qty: 100, price: 620 },
      { qty: 300, price: 580 },
      { qty: 500, price: 550 },
      { qty: 1000, price: 510 },
    ],
    specs: [
      ["Материал", "Металл"],
      ["Механизм", "Поворотный"],
      ["Нанесение", "УФ-печать, гравировка"],
      ["Срок изготовления", "3-5 рабочих дней"],
      ["Минимальный тираж", "50 шт"],
    ],
    gallery: [
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-hero", label: "Основной вид" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-logo", label: "Логотип крупно" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-tip", label: "Наконечник" },
    ],
    examples: [
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-logo", tone: "" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-box", tone: "is-dark" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-detail", tone: "is-metal" },
      { src: "assets/catalog-pen.png", frame: "product-frame-pen-angle", tone: "is-dark" },
    ],
  },
  mug: {
    trail: "Кружки",
    title: "Кружка матовая",
    description:
      "Матовая кружка с фирменным логотипом для подарков, welcome-pack наборов и корпоративных мероприятий.",
    colors: [
      { id: "black", label: "Черный", className: "is-black" },
      { id: "blue", label: "Синий", className: "is-blue" },
      { id: "silver", label: "Серый", className: "is-silver" },
    ],
    methods: [
      { id: "print", label: "Печать", icon: "print" },
      { id: "engraving", label: "Гравировка", icon: "engraving" },
    ],
    prices: [
      { qty: 50, price: 990 },
      { qty: 100, price: 940 },
      { qty: 300, price: 910 },
      { qty: 500, price: 890 },
      { qty: 1000, price: 850 },
    ],
    specs: [
      ["Материал", "Керамика"],
      ["Объем", "320 мл"],
      ["Нанесение", "УФ-печать, деколь"],
      ["Срок изготовления", "4-6 рабочих дней"],
      ["Минимальный тираж", "50 шт"],
    ],
    gallery: [
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-front", label: "Основной вид" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-angle", label: "Под углом" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-detail", label: "Логотип" },
    ],
    examples: [
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-front", tone: "" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-angle", tone: "is-dark" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-detail", tone: "is-metal" },
      { src: "assets/catalog-mug.png", frame: "product-frame-mug-angle", tone: "" },
    ],
  },
  thermos: {
    trail: "Термосы",
    title: "Термос",
    description:
      "Лаконичный термос для брендированных наборов и ежедневного использования в офисе, дороге и на встречах.",
    colors: [
      { id: "black", label: "Черный", className: "is-black" },
      { id: "blue", label: "Синий", className: "is-blue" },
      { id: "silver", label: "Серебристый", className: "is-silver" },
    ],
    methods: [
      { id: "print", label: "Печать", icon: "print" },
      { id: "engraving", label: "Гравировка", icon: "engraving" },
    ],
    prices: [
      { qty: 50, price: 1590 },
      { qty: 100, price: 1540 },
      { qty: 300, price: 1510 },
      { qty: 500, price: 1490 },
      { qty: 1000, price: 1450 },
    ],
    specs: [
      ["Материал", "Металл"],
      ["Объем", "500 мл"],
      ["Нанесение", "УФ-печать, гравировка"],
      ["Срок изготовления", "4-6 рабочих дней"],
      ["Минимальный тираж", "50 шт"],
    ],
    gallery: [
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-full", label: "Основной вид" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-angle", label: "Под углом" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-detail", label: "Логотип" },
    ],
    examples: [
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-angle", tone: "" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-full", tone: "is-dark" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-detail", tone: "is-metal" },
      { src: "assets/catalog-thermos.png", frame: "product-frame-thermos-angle", tone: "is-dark" },
    ],
  },
  bag: {
    trail: "Пакеты",
    title: "Пакет брендированный",
    description:
      "Плотный пакет с логотипом для премиальной упаковки подарков, презентационных материалов и сувенирных наборов.",
    colors: [
      { id: "black", label: "Черный", className: "is-black" },
      { id: "blue", label: "Синий", className: "is-blue" },
      { id: "silver", label: "Белый", className: "is-silver" },
    ],
    methods: [
      { id: "print", label: "Печать", icon: "print" },
      { id: "engraving", label: "Тиснение", icon: "engraving" },
    ],
    prices: [
      { qty: 50, price: 890 },
      { qty: 100, price: 840 },
      { qty: 300, price: 810 },
      { qty: 500, price: 790 },
      { qty: 1000, price: 740 },
    ],
    specs: [
      ["Материал", "Плотная бумага"],
      ["Ручки", "Шнуровые"],
      ["Нанесение", "УФ-печать, тиснение"],
      ["Срок изготовления", "4-6 рабочих дней"],
      ["Минимальный тираж", "50 шт"],
    ],
    gallery: [
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-front", label: "Основной вид" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-angle", label: "Под углом" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-detail", label: "Логотип" },
    ],
    examples: [
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-front", tone: "" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-angle", tone: "is-dark" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-detail", tone: "is-metal" },
      { src: "assets/catalog-bag.png", frame: "product-frame-bag-angle", tone: "" },
    ],
  },
};

function resolveProductPreset(params) {
  const title = normalize(params.get("title") || "");
  const slug = normalize(params.get("slug") || "");
  const key = `${title} ${slug}`;

  if (key.includes("термос")) {
    return "thermos";
  }

  if (key.includes("круж")) {
    return "mug";
  }

  if (key.includes("шоппер") || key.includes("пакет") || key.includes("ежедневник") || key.includes("худи")) {
    return "bag";
  }

  return "pen";
}

function initCatalogItemPage() {
  const page = document.querySelector("[data-product-page]");

  if (!page) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const presetKey = resolveProductPreset(params);
  const preset = productPagePresets[presetKey];
  const title = params.get("title") || preset.title;
  const trail = preset.trail;

  const titleNode = document.querySelector("[data-product-title]");
  const trailNode = document.querySelector("[data-product-trail]");
  const descriptionNode = document.querySelector("[data-product-description]");
  const priceNode = document.querySelector("[data-product-price]");
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
  trailNode.textContent = trail;
  descriptionNode.textContent = preset.description;

  const state = {
    color: preset.colors[0].id,
    method: preset.methods[0].id,
    quantity: 500,
    galleryIndex: 0,
  };

  const colorClassById = Object.fromEntries(preset.colors.map((color) => [color.id, color.className]));

  function getCurrentTier() {
    return preset.prices.find((tier) => state.quantity <= tier.qty) || preset.prices[preset.prices.length - 1];
  }

  function renderStage() {
    const item = preset.gallery[state.galleryIndex] || preset.gallery[0];
    const colorClass = colorClassById[state.color] || "is-black";

    stageImageNode.src = item.src;
    stageImageNode.alt = title;
    stageMediaNode.className = `product-stage-media ${item.frame} ${colorClass}`;

    [...thumbnailsNode.querySelectorAll(".product-thumb")].forEach((button, index) => {
      const isActive = index === state.galleryIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));

      const media = button.querySelector(".product-thumb-media");
      if (media) {
        media.className = `product-thumb-media ${preset.gallery[index].frame} ${colorClass}`;
      }
    });
  }

  function renderColors() {
    colorsNode.innerHTML = preset.colors
      .map((color) => {
        const activeClass = color.id === state.color ? "is-active" : "";
        return `
          <button
            type="button"
            class="product-option-button ${activeClass}"
            data-color-id="${color.id}"
            aria-pressed="${String(color.id === state.color)}"
          >
            <span class="product-color-swatch ${color.className}"></span>
            ${color.label}
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
            data-method-id="${method.id}"
            aria-pressed="${String(method.id === state.method)}"
          >
            <span class="product-method-icon ${iconClass}"></span>
            ${method.label}
          </button>
        `;
      })
      .join("");
  }

  function renderPriceTable() {
    const currentTier = getCurrentTier();
    priceNode.textContent = new Intl.NumberFormat("ru-RU").format(currentTier.price);
    quantityInput.value = String(state.quantity);

    priceTableNode.innerHTML = preset.prices
      .map((tier) => {
        const activeClass = tier.qty === currentTier.qty ? "is-active" : "";
        return `
          <button
            type="button"
            class="product-price-row ${activeClass}"
            data-tier-qty="${tier.qty}"
            aria-pressed="${String(tier.qty === currentTier.qty)}"
          >
            <span>${tier.qty} шт</span>
            <span>${formatBelPrice(tier.price)}</span>
          </button>
        `;
      })
      .join("");
  }

  function renderSpecs() {
    specsNode.innerHTML = preset.specs
      .map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`)
      .join("");
  }

  function renderExamples() {
    const colorClass = colorClassById[state.color] || "is-black";

    examplesNode.innerHTML = preset.examples
      .map((item) => {
        return `
          <article class="product-example-card ${item.tone}">
            <div class="product-example-media ${item.frame} ${colorClass}">
              <img src="${item.src}" alt="${title}" />
            </div>
          </article>
        `;
      })
      .join("");
  }

  function syncOrderComment() {
    if (!orderComment) {
      return;
    }

    const color = preset.colors.find((item) => item.id === state.color)?.label || "";
    const method = preset.methods.find((item) => item.id === state.method)?.label || "";
    orderComment.value = `${title}, цвет: ${color}, нанесение: ${method}, тираж: ${state.quantity} шт`;
  }

  function commitQuantityInput() {
    const parsed = Number(quantityInput.value.replace(/[^\d]/g, ""));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      quantityInput.value = String(state.quantity);
      return;
    }

    state.quantity = Math.max(50, Math.min(1000, parsed));
  }

  function syncOrderTrigger() {
    if (!orderTrigger) {
      return;
    }

    const color = preset.colors.find((item) => item.id === state.color)?.label || "";
    const method = preset.methods.find((item) => item.id === state.method)?.label || "";
    const currentTier = getCurrentTier();
    const currentGallery = preset.gallery[state.galleryIndex] || preset.gallery[0];
    const total = currentTier.price * state.quantity;

    orderTrigger.dataset.orderTitle = title;
    orderTrigger.dataset.orderImage = currentGallery.src;
    orderTrigger.dataset.orderImageFrame = currentGallery.frame;
    orderTrigger.dataset.orderColorClass = colorClassById[state.color] || "is-black";
    orderTrigger.dataset.orderOptions = `${color} корпус • ${method} • ${state.quantity} шт`;
    orderTrigger.dataset.orderUnit = `${formatBelPrice(currentTier.price)} / шт`;
    orderTrigger.dataset.orderTotal = formatBelPrice(total);
  }

  function renderPage() {
    renderColors();
    renderMethods();
    renderStage();
    renderPriceTable();
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

  document.querySelectorAll("[data-qty-change]").forEach((button) => {
    button.addEventListener("click", () => {
      commitQuantityInput();
      const nextValue = state.quantity + Number(button.dataset.qtyChange || 0);
      state.quantity = Math.max(50, Math.min(1000, nextValue));
      renderPriceTable();
      syncOrderComment();
      syncOrderTrigger();
    });
  });

  quantityInput.addEventListener("change", () => {
    commitQuantityInput();
    renderPriceTable();
    syncOrderComment();
    syncOrderTrigger();
  });

  priceTableNode.addEventListener("click", (event) => {
    const target = event.target.closest("[data-tier-qty]");
    if (!target) {
      return;
    }

    state.quantity = Number(target.dataset.tierQty || state.quantity);
    renderPriceTable();
    syncOrderComment();
    syncOrderTrigger();
  });

  orderTrigger?.addEventListener("click", () => {
    commitQuantityInput();
    renderPriceTable();
    syncOrderComment();
    syncOrderTrigger();
  }, { capture: true });

  renderPage();
}

initHomeSearch();
initOrderModal();
initSouvenirsCatalog();
initCatalogItemPage();
