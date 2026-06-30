(() => {
  const rawServices = [
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Картонные коробки и пакеты для упаковки" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Печать флагов, вымпелов, знамен" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Печать на ткани" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "УФ печать" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Ручки с логотипом" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Ежедневники и планинги с логотипом" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Брелоки с логотипом" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Печать на магнитах" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Сувенирные настенные часы с логотипом компании" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Тканевые, баннерные и бумажные флажки" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Фирменные бумажные пакеты с логотипом" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Полиэтиленовые пакеты с логотипом" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Флешки с логотипом" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Зажигалки с логотипом" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Подарочные наборы" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Печать на кружках" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Коврики для мыши с печатью логотипа" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Печать на тарелках" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Печать логотипов на пазлах" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Кепки с логотипом" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Печать на тканевых сумках" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Подставки под кружку" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Зеркала карманные" },
    { kind: "Сувениры", section: "Сувенирная продукция / упаковка", title: "Сувениры для медработников" },
    { kind: "Полиграфия", section: "Печать и изготовление календарей", title: "Настольные календари-домики" },
    { kind: "Полиграфия", section: "Печать и изготовление календарей", title: "Перекидные настенные календари" },
    { kind: "Полиграфия", section: "Печать и изготовление календарей", title: "Квартальные календари" },
    { kind: "Полиграфия", section: "Печать и изготовление календарей", title: "Карманные календари" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Карточки с номером телефона для машин" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Фирменные конверты с логотипом" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Магниты и блоки для записи" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать и изготовление фирменных папок" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Рассадки и пригласительные на свадьбу" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Блоки для записей, куб-блоки" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать ценников" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Изготовление бирок и ярлыков" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать сертификатов, дипломов, благодарностей" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Раздаточные материалы" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Гарантийные талоны" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать инструкций" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать и изготовление пропусков" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Разработка и печать прайс-листов" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать фирменных бланков" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать рекламных плакатов и афиш" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать пригласительных и входных билетов" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Изготовление и печать открыток" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Изготовление и печать блокнотов с логотипом" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать меню" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать каталогов" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать брошюр" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать флаеров" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Дизайн полиграфии" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Рекламные буклеты: печать, изготовление и дизайн" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Печать рекламных листовок" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Дисконтные карты" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Изготовление и печать визиток" },
    { kind: "Полиграфия", section: "Полиграфия", title: "Изготовление и печать бейджей" },
    { kind: "Полиграфия", section: "Декор интерьера", title: "Изготовление фотообоев на заказ" },
    { kind: "Полиграфия", section: "Декор интерьера", title: "Матирование стекла пленкой с эффектом «иней»" },
    { kind: "Полиграфия", section: "Декор интерьера", title: "Печать на холсте репродукций картин и фотографий" },
    { kind: "Полиграфия", section: "Декор интерьера", title: "Печать фотографий большого формата" },
    { kind: "Полиграфия", section: "Декор интерьера", title: "Декоративные наклейки на стены и мебель, стикеры на холодильник" },
    { kind: "Полиграфия", section: "Декор интерьера", title: "Трафареты для декора" },
    { kind: "Полиграфия", section: "Декор интерьера", title: "Печать постеров и плакатов большого формата" },
    { kind: "Полиграфия", section: "Декор интерьера", title: "Скинали для кухни" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Комплексное оформление магазина / рекламное оформление торгового зала" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Информационные и рекламные указатели, навигация в торговом зале" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "POS-материалы" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Подставки под товары из оргстекла" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Подставки под полиграфическую продукцию из оргстекла" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Ценникодержатели из пластика и оргстекла" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Рекламные воблеры" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Печать шелфтокеров" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Хенгеры: изготовление и печать" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Ростовые фигуры, хардпостеры, тантамарески" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Муляжи продуктов" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Изготовление рекламных мобайлов" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Рекламные стопперы" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Акриловые панели" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Гардеробные номерки, бирки и номерки для ключей" },
    { kind: "Полиграфия", section: "Оформление мест продаж", title: "Изготовление торговой атрибутики" },
    { kind: "Полиграфия", section: "Мобильное рекламное оборудование", title: "Мобильные баннеры" },
    { kind: "Полиграфия", section: "Мобильное рекламное оборудование", title: "Изготовление промо-стоек и промо-столов" },
    { kind: "Полиграфия", section: "Мобильное рекламное оборудование", title: "Fold-up стенды-ширмы" },
    { kind: "Полиграфия", section: "Мобильное рекламное оборудование", title: "Буклетницы напольные и стойки для буклетов" },
    { kind: "Полиграфия", section: "Мобильное рекламное оборудование", title: "Roll up стенды" },
    { kind: "Полиграфия", section: "Мобильное рекламное оборудование", title: "Pop up стенды" },
    { kind: "Полиграфия", section: "Наружная реклама", title: "Изготовление фасадных табличек и информационных указателей" },
    { kind: "Полиграфия", section: "Наружная реклама", title: "Изготовление наружных рекламных вывесок" },
    { kind: "Полиграфия", section: "Наружная реклама", title: "Световые короба / лайтбоксы" },
    { kind: "Полиграфия", section: "Наружная реклама", title: "Изготовление световых объемных букв" },
    { kind: "Полиграфия", section: "Наружная реклама", title: "Рекламные штендеры" },
    { kind: "Полиграфия", section: "Наружная реклама", title: "Изготовление рекламных пилонов" },
    { kind: "Полиграфия", section: "Наружная реклама", title: "Оформление витрин магазинов, реклама на витринах" },
    { kind: "Полиграфия", section: "Наружная реклама", title: "Оформление паспорта наружной рекламы" },
    { kind: "Полиграфия", section: "Широкоформатная печать", title: "Печать баннеров" },
    { kind: "Полиграфия", section: "Широкоформатная печать", title: "Рекламные баннеры-растяжки" },
    { kind: "Полиграфия", section: "Широкоформатная печать", title: "Строительная сетка для ограждения" },
    { kind: "Полиграфия", section: "Широкоформатная печать", title: "Пресс-волл / брендволл / пресс-стена / фоны / декорации" },
    { kind: "Полиграфия", section: "Самоклеющаяся продукция", title: "Изготовление и печать наклеек на самоклеющейся пленке" },
    { kind: "Полиграфия", section: "Самоклеющаяся продукция", title: "Печать наклеек из самоклеящейся бумаги" },
    { kind: "Полиграфия", section: "Самоклеющаяся продукция", title: "Самоклеящиеся этикетки" },
    { kind: "Полиграфия", section: "Самоклеющаяся продукция", title: "Плоттерные наклейки" },
    { kind: "Полиграфия", section: "Самоклеющаяся продукция", title: "Гарантийные пломбы печатные" },
    { kind: "Полиграфия", section: "Самоклеющаяся продукция", title: "Изготовление знаков безопасности" },
    { kind: "Полиграфия", section: "Самоклеющаяся продукция", title: "Напольные наклейки" },
    { kind: "Полиграфия", section: "Самоклеющаяся продукция", title: "Самоклеящиеся трафареты" },
    { kind: "Полиграфия", section: "Самоклеющаяся продукция", title: "Услуги плоттерной резки" },
    { kind: "Полиграфия", section: "Навигация", title: "Информационные стенды" },
    { kind: "Полиграфия", section: "Навигация", title: "Вывески и таблички для кабинетов / офисные таблички" },
    { kind: "Полиграфия", section: "Оформление выставок", title: "Спецпредложение «Выставка под ключ»" },
    { kind: "Полиграфия", section: "Оформление выставок", title: "Мобильные выставочные конструкции для стендов" },
    { kind: "Полиграфия", section: "Оформление выставок", title: "Дизайн и проектирование выставочных стендов" },
    { kind: "Полиграфия", section: "Оформление выставок", title: "Оформление и оклейка выставочных стендов графикой" },
    { kind: "Полиграфия", section: "Реклама на транспорте", title: "Наклейки на авто" },
  ];

  const catalogConfigs = {
    souvenirs: {
      label: "Сувениры",
      heroTitle: "Сувениры",
      heroDescription: "Все услуги по сувенирной продукции и упаковке в одном каталоге",
      allLabel: "Все сувениры",
      pagePath: "souvenirs.html",
      searchPlaceholder: "Поиск сувениров",
      downloadHref: "assets/comint-souvenirs-catalog.pdf",
      downloadLabel: "Скачать каталог",
    },
    print: {
      label: "Полиграфия",
      heroTitle: "Полиграфия",
      heroDescription: "Все услуги по печати, рекламе и оформлению в одном каталоге",
      allLabel: "Вся полиграфия",
      pagePath: "polygraphy.html",
      searchPlaceholder: "Поиск услуг полиграфии",
      downloadHref: "",
      downloadLabel: "",
    },
  };

  const sortLabels = {
    popular: "Сначала основные",
    name: "По названию",
    section: "По разделу",
  };

  const translitMap = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  function normalize(value) {
    return value.trim().toLowerCase();
  }

  function includesAny(value, variants) {
    return variants.some((variant) => value.includes(variant));
  }

  function slugify(value) {
    const transliterated = normalize(value)
      .split("")
      .map((char) => translitMap[char] ?? char)
      .join("");

    return transliterated
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
  }

  function inferImage(catalogKind, title, section) {
    const haystack = normalize(`${title} ${section}`);

    if (catalogKind === "souvenirs") {
      if (includesAny(haystack, ["круж", "тарел", "подставк"])) {
        return "assets/souvenir-mug.png";
      }

      if (includesAny(haystack, ["ручк", "зажигал"])) {
        return "assets/souvenir-pen.png";
      }

      if (includesAny(haystack, ["брелок"])) {
        return "assets/souvenir-keychain.png";
      }

      if (includesAny(haystack, ["ежеднев", "планинг"])) {
        return "assets/souvenir-diary.png";
      }

      if (includesAny(haystack, ["флеш", "мыш", "магнит", "пазл", "зеркал"])) {
        return "assets/souvenir-powerbank.png";
      }

      if (includesAny(haystack, ["пакет", "сумк", "короб", "упаков", "флаг", "ткан", "кепк"])) {
        return "assets/souvenir-shopper.png";
      }

      if (includesAny(haystack, ["подароч", "медработ"])) {
        return "assets/souvenir-hoodie.png";
      }

      return "assets/souvenir-thermos.png";
    }

    if (includesAny(haystack, ["баннер", "press", "пресс", "roll up", "pop up", "стенд", "витрин", "вывес", "лайтбокс", "штендер", "пилон"])) {
      return "assets/hero-products.png";
    }

    if (includesAny(haystack, ["накле", "этикет", "пломб", "плоттер", "авто"])) {
      return "assets/service-print.png";
    }

    if (includesAny(haystack, ["визит", "буклет", "брошюр", "листов", "флаер", "каталог", "меню", "блокнот", "календар", "бейдж", "билет", "конверт"])) {
      return "assets/result-business-cards.png";
    }

    return "assets/service-print.png";
  }

  function inferPresetKey(catalogKind, title, section) {
    const haystack = normalize(`${title} ${section}`);

    if (catalogKind === "souvenirs") {
      if (includesAny(haystack, ["круж", "тарел", "подставк"])) {
        return "mug";
      }

      if (includesAny(haystack, ["термос", "флеш", "мыш", "магнит", "пазл", "зеркал"])) {
        return "thermos";
      }

      if (includesAny(haystack, ["ручк", "брелок", "зажигал"])) {
        return "pen";
      }

      return "bag";
    }

    if (includesAny(haystack, ["накле", "этикет", "пломб", "трафарет", "плоттер", "авто"])) {
      return "print-sticker";
    }

    if (includesAny(haystack, ["вывес", "таблич", "стенд", "указател", "навигац"])) {
      return "print-sign";
    }

    if (includesAny(haystack, ["баннер", "roll up", "pop up", "стенд", "витрин", "лайтбокс", "штендер", "пилон", "выставк", "мобайл"])) {
      return "print-display";
    }

    return "print-flat";
  }

  function buildLead(catalogKind, title, section) {
    if (catalogKind === "souvenirs") {
      return `${title} с фирменным нанесением для подарков, промо-акций и корпоративных наборов. Подберем основу, нанесение и тираж под вашу задачу.`;
    }

    return `${title} в разделе «${section}». Подберем материал, формат, технологию изготовления и подготовим решение под нужный тираж и сроки.`;
  }

  const services = rawServices.map((row, index) => {
    const catalogKind = row.kind === "Сувениры" ? "souvenirs" : "print";
    return {
      id: `${catalogKind}-${index + 1}`,
      slug: slugify(row.title),
      title: row.title,
      section: row.section,
      sectionId: slugify(row.section),
      catalogKind,
      label: catalogConfigs[catalogKind].label,
      image: inferImage(catalogKind, row.title, row.section),
      presetKey: inferPresetKey(catalogKind, row.title, row.section),
      estimateLabel: "Расчет по запросу",
      lead: buildLead(catalogKind, row.title, row.section),
      popularity: rawServices.length - index,
    };
  });

  function getCatalog(kind) {
    const config = catalogConfigs[kind];
    if (!config) {
      return null;
    }

    const items = services.filter((item) => item.catalogKind === kind);
    const sectionCounts = items.reduce((acc, item) => {
      acc[item.section] = (acc[item.section] || 0) + 1;
      return acc;
    }, {});

    const categories = [
      { id: "all", label: config.allLabel, count: items.length },
      ...Object.entries(sectionCounts)
        .sort((left, right) => left[0].localeCompare(right[0], "ru"))
        .map(([label, count]) => ({
          id: slugify(label),
          label,
          count,
        })),
    ];

    return {
      ...config,
      kind,
      items,
      categories,
    };
  }

  function findService({ slug = "", title = "", kind = "" } = {}) {
    const normalizedSlug = normalize(slug);
    const normalizedTitle = normalize(title);

    return (
      services.find((item) => item.catalogKind === kind && item.slug === normalizedSlug) ||
      services.find((item) => item.catalogKind === kind && normalize(item.title) === normalizedTitle) ||
      services.find((item) => item.slug === normalizedSlug) ||
      services.find((item) => normalize(item.title) === normalizedTitle) ||
      null
    );
  }

  function search(query) {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return null;
    }

    return (
      services.find((item) => normalize(item.title).includes(normalizedQuery)) ||
      services.find((item) => normalize(`${item.title} ${item.section}`).includes(normalizedQuery)) ||
      null
    );
  }

  window.ComintCatalogData = {
    services,
    sortLabels,
    catalogConfigs,
    getCatalog,
    findService,
    search,
    slugify,
  };
})();
