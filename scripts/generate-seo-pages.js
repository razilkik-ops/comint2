const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const templatePath = path.join(root, "catalog-item.html");
const servicesDirectory = path.join(root, "services");
const siteUrl = "https://comint.by";
const lastModified = "2026-07-27";
const { getServiceSeoContent } = require("./service-seo-content");
const { renderSharedLayout } = require("./render-shared-layout");
const legacyUrlMap = require(path.join(root, "legacy-url-map.js"));
const legacyAudit = require(path.join(root, "seo-migration", "legacy-products.json"));
const migrationMap = require(path.join(root, "seo-migration", "migration-map.json"));

global.window = {};
require(path.join(root, "catalog-data.js"));

const { services } = global.window.ComintCatalogData;
const template = fs.readFileSync(templatePath, "utf8");
const legacyProductsById = new Map(
  legacyAudit.products.map((product) => [product.id, product]),
);
const migrationsByServiceSlug = new Map(
  migrationMap.mappings.map((mapping) => [mapping.newServiceSlug, mapping]),
);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(value) {
  return escapeHtml(value).replace(/'/g, "&apos;");
}

function absoluteAssetUrl(value) {
  const assetPath = String(value || "").replace(/^\/+/, "");
  return `${siteUrl}/${assetPath}`;
}

function rootAssetPath(value) {
  return `/${String(value || "").replace(/^\/+/, "")}`;
}

function servicePath(service) {
  return legacyUrlMap[service.slug] || `/services/${service.slug}`;
}

function buildDescription(service, legacyProduct) {
  if (legacyProduct?.seo?.description) {
    return legacyProduct.seo.description;
  }

  const content = getServiceSeoContent(service);
  const source = `${content.intro} Уточните стоимость и сроки в COMINT, Минск.`;

  if (source.length <= 175) {
    return source;
  }

  const shortened = source.slice(0, 172);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 120 ? lastSpace : 172).replace(/[.,;:!?—-]+$/u, "")}.`;
}

function buildRobotsContent(legacyProduct) {
  const robots = legacyProduct?.seo?.robots || {};
  const directives = [
    robots.index || "index",
    robots.follow || "follow",
    robots["max-image-preview"] || "max-image-preview:large",
    robots["max-snippet"] || "max-snippet:-1",
    robots["max-video-preview"] || "max-video-preview:-1",
  ];

  return [...new Set(directives.filter(Boolean))].join(",");
}

function buildSeoBlock(service, legacyProduct, migration) {
  const canonicalPath = migration?.canonicalPath || servicePath(service);
  const canonical = `${siteUrl}${canonicalPath}`;
  const legacyImage = legacyProduct?.seo?.openGraph?.images?.[0]?.url;
  const image = legacyImage || absoluteAssetUrl(service.image);
  const title = legacyProduct?.seo?.title || `${service.title} в Минске | COMINT`;
  const description = buildDescription(service, legacyProduct);
  const openGraph = legacyProduct?.seo?.openGraph || {};
  const catalogUrl =
    service.catalogKind === "souvenirs"
      ? `${siteUrl}/suveniryi/`
      : `${siteUrl}/cifrovaya-pechat/`;
  const catalogName = service.catalogKind === "souvenirs" ? "Сувениры" : "Полиграфия";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${canonical}#service`,
        name: service.title,
        description,
        serviceType: service.title,
        image,
        url: canonical,
        areaServed: {
          "@type": "Country",
          name: "Беларусь",
        },
        provider: {
          "@id": `${siteUrl}/#organization`,
        },
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
          {
            "@type": "ListItem",
            position: 2,
            name: catalogName,
            item: catalogUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: service.title,
            item: canonical,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: title,
        description,
        inLanguage: "ru-BY",
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: image,
        },
        breadcrumb: {
          "@id": `${canonical}#breadcrumbs`,
        },
        mainEntity: {
          "@id": `${canonical}#service`,
        },
        isPartOf: {
          "@id": `${siteUrl}/#website`,
        },
      },
    ],
  };
  const jsonLd = JSON.stringify(structuredData, null, 2).replace(/</g, "\\u003c");
  const ogTitle = openGraph.title || title;
  const ogDescription = openGraph.description || description;
  const ogType = openGraph.type || "website";
  const ogLocale = openGraph.locale || "ru_BY";

  return `<!-- SEO:PRODUCT:START -->
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${escapeHtml(buildRobotsContent(legacyProduct))}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:locale" content="${escapeHtml(ogLocale)}" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:site_name" content="COMINT" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDescription)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:alt" content="${escapeHtml(service.title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
    <meta name="twitter:image" content="${image}" />
    <script type="application/ld+json">
${jsonLd
  .split("\n")
  .map((line) => `      ${line}`)
  .join("\n")}
    </script>
    <!-- SEO:PRODUCT:END -->`;
}

