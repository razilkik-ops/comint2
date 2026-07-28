const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const domain = "https://comint.by";
const testAddressPattern =
  /(?:razilkik-ops\.github\.io|github\.io\/comint2|^\/comint2(?:\/|$))/i;
const { getServiceSeoContent, serviceSeoContent } = require("./service-seo-content");
const migrationMap = require(path.join(root, "seo-migration", "migration-map.json"));
const legacyProductsAudit = require(path.join(root, "seo-migration", "legacy-products.json"));
const legacyPostsAudit = require(path.join(root, "seo-migration", "legacy-posts.json"));
const legacyPagesAudit = require(path.join(root, "seo-migration", "legacy-pages.json"));
const legacyCategoriesAudit = require(path.join(root, "seo-migration", "legacy-categories.json"));
const sitemapInventory = require(path.join(root, "seo-migration", "legacy-sitemap-inventory.json"));

global.window = {};
require(path.join(root, "catalog-data.js"));

const { services } = global.window.ComintCatalogData;
const errors = [];
const migrationsByServiceSlug = new Map(
  migrationMap.mappings.map((mapping) => [mapping.newServiceSlug, mapping]),
);
const legacyProductsById = new Map(
  legacyProductsAudit.products.map((product) => [product.id, product]),
);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSeoText(value) {
  return normalizeText(value)
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/[«»“”„]/g, '"')
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function listHtmlFiles(directory = root) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.name === ".git" ||
      entry.name === "node_modules" ||
      entry.name === ".github-pages" ||
      entry.name.startsWith("comint-cpanel-ready-")
    ) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listHtmlFiles(absolutePath));
    } else if (entry.name.endsWith(".html")) {
      files.push(path.relative(root, absolutePath));
    }
  }

  return files;
}

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function getMatches(source, expression) {
  return [...source.matchAll(expression)];
}

