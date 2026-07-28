const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "templates", "legacy-content-page.ejs");
const siteUrl = "https://comint.by";
const currentLastModified = "2026-07-27";
const template = fs.readFileSync(templatePath, "utf8");
const postsAudit = require(path.join(root, "seo-migration", "legacy-posts.json"));
const pagesAudit = require(path.join(root, "seo-migration", "legacy-pages.json"));
const categoriesAudit = require(path.join(root, "seo-migration", "legacy-categories.json"));
const productsAudit = require(path.join(root, "seo-migration", "legacy-products.json"));
const sitemapInventory = require(path.join(root, "seo-migration", "legacy-sitemap-inventory.json"));
const migrationMap = require(path.join(root, "seo-migration", "migration-map.json"));

global.window = {};
require(path.join(root, "catalog-data.js"));

const { services } = global.window.ComintCatalogData;
const servicesBySlug = new Map(services.map((service) => [service.slug, service]));
const productsById = new Map(productsAudit.products.map((product) => [product.id, product]));
const indexablePathsByType = new Map();

for (const entry of sitemapInventory.entries) {
  const paths = indexablePathsByType.get(entry.type) || new Set();
  paths.add(entry.path);
  indexablePathsByType.set(entry.type, paths);
}

const functionalPagePaths = new Set(["/cart/", "/checkout/", "/my-account/", "/shop/"]);
const canonicalCatalogSources = new Map([
  ["/cifrovaya-pechat/", "polygraphy.html"],
  ["/suveniryi/", "souvenirs.html"],
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeLegacyHtml(value) {
  return String(value || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s+(?:style|class|id)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /href=(["'])https?:\/\/(?:www\.)?comint\.by(\/[^"']*)\1/gi,
      (_, quote, pathname) => `href=${quote}${pathname}${quote}`,
    )
    .replace(
      /src=(["'])https?:\/\/(?:www\.)?comint\.by(\/[^"']*)\1/gi,
      (_, quote, pathname) => `src=${quote}${pathname}${quote}`,
    );
}

function robotsContent(item) {
  const robots = item?.seo?.robots || {};
  return [
    robots.index || "index",
    robots.follow || "follow",
    robots["max-image-preview"] || "max-image-preview:large",
    robots["max-snippet"] || "max-snippet:-1",
    robots["max-video-preview"] || "max-video-preview:-1",
  ]
    .filter(Boolean)
    .join(",");
}

function descriptionFor(item, fallback) {
  const source =
    item?.seo?.description ||
    item?.seo?.openGraph?.description ||
    item?.content?.text ||
    fallback;
  const text = stripHtml(source);

  if (text.length <= 180) {
    return text;
  }

  const shortened = text.slice(0, 177);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 120 ? lastSpace : 177).replace(/[.,;:!?—-]+$/u, "")}.`;
}

function buildSeoHead(item, options) {
  const canonical = `${siteUrl}${item.legacyPath}`;
  const title = item.seo?.title || `${item.title} | COMINT`;
  const description = descriptionFor(item, options.fallbackDescription);
  const openGraph = item.seo?.openGraph || {};
  const image =
    openGraph.images?.[0]?.url ||
    options.image ||
    `${siteUrl}/assets/hero-products.png`;
  const graphType = options.schemaType || "WebPage";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": graphType,
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: "ru-BY",
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
        about: {
          "@id": `${siteUrl}/#organization`,
        },
        ...(graphType === "BlogPosting"
          ? {
              headline: item.title,
              datePublished: item.date || undefined,
              dateModified: item.modified || undefined,
              image,
              author: {
                "@id": `${siteUrl}/#organization`,
              },
              publisher: {
                "@id": `${siteUrl}/#organization`,
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumbs`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Главная",
            item: `${siteUrl}/`,
          },
          ...(options.breadcrumbParent
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: options.breadcrumbParent.label,
                  item: `${siteUrl}${options.breadcrumbParent.href}`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: options.breadcrumbParent ? 3 : 2,
            name: item.title,
            item: canonical,
          },
        ],
      },
    ],
  };
  const jsonLd = JSON.stringify(structuredData, null, 2).replace(/</g, "\\u003c");

  return `    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${escapeHtml(robotsContent(item))}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:locale" content="${escapeHtml(openGraph.locale || "ru_BY")}" />
    <meta property="og:type" content="${escapeHtml(openGraph.type || (graphType === "BlogPosting" ? "article" : "website"))}" />
    <meta property="og:site_name" content="COMINT" />
    <meta property="og:title" content="${escapeHtml(openGraph.title || title)}" />
    <meta property="og:description" content="${escapeHtml(openGraph.description || description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="${escapeHtml(item.seo?.twitterCard || "summary_large_image")}" />
    <meta name="twitter:title" content="${escapeHtml(openGraph.title || title)}" />
    <meta name="twitter:description" content="${escapeHtml(openGraph.description || description)}" />
    <meta name="twitter:image" content="${image}" />
    <script type="application/ld+json">
${jsonLd
  .split("\n")
  .map((line) => `      ${line}`)
  .join("\n")}
    </script>`;
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-BY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Minsk",
  }).format(new Date(value));
}

function renderLegacyPage(item, options = {}) {
  const breadcrumbParent = options.breadcrumbParent || null;
  const contentHtml =
    options.contentHtml ||
    sanitizeLegacyHtml(item.content?.html) ||
    `<p>${escapeHtml(options.emptyCopy || "Информация со старого сайта сохранена. Для уточнения деталей свяжитесь с COMINT.")}</p>`;
  const lead = options.lead || descriptionFor(item, options.fallbackDescription || "");

  return ejs.render(
    template,
    {
      seoHead: buildSeoHead(item, {
        fallbackDescription:
          options.fallbackDescription || `${item.title}: информация компании COMINT в Минске.`,
        image: options.image,
        schemaType: options.schemaType,
        breadcrumbParent,
      }),
      activeSection: options.activeSection || "",
      bodyClass: options.bodyClass || "",
      breadcrumbParent,
      title: item.title,
      eyebrow: options.eyebrow || "COMINT",
      lead,
      dateText: options.showDate ? formatDate(item.date) : "",
      dateIso: item.date || "",
      contentHtml,
    },
    {
      filename: templatePath,
    },
  );
}

function writeLegacyPath(legacyPath, source) {
  const relativeDirectory = legacyPath.replace(/^\/|\/$/g, "");
  const directory = path.join(root, relativeDirectory);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "index.html"), source.replace(/[ \t]+$/gm, ""));
}

function fallbackPageContent(page) {
  const fallbacks = {
    "/contacts/": `<h2>Связаться с COMINT</h2>
<p>Телефоны: <a href="tel:+375293929004">+375293929004</a> и <a href="tel:+375297007767">+375 29 700-77-67</a> (МТС).</p>
<p>Электронная почта: <a href="mailto:zakaz@comint.by">zakaz@comint.by</a>.</p>
<p>Адрес: 220125, Минск, проспект Независимости, 185, офис 28/1.</p>`,
    "/cases/": `<h2>Примеры работ COMINT</h2>
<p>Посмотрите фотографии производства, оборудования и выполненных проектов на странице <a href="/company/#company-videos">о компании COMINT</a>.</p>`,
    "/reviews/": `<h2>Отзывы и обратная связь</h2>
<p>Мы ценим обратную связь клиентов. Чтобы запросить рекомендации или оставить отзыв о заказе, напишите на <a href="mailto:zakaz@comint.by">zakaz@comint.by</a>.</p>`,
  };

  return fallbacks[page.legacyPath] || "";
}

function buildCategoryCards(category) {
  const matchingMappings = migrationMap.mappings.filter((mapping) =>
    mapping.legacyPath.startsWith(category.legacyPath),
  );

  return `<div class="legacy-category-grid">
${matchingMappings
  .map((mapping) => {
    const service = servicesBySlug.get(mapping.newServiceSlug);
    return `  <a class="legacy-category-card" href="${mapping.legacyPath}">
    <img src="/${escapeHtml(service.image.replace(/^\/+/, ""))}" alt="" loading="lazy" />
    <span>${escapeHtml(service.title)}</span>
  </a>`;
  })
  .join("\n")}
</div>`;
}

function buildNewsArchive(posts) {
  const sortedPosts = posts
    .slice()
    .sort((left, right) => String(right.date).localeCompare(String(left.date)));
  const [featuredPost, ...archivePosts] = sortedPosts;

  if (!featuredPost) {
    return `<p class="legacy-news-empty">Публикации скоро появятся.</p>`;
  }

  const featuredImage = featuredPost.seo?.openGraph?.images?.[0]?.url;
  const featuredDescription = descriptionFor(
    featuredPost,
    "Полезные материалы, новости производства и проекты COMINT.",
  );

  return `<section class="legacy-news-featured" aria-labelledby="featured-news-title">
  <a class="legacy-news-featured-card" href="${featuredPost.legacyPath}">
    <div class="legacy-news-featured-media">
      ${featuredImage ? `<img src="${escapeHtml(new URL(featuredImage).pathname)}" alt="" loading="eager" />` : '<span aria-hidden="true">COMINT</span>'}
    </div>
    <div class="legacy-news-featured-copy">
      <span>Свежая публикация · ${escapeHtml(formatDate(featuredPost.date))}</span>
      <h2 id="featured-news-title">${escapeHtml(featuredPost.title)}</h2>
      <p>${escapeHtml(featuredDescription)}</p>
      <strong>Читать статью <span aria-hidden="true">→</span></strong>
    </div>
  </a>
</section>
<div class="legacy-news-overview">
  <div>
    <span>Архив COMINT</span>
    <h2>Все публикации</h2>
  </div>
  <strong>${sortedPosts.length} материала</strong>
</div>
<div class="legacy-news-grid">
${archivePosts
  .map((post) => {
    const image = post.seo?.openGraph?.images?.[0]?.url;
    return `  <a class="legacy-news-card" href="${post.legacyPath}">
    ${image ? `<img src="${escapeHtml(new URL(image).pathname)}" alt="" loading="lazy" />` : ""}
    <span>${escapeHtml(formatDate(post.date))}</span>
    <strong>${escapeHtml(post.title)}</strong>
  </a>`;
  })
  .join("\n")}
</div>`;
}

function writeDecisionFiles() {
  const pending = pagesAudit.pages.filter((page) => functionalPagePaths.has(page.legacyPath));
  const header = '"legacy_url","title","reason","recommended_decision"';
  const rows = pending.map(
    (page) =>
      `"${page.legacyUrl}","${String(page.title).replace(/"/g, '""')}","Функциональная страница WooCommerce без содержимого","Уточнить: интернет-магазин сохраняется или URL закрывается кодом 410"`,
  );
  fs.writeFileSync(
    path.join(root, "seo-migration", "functional-pages-requiring-decision.csv"),
    `${[header, ...rows].join("\n")}\n`,
  );
}

function sitemapImagesForPath(legacyPath) {
  const images = new Set();

  for (const entry of sitemapInventory.entries) {
    if (entry.path === legacyPath) {
      for (const image of entry.images) {
        images.add(image);
      }
    }
  }

  return [...images];
}

function buildSitemap(generatedPagePaths, generatedCategoryPaths) {
  const entries = new Map();

  function add(pathname, options = {}) {
    if (!entries.has(pathname)) {
      entries.set(pathname, {
        pathname,
        lastModified: options.lastModified || currentLastModified,
        images: options.images || sitemapImagesForPath(pathname),
        imageTitle: options.imageTitle || "",
      });
    }
  }

  add("/", {
    images: [`${siteUrl}/assets/hero-products.png`],
    imageTitle: "Типография COMINT в Минске",
  });
  add("/company/", {
    images: [`${siteUrl}/assets/hero-products.png`],
    imageTitle: "О компании COMINT",
  });

  for (const mapping of migrationMap.mappings) {
    const product = productsById.get(mapping.legacyProductId);
    add(mapping.legacyPath, {
      lastModified: product?.modified?.slice(0, 10) || currentLastModified,
      imageTitle: mapping.newServiceTitle,
    });
  }

  for (const categoryPath of generatedCategoryPaths) {
    add(categoryPath);
  }

  for (const post of postsAudit.posts) {
    add(post.legacyPath, {
      lastModified: post.modified?.slice(0, 10) || currentLastModified,
    });
  }

  for (const pagePath of generatedPagePaths) {
    add(pagePath);
  }

  const urls = [...entries.values()]
    .sort((left, right) => left.pathname.localeCompare(right.pathname))
    .map((entry) => {
      const imageXml = entry.images
        .map(
          (image) => `    <image:image>
      <image:loc>${escapeXml(image)}</image:loc>${entry.imageTitle ? `\n      <image:title>${escapeXml(entry.imageTitle)}</image:title>` : ""}
    </image:image>`,
        )
        .join("\n");
      return `  <url>
    <loc>${escapeXml(`${siteUrl}${entry.pathname}`)}</loc>
    <lastmod>${entry.lastModified}</lastmod>${imageXml ? `\n${imageXml}` : ""}
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>
${urls}
</urlset>
`;
}

function main() {
  const indexablePostPaths = indexablePathsByType.get("post") || new Set();
  const indexableCategoryPaths = indexablePathsByType.get("product_cat") || new Set();
  const indexablePagePaths = indexablePathsByType.get("page") || new Set();
  const generatedPagePaths = new Set();
  const generatedCategoryPaths = new Set();

  for (const post of postsAudit.posts) {
    if (!indexablePostPaths.has(post.legacyPath)) {
      continue;
    }

    writeLegacyPath(
      post.legacyPath,
      renderLegacyPage(post, {
        activeSection: "blog",
        bodyClass: "legacy-post-page",
        eyebrow: "Статья COMINT",
        schemaType: "BlogPosting",
        showDate: true,
        breadcrumbParent: {
          href: "/news/",
          label: "Блог",
        },
      }),
    );
  }

  for (const category of categoriesAudit.categories) {
    if (!indexableCategoryPaths.has(category.legacyPath)) {
      continue;
    }

    const canonicalCatalogSource = canonicalCatalogSources.get(category.legacyPath);
    if (canonicalCatalogSource) {
      writeLegacyPath(
        category.legacyPath,
        fs.readFileSync(path.join(root, canonicalCatalogSource), "utf8"),
      );
      generatedCategoryPaths.add(category.legacyPath);
      continue;
    }

    const cards = buildCategoryCards(category);
    writeLegacyPath(
      category.legacyPath,
      renderLegacyPage(category, {
        activeSection: category.legacyPath === "/suveniryi/" ? "souvenirs" : "print",
        bodyClass: "legacy-category-page",
        eyebrow: "Каталог услуг",
        contentHtml: `${sanitizeLegacyHtml(category.content.html)}${cards}`,
        lead:
          category.seo?.description ||
          `Услуги раздела «${category.title}» в Минске. Выберите направление, чтобы узнать подробности и отправить заявку.`,
      }),
    );
    generatedCategoryPaths.add(category.legacyPath);
  }

  for (const page of pagesAudit.pages) {
    if (
      page.legacyPath === "/" ||
      page.legacyPath === "/company/" ||
      page.legacyPath === "/news/" ||
      functionalPagePaths.has(page.legacyPath) ||
      !indexablePagePaths.has(page.legacyPath)
    ) {
      continue;
    }

    const fallback = fallbackPageContent(page);
    writeLegacyPath(
      page.legacyPath,
      renderLegacyPage(page, {
        bodyClass: "legacy-static-page",
        eyebrow: "Информация COMINT",
        contentHtml: sanitizeLegacyHtml(page.content.html) || fallback,
      }),
    );
    generatedPagePaths.add(page.legacyPath);
  }

  const newsPage = pagesAudit.pages.find((page) => page.legacyPath === "/news/");
  if (newsPage) {
    writeLegacyPath(
      "/news/",
      renderLegacyPage(newsPage, {
        activeSection: "blog",
        bodyClass: "legacy-news-page",
        eyebrow: "Блог COMINT",
        contentHtml: buildNewsArchive(postsAudit.posts),
        lead: "Статьи, кейсы, новости производства и полезные материалы о печати и рекламе.",
      }),
    );
    generatedPagePaths.add("/news/");
  }

  const companyDirectory = path.join(root, "company");
  fs.mkdirSync(companyDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(companyDirectory, "index.html"),
    fs.readFileSync(path.join(root, "company.html"), "utf8"),
  );

  generatedPagePaths.add("/company/");
  writeDecisionFiles();
  fs.writeFileSync(
    path.join(root, "sitemap.xml"),
    buildSitemap(generatedPagePaths, generatedCategoryPaths),
  );

  console.log(`Generated legacy posts: ${postsAudit.posts.length}.`);
  console.log(`Generated legacy categories: ${generatedCategoryPaths.size}.`);
  console.log(`Generated legacy static pages: ${generatedPagePaths.size}.`);
}

main();