function getRelatedServices(service) {
  const related = [];
  const seen = new Set([service.slug]);
  const pools = [
    services.filter((item) => item.section === service.section),
    services.filter((item) => item.catalogKind === service.catalogKind && item.presetKey === service.presetKey),
    services.filter((item) => item.catalogKind === service.catalogKind),
  ];

  for (const pool of pools) {
    for (const item of pool) {
      if (seen.has(item.slug)) {
        continue;
      }

      related.push(item);
      seen.add(item.slug);

      if (related.length === 4) {
        return related;
      }
    }
  }

  return related;
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

function buildVisibleSeoContent(service, legacyProduct) {
  const content = getServiceSeoContent(service);
  const relatedServices = getRelatedServices(service);
  const sectionId = `service-details-${service.slug}`;
  const relatedId = `related-services-${service.slug}`;
  const relatedLinks = relatedServices
    .map(
      (item) => `          <a class="product-related-link" href="${servicePath(item)}">
            <span>${escapeHtml(item.section)}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <span class="product-related-arrow" aria-hidden="true">→</span>
          </a>`,
    )
    .join("\n");
  const hasLegacyContent = Boolean(legacyProduct?.content?.text);
  const legacyHtml = hasLegacyContent ? sanitizeLegacyHtml(legacyProduct.content.html) : "";
  const primaryContent = hasLegacyContent
    ? `<article class="legacy-seo-copy">
${legacyHtml}
        </article>`
    : `<div class="product-seo-heading">
          <span class="product-seo-eyebrow">Услуга COMINT в Минске</span>
          <h2 id="${sectionId}">${escapeHtml(service.title)}: детали заказа</h2>
          <p>${escapeHtml(content.intro)}</p>
        </div>

        <article class="legacy-seo-copy" aria-labelledby="${sectionId}">
          <ul>
${content.points.map((point) => `            <li>${escapeHtml(point)}</li>`).join("\n")}
          </ul>
        </article>`;

  return `<!-- SEO:CONTENT:START -->
      <section class="product-seo-content" ${hasLegacyContent ? `aria-label="${escapeHtml(service.title)}: подробности"` : `aria-labelledby="${sectionId}"`}>
        <span class="product-seo-eyebrow">Услуга COMINT в Минске</span>
${primaryContent}

        <div class="product-seo-grid product-seo-grid-single">
          <article class="product-seo-card product-seo-card-accent">
            <h3>Что подготовить для расчета</h3>
            <p>${escapeHtml(content.brief)}</p>
            <button type="button" class="product-seo-order" data-open-order-modal data-order-mode="product">
              Обсудить заказ
            </button>
          </article>
        </div>

        <nav class="product-related" aria-labelledby="${relatedId}">
          <h2 id="${relatedId}">Смотрите также</h2>
          <div class="product-related-grid">
${relatedLinks}
          </div>
        </nav>
      </section>
      <!-- SEO:CONTENT:END -->`;
}

function buildServicePage(service) {
  const migration = migrationsByServiceSlug.get(service.slug);
  const legacyProduct = migration
    ? legacyProductsById.get(migration.legacyProductId)
    : null;
  const imagePath = rootAssetPath(service.image);
  const catalogPath =
    service.catalogKind === "souvenirs" ? "/suveniryi/" : "/cifrovaya-pechat/";
  const catalogName = service.catalogKind === "souvenirs" ? "Сувениры" : "Полиграфия";
  const pageTitle = legacyProduct?.title || service.title;

  const page = template
    .replace(
      /<!-- SEO:PRODUCT:START -->[\s\S]*?<!-- SEO:PRODUCT:END -->/,
      buildSeoBlock(service, legacyProduct, migration),
    )
    .replace(
      /<!-- SEO:CONTENT:START -->[\s\S]*?<!-- SEO:CONTENT:END -->/,
      buildVisibleSeoContent(service, legacyProduct),
    )
    .replace(
      '<body class="product-page">',
      `<body class="product-page" data-service-kind="${service.catalogKind}" data-service-slug="${service.slug}">`,
    )
    .replace(/src="assets\//g, 'src="/assets/')
    .replace(/href="styles\.css/g, 'href="/styles.css')
    .replace(/src="legacy-url-map\.js"/g, 'src="/legacy-url-map.js"')
    .replace(/src="catalog-data\.js"/g, 'src="/catalog-data.js"')
    .replace(/src="script\.js/g, 'src="/script.js')
    .replace(
      '<a href="/souvenirs" data-product-catalog-link>Сувениры</a>',
      `<a href="${catalogPath}" data-product-catalog-link>${catalogName}</a>`,
    )
    .replace("<span data-product-trail>Ручки</span>", `<span data-product-trail>${escapeHtml(service.section)}</span>`)
    .replace(
      /<div class="product-stage-media[^"]*" data-product-stage-media>\s*<img[^>]+data-product-stage-image\s*\/>\s*<\/div>/,
      `<div class="product-stage-media product-frame-custom" data-product-stage-media>
              <img src="${imagePath}" alt="${escapeHtml(service.title)}" data-product-stage-image />
            </div>`,
    )
    .replace("<h1 data-product-title>Ручка металлическая</h1>", `<h1 data-product-title>${escapeHtml(pageTitle)}</h1>`)
    .replace(
      /<p class="product-description" data-product-description>[\s\S]*?<\/p>/,
      `<p class="product-description" data-product-description>${escapeHtml(service.lead)}</p>`,
    )
    .replace(
      '<dl class="product-specs" data-product-specs></dl>',
      `<dl class="product-specs" data-product-specs>
            <dt>Категория</dt><dd>${escapeHtml(service.label)}</dd>
            <dt>Раздел</dt><dd>${escapeHtml(service.section)}</dd>
          </dl>`,
    )
    .replace(
      /<img src="\/assets\/catalog-pen\.png" alt="" data-modal-order-image \/>/,
      `<img src="${imagePath}" alt="" data-modal-order-image />`,
    )
    .replace(
      "<strong data-modal-order-title>Ручка металлическая</strong>",
      `<strong data-modal-order-title>${escapeHtml(service.title)}</strong>`,
    );

  return renderSharedLayout(page, {
    activeSection: service.catalogKind,
    hasOrderModal: true,
  });
}

function buildSitemap() {
  const staticPages = [
    { path: "/", image: "/assets/hero-products.png", imageTitle: "Типография COMINT в Минске" },
    { path: "/company/", image: "/assets/hero-products.png", imageTitle: "О компании COMINT" },
  ];
  const entries = [
    ...staticPages,
    ...services.map((service) => ({
      path: servicePath(service),
      image: rootAssetPath(service.image),
      imageTitle: service.title,
    })),
  ];
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(`${siteUrl}${entry.path}`)}</loc>
    <lastmod>${lastModified}</lastmod>
    <image:image>
      <image:loc>${escapeXml(`${siteUrl}${entry.image}`)}</image:loc>
      <image:title>${escapeXml(entry.imageTitle)}</image:title>
    </image:image>
  </url>`,
    )
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

function buildRobotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /cloudflare-bot/
Disallow: /comint-cpanel-ready-privacy-cookies/
Disallow: /tmp-imagegen-logo/

Clean-param: utm_source&utm_medium&utm_campaign&utm_term&utm_content&gclid&yclid&from /
Host: comint.by
Sitemap: ${siteUrl}/sitemap.xml
`;
}

function renderMigrationRedirects() {
  const htaccessPath = path.join(root, ".htaccess");
  const startMarker = "# SEO:MIGRATION-REDIRECTS:START";
  const endMarker = "# SEO:MIGRATION-REDIRECTS:END";
  const redirects = migrationMap.mappings
    .map((mapping) => {
      const escapedSlug = mapping.newServiceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return `RewriteRule ^services/${escapedSlug}/?$ ${mapping.legacyPath} [R=301,L,NE]`;
    })
    .join("\n");
  const block = `${startMarker}\n${redirects}\n${endMarker}`;
  const source = fs.readFileSync(htaccessPath, "utf8");
  const expression = new RegExp(
    `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
  );

  if (!expression.test(source)) {
    throw new Error("В .htaccess отсутствуют маркеры SEO-редиректов.");
  }

  fs.writeFileSync(htaccessPath, source.replace(expression, block));
}

fs.mkdirSync(servicesDirectory, { recursive: true });

for (const service of services) {
  const page = buildServicePage(service);
  const migration = migrationsByServiceSlug.get(service.slug);
  fs.writeFileSync(path.join(servicesDirectory, `${service.slug}.html`), page);

  if (migration) {
    const legacyDirectory = path.join(root, migration.legacyPath.replace(/^\/|\/$/g, ""));
    fs.mkdirSync(legacyDirectory, { recursive: true });
    fs.writeFileSync(path.join(legacyDirectory, "index.html"), page);
  }
}

fs.writeFileSync(path.join(root, "sitemap.xml"), buildSitemap());
fs.writeFileSync(path.join(root, "robots.txt"), buildRobotsTxt());
renderMigrationRedirects();

console.log(`Generated ${services.length} service pages, sitemap.xml and robots.txt.`);