function validateJsonLd(source, label) {
  const scripts = getMatches(
    source,
    /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );

  assert(scripts.length > 0, `${label}: отсутствует JSON-LD`);

  for (const match of scripts) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${label}: невалидный JSON-LD (${error.message})`);
    }
  }
}

const indexablePages = [
  ["index.html", `${domain}/`],
  ["company/index.html", `${domain}/company/`],
];

for (const [file, canonical] of indexablePages) {
  const source = read(file);
  const titles = getMatches(source, /<title>([^<]+)<\/title>/g);
  const descriptions = getMatches(source, /<meta\s+name="description"\s+content="([^"]+)"\s*\/>/g);
  const canonicals = getMatches(source, /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/>/g);

  assert(titles.length === 1, `${file}: должен быть один title`);
  assert(descriptions.length === 1, `${file}: должен быть один meta description`);
  assert(canonicals.length === 1 && canonicals[0][1] === canonical, `${file}: неверный canonical`);
  assert(/<meta\s+name="robots"\s+content="index,follow/.test(source), `${file}: страница не разрешена к индексации`);
  assert(/<meta\s+property="og:title"/.test(source), `${file}: отсутствует Open Graph`);
  validateJsonLd(source, file);
}

const serviceUrls = new Set();
const contentSignatures = new Set();

for (const service of services) {
  const file = `services/${service.slug}.html`;
  const filePath = path.join(root, file);
  const migration = migrationsByServiceSlug.get(service.slug);
  const legacyProduct = migration
    ? legacyProductsById.get(migration.legacyProductId)
    : null;
  const canonical = migration ? `${domain}${migration.canonicalPath}` : "";
  const legacyFile = migration
    ? path.join(
        migration.legacyPath.replace(/^\/|\/$/g, ""),
        "index.html",
      )
    : "";
  const expectedImage = path.join(root, String(service.image).replace(/^\/+/, ""));

  assert(fs.existsSync(filePath), `${file}: файл не создан`);
  assert(fs.existsSync(expectedImage), `${file}: изображение услуги отсутствует`);
  assert(Boolean(migration), `${file}: отсутствует подтвержденное SEO-соответствие`);
  assert(Boolean(legacyProduct), `${file}: отсутствует архив старой услуги`);
  assert(
    Boolean(legacyFile) && fs.existsSync(path.join(root, legacyFile)),
    `${file}: страница на старом URL не создана`,
  );

  if (!fs.existsSync(filePath) || !migration || !legacyProduct) {
    continue;
  }

  const source = read(file);
  const legacySource = read(legacyFile);
  const content = getServiceSeoContent(service);
  const contentSignature = JSON.stringify(content);
  const visibleSeoBlock = source.match(/<!-- SEO:CONTENT:START -->([\s\S]*?)<!-- SEO:CONTENT:END -->/)?.[1] || "";
  const visibleSeoText = normalizeText(visibleSeoBlock);
  const relatedLinks = getMatches(visibleSeoBlock, /class="product-related-link"\s+href="([^"]+)"/g);
  const expectedTitle = legacyProduct.seo.title || `${service.title} в Минске | COMINT`;
  const expectedH1 = legacyProduct.title || service.title;

  assert(source.includes(`data-service-slug="${service.slug}"`), `${file}: отсутствует slug страницы`);
  assert(source.includes(`<h1 data-product-title>${escapeHtml(expectedH1)}</h1>`), `${file}: неверный H1`);
  assert(source.includes(`<title>${escapeHtml(expectedTitle)}</title>`), `${file}: не сохранен старый title`);
  assert(source.includes(`<link rel="canonical" href="${canonical}" />`), `${file}: неверный canonical`);
  assert(
    /<meta\s+name="description"\s+content="[^"]+"/.test(source),
    `${file}: отсутствует description`,
  );
  assert(/<meta\s+name="robots"\s+content="index,follow/.test(source), `${file}: страница не индексируется`);
  assert(content.intro.length >= 90, `${file}: вводный SEO-текст слишком короткий`);
  assert(content.brief.length >= 90, `${file}: текст для расчета слишком короткий`);
  assert(content.points.every((point) => point.length >= 20), `${file}: пункты SEO-текста слишком короткие`);
  assert(!contentSignatures.has(contentSignature), `${file}: SEO-текст полностью повторяет другую услугу`);
  assert(visibleSeoBlock.includes(content.brief), `${file}: текст для расчета не попал в HTML`);
  assert(visibleSeoBlock.includes("legacy-seo-copy"), `${file}: отсутствует блок перенесенного текста`);
  assert(
    legacyProduct.content.wordCount === 0 ||
      legacyProduct.content.headings.h2.every((heading) =>
        visibleSeoText.includes(normalizeText(heading)),
      ),
    `${file}: не все старые H2 перенесены`,
  );
  assert(
    legacyProduct.content.wordCount === 0 ||
      normalizeSeoText(visibleSeoBlock).includes(
        normalizeSeoText(legacyProduct.content.text),
      ),
    `${file}: старый текстовый контент услуги перенесен не полностью`,
  );
  assert(!/<section[^>]+data-product-seo-content[^>]+hidden/.test(visibleSeoBlock), `${file}: SEO-текст скрыт`);
  assert(relatedLinks.length === 4, `${file}: должно быть четыре связанные услуги`);
  assert(
    relatedLinks.every((match) => match[1] !== migration.legacyPath),
    `${file}: страница ссылается сама на себя в связанных услугах`,
  );
  assert(source === legacySource, `${file}: техническая и каноническая копии различаются`);
  validateJsonLd(source, file);
  contentSignatures.add(contentSignature);
  serviceUrls.add(canonical);
}

assert(
  Object.keys(serviceSeoContent).length === services.length,
  `SEO-тексты: ожидалось ${services.length}, найдено ${Object.keys(serviceSeoContent).length}`,
);

const sitemap = read("sitemap.xml");
const sitemapUrls = getMatches(sitemap, /<loc>([^<]+)<\/loc>/g).map((match) => match[1]);
const indexableCategoryPaths = new Set(
  sitemapInventory.entries
    .filter((entry) => entry.type === "product_cat")
    .map((entry) => entry.path),
);
const generatedLegacyPagePaths = new Set(
  legacyPagesAudit.pages
    .filter(
      (page) =>
        !["/", "/cart/", "/checkout/", "/my-account/", "/shop/"].includes(
          page.legacyPath,
        ),
    )
    .map((page) => page.legacyPath),
);
const expectedSitemapUrls = new Set([
  `${domain}/`,
  `${domain}/company/`,
  ...migrationMap.mappings.map((mapping) => `${domain}${mapping.legacyPath}`),
  ...legacyPostsAudit.posts.map((post) => `${domain}${post.legacyPath}`),
  ...[...indexableCategoryPaths].map((categoryPath) => `${domain}${categoryPath}`),
  ...[...generatedLegacyPagePaths].map((pagePath) => `${domain}${pagePath}`),
]);
const expectedSitemapCount = expectedSitemapUrls.size;

assert(sitemapUrls.length === expectedSitemapCount, `sitemap.xml: ожидалось ${expectedSitemapCount} URL, найдено ${sitemapUrls.length}`);
assert(new Set(sitemapUrls).size === sitemapUrls.length, "sitemap.xml: есть повторяющиеся URL");
assert(
  sitemapUrls.every((url) => {
    try {
      return new URL(url).origin === domain;
    } catch {
      return false;
    }
  }),
  "sitemap.xml: найден URL другого домена",
);
assert(
  !testAddressPattern.test(sitemap),
  "sitemap.xml: найдена ссылка на тестовый адрес",
);
assert(sitemapUrls.every((url) => !url.includes("?") && !url.endsWith(".html")), "sitemap.xml: найден неканонический URL");

for (const url of serviceUrls) {
  assert(sitemapUrls.includes(url), `sitemap.xml: отсутствует ${url}`);
}

for (const url of expectedSitemapUrls) {
  assert(sitemapUrls.includes(url), `sitemap.xml: отсутствует ${url}`);
}

for (const url of sitemapUrls) {
  const pathname = new URL(url).pathname;
  const file =
    pathname === "/"
      ? "index.html"
      : path.join(pathname.replace(/^\/|\/$/g, ""), "index.html");
  const filePath = path.join(root, file);

  assert(fs.existsSync(filePath), `${file}: URL из sitemap не имеет HTML-файла`);
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const source = read(file);
  const canonicals = getMatches(
    source,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/gi,
  );
  assert(
    canonicals.length === 1 && canonicals[0][1] === url,
    `${file}: canonical не совпадает с URL в sitemap`,
  );
  assert(/<title>[^<]+<\/title>/i.test(source), `${file}: отсутствует title`);
  assert(/<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/i.test(source), `${file}: отсутствует H1`);
  assert(
    /<meta\s+name=["']description["']\s+content=["'][^"']+["']/i.test(source),
    `${file}: отсутствует meta description`,
  );
  assert(
    /<meta\s+name=["']robots["']\s+content=["']index,follow/i.test(source),
    `${file}: URL из sitemap не разрешен к индексации`,
  );
}

const canonicalCatalogPages = [
  {
    file: "cifrovaya-pechat/index.html",
    canonical: `${domain}/cifrovaya-pechat/`,
    title: 'Цифровая печать | Оперативная полиграфия в Минске в типографии "Коминт"',
    visibleLabel: "Цифровая печать",
    kind: "print",
  },
  {
    file: "suveniryi/index.html",
    canonical: `${domain}/suveniryi/`,
    title: "Сувенирная продукция с логотипом изготовление в Минске",
    visibleLabel: "Сувениры",
    kind: "souvenirs",
  },
];

for (const catalogPage of canonicalCatalogPages) {
  const source = read(catalogPage.file);
  assert(
    source.includes(`class="souvenirs-page catalog-page" data-catalog-kind="${catalogPage.kind}"`),
    `${catalogPage.file}: канонический URL потерял новый дизайн каталога`,
  );
  assert(
    source.includes("data-category-list") &&
      source.includes("data-catalog-search") &&
      source.includes("data-catalog-grid") &&
      source.includes("data-catalog-pagination"),
    `${catalogPage.file}: отсутствуют интерактивные элементы каталога`,
  );
  assert(
    source.includes(`<title>${catalogPage.title}</title>`),
    `${catalogPage.file}: не сохранен старый SEO title`,
  );
  assert(
    source.includes(`<link rel="canonical" href="${catalogPage.canonical}" />`),
    `${catalogPage.file}: неверный canonical`,
  );
  assert(
    source.includes(`<h1 data-catalog-title>${catalogPage.visibleLabel}</h1>`),
    `${catalogPage.file}: неверное видимое название каталога`,
  );
  assert(
    !/href="\/(?:polygraphy|souvenirs)(?:\/|["#])/.test(source),
    `${catalogPage.file}: осталась устаревшая внутренняя ссылка каталога`,
  );
  if (catalogPage.kind === "print") {
    assert(
      source.includes('class="product-seo-content catalog-seo-content"') &&
        source.includes("Оперативная цифровая печать для бизнеса"),
      `${catalogPage.file}: отсутствует видимый SEO-блок цифровой печати`,
    );
  } else {
    assert(
      source.includes('class="product-seo-content catalog-seo-content"') &&
        source.includes("Готовы печатать с нами?") &&
        source.includes("Рекламно-сувенирная продукция оптом и в розницу"),
      `${catalogPage.file}: отсутствует видимый SEO-блок сувениров`,
    );
  }
}

assert(
  sitemapUrls.every((url) => !url.includes("/services/")),
  "sitemap.xml: технические URL /services не должны индексироваться",
);

assert(
  migrationMap.matchedCount === services.length &&
    migrationMap.unmatchedLegacyCount === 0 &&
    migrationMap.unusedNewCount === 0,
  "Карта миграции услуг неполная",
);

const robots = read("robots.txt");
assert(robots.includes("User-agent: *"), "robots.txt: отсутствует общая секция");
assert(robots.includes("Allow: /"), "robots.txt: сайт не открыт для обхода");
const robotsSitemaps = getMatches(robots, /^Sitemap:\s*(\S+)\s*$/gim).map(
  (match) => match[1],
);
assert(
  robotsSitemaps.length === 1 &&
    robotsSitemaps[0] === `${domain}/sitemap.xml`,
  "robots.txt: sitemap должен вести только на https://comint.by/sitemap.xml",
);
assert(
  !testAddressPattern.test(robots),
  "robots.txt: найдена ссылка на тестовый адрес",
);

const publicHtml = [
  ...indexablePages.map(([file]) => read(file)),
  read("catalog-item.html"),
  ...services.map((service) => read(`services/${service.slug}.html`)),
].join("\n");

assert(!publicHtml.includes('href="/catalog-item?'), "В HTML остались параметрические ссылки catalog-item");

const htmlFiles = listHtmlFiles();
for (const file of htmlFiles) {
  const source = read(file);
  const isNoindex = /<meta\s+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(
    source,
  );
  const canonicals = getMatches(
    source,
    /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/gi,
  );
  const publicReferences = getMatches(
    source,
    /\b(?:href|src|action)=["']([^"']+)["']/gi,
  ).map((match) => match[1]);

  assert(
    isNoindex || canonicals.length === 1,
    `${file}: индексируемая страница должна иметь один canonical`,
  );
  assert(
    canonicals.every((match) => {
      try {
        return new URL(match[1]).origin === domain;
      } catch {
        return false;
      }
    }),
    `${file}: canonical должен вести на ${domain}`,
  );
  assert(
    publicReferences.every((reference) => !testAddressPattern.test(reference)),
    `${file}: внутренняя ссылка ведет на тестовый адрес`,
  );
}

for (const file of ["script.js", "catalog-data.js", "legacy-url-map.js"]) {
  assert(
    !testAddressPattern.test(read(file)),
    `${file}: публичный JavaScript содержит тестовый адрес`,
  );
}

if (errors.length) {
  console.error(errors.map((error) => `ERROR: ${error}`).join("\n"));
  process.exit(1);
}

console.log(`SEO checks passed: ${indexablePages.length} main pages, ${services.length} migrated service pages, ${legacyPostsAudit.posts.length} legacy posts, ${sitemapUrls.length} sitemap URLs.`);
