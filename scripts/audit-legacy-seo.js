const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(root, "seo-migration");
const apiRoot = "https://comint.by/wp-json/wp/v2";
const sitemapIndexUrl = "https://comint.by/sitemap_index.xml";
const contentFields = [
  "id",
  "slug",
  "link",
  "title",
  "content",
  "excerpt",
  "modified",
  "date",
  "featured_media",
  "yoast_head_json",
].join(",");
const categoryFields = [
  "id",
  "slug",
  "link",
  "name",
  "description",
  "count",
  "yoast_head_json",
].join(",");

global.window = {};
require(path.join(root, "catalog-data.js"));

const { services } = global.window.ComintCatalogData;

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value) {
  return decodeHtml(
    String(value || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadings(html, level) {
  const headings = [];
  const expression = new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)<\\/h${level}>`, "gi");
  let match;

  while ((match = expression.exec(String(html || "")))) {
    const heading = stripHtml(match[1]);
    if (heading) {
      headings.push(heading);
    }
  }

  return headings;
}

function normalizeTitle(value) {
  return decodeHtml(value)
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[«»"'()/:,—–-]/g, " ")
    .replace(/\b(в|во|и|или|для|на|по|под|с|со|из|к|от|до)\b/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokens(value) {
  return new Set(
    normalizeTitle(value)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length > 2),
  );
}

function diceCoefficient(left, right) {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  let shared = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      shared += 1;
    }
  }

  if (!leftTokens.size && !rightTokens.size) {
    return 1;
  }

  return (2 * shared) / (leftTokens.size + rightTokens.size);
}

function similarity(left, right) {
  const normalizedLeft = normalizeTitle(left);
  const normalizedRight = normalizeTitle(right);
  const tokenScore = diceCoefficient(left, right);
  const containsScore =
    normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft) ? 0.16 : 0;

  return Math.min(1, tokenScore + containsScore);
}

function csvCell(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "COMINT-SEO-Migration-Audit/1.0 (+https://comint.by)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }

    return {
      data: await response.json(),
      totalPages: Number(response.headers.get("x-wp-totalpages") || 1),
      totalItems: Number(response.headers.get("x-wp-total") || 0),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "COMINT-SEO-Migration-Audit/1.0 (+https://comint.by)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }

    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCollection(type, requestedFields) {
  const endpoint = `${apiRoot}/${type}`;
  const firstUrl = `${endpoint}?per_page=100&page=1&_fields=${encodeURIComponent(requestedFields)}`;
  const firstPage = await fetchJson(firstUrl);
  const items = [...firstPage.data];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const pageUrl = `${endpoint}?per_page=100&page=${page}&_fields=${encodeURIComponent(requestedFields)}`;
    const pageResult = await fetchJson(pageUrl);
    items.push(...pageResult.data);
  }

  if (firstPage.totalItems && items.length !== firstPage.totalItems) {
    throw new Error(`Для ${type} получено ${items.length} записей из ${firstPage.totalItems}.`);
  }

  return items;
}

function normalizeSeo(yoast, fallbackUrl) {
  const data = yoast || {};

  return {
    title: data.title || "",
    description: data.description || "",
    canonical: data.canonical || fallbackUrl,
    robots: data.robots || {},
    openGraph: {
      locale: data.og_locale || "",
      type: data.og_type || "",
      title: data.og_title || "",
      description: data.og_description || "",
      url: data.og_url || "",
      siteName: data.og_site_name || "",
      images: data.og_image || [],
    },
    twitterCard: data.twitter_card || "",
    schema: data.schema || null,
  };
}

function normalizeLegacyContentItem(item) {
  const contentHtml = item.content?.rendered || "";
  const contentText = stripHtml(contentHtml);
  const legacyUrl = new URL(item.link);

  return {
    id: item.id,
    slug: item.slug,
    legacyUrl: item.link,
    legacyPath: legacyUrl.pathname,
    date: item.date || "",
    modified: item.modified || "",
    featuredMediaId: item.featured_media || 0,
    title: decodeHtml(item.title?.rendered || ""),
    seo: normalizeSeo(item.yoast_head_json, item.link),
    content: {
      html: contentHtml,
      text: contentText,
      wordCount: contentText ? contentText.split(/\s+/u).length : 0,
      headings: {
        h2: extractHeadings(contentHtml, 2),
        h3: extractHeadings(contentHtml, 3),
      },
    },
    excerptHtml: item.excerpt?.rendered || "",
  };
}

function normalizeLegacyProduct(product) {
  return normalizeLegacyContentItem(product);
}

function normalizeLegacyCategory(category) {
  const descriptionHtml = category.description || "";
  const descriptionText = stripHtml(descriptionHtml);
  const legacyUrl = new URL(category.link);

  return {
    id: category.id,
    slug: category.slug,
    legacyUrl: category.link,
    legacyPath: legacyUrl.pathname,
    title: decodeHtml(category.name || ""),
    productCount: category.count || 0,
    seo: normalizeSeo(category.yoast_head_json, category.link),
    content: {
      html: descriptionHtml,
      text: descriptionText,
      wordCount: descriptionText ? descriptionText.split(/\s+/u).length : 0,
      headings: {
        h2: extractHeadings(descriptionHtml, 2),
        h3: extractHeadings(descriptionHtml, 3),
      },
    },
  };
}

function parseSitemapIndex(xml) {
  return [...String(xml).matchAll(/<sitemap>\s*<loc>([\s\S]*?)<\/loc>[\s\S]*?<\/sitemap>/gi)].map(
    (match) => decodeHtml(match[1].trim()),
  );
}

function parseUrlSitemap(xml, sitemapUrl) {
  return [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/gi)].map((match) => {
    const block = match[1];
    const location = block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1] || "";
    const lastModified = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1] || "";
    const images = [...block.matchAll(/<image:loc>([\s\S]*?)<\/image:loc>/gi)].map((imageMatch) =>
      decodeHtml(imageMatch[1].trim()),
    );

    return {
      sitemap: sitemapUrl,
      type: path.basename(new URL(sitemapUrl).pathname).replace("-sitemap.xml", ""),
      url: decodeHtml(location.trim()),
      path: new URL(decodeHtml(location.trim())).pathname,
      lastModified: lastModified.trim(),
      images,
    };
  });
}

async function fetchSitemapInventory() {
  const indexXml = await fetchText(sitemapIndexUrl);
  const sitemapUrls = parseSitemapIndex(indexXml);
  const entries = [];

  for (const sitemapUrl of sitemapUrls) {
    const sitemapXml = await fetchText(sitemapUrl);
    entries.push(...parseUrlSitemap(sitemapXml, sitemapUrl));
  }

  return {
    source: sitemapIndexUrl,
    sitemapUrls,
    entryCount: entries.length,
    entries,
  };
}

function buildCandidates(product) {
  return services
    .map((service) => ({
      slug: service.slug,
      title: service.title,
      section: service.section,
      score: similarity(product.title, service.title),
    }))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title, "ru"))
    .slice(0, 5);
}

function buildCandidateCsv(products) {
  const header = [
    "legacy_url",
    "legacy_title",
    "legacy_word_count",
    "candidate_1_slug",
    "candidate_1_title",
    "candidate_1_score",
    "candidate_2_slug",
    "candidate_2_title",
    "candidate_2_score",
    "candidate_3_slug",
    "candidate_3_title",
    "candidate_3_score",
    "decision",
    "notes",
  ];
  const rows = products.map((product) => {
    const candidates = buildCandidates(product);
    return [
      product.legacyUrl,
      product.title,
      product.content.wordCount,
      candidates[0]?.slug || "",
      candidates[0]?.title || "",
      candidates[0]?.score.toFixed(3) || "",
      candidates[1]?.slug || "",
      candidates[1]?.title || "",
      candidates[1]?.score.toFixed(3) || "",
      candidates[2]?.slug || "",
      candidates[2]?.title || "",
      candidates[2]?.score.toFixed(3) || "",
      "",
      "",
    ]
      .map(csvCell)
      .join(",");
  });

  return [header.map(csvCell).join(","), ...rows].join("\n");
}

async function main() {
  const [rawProducts, rawPosts, rawPages, rawCategories, sitemapInventory] = await Promise.all([
    fetchCollection("product", contentFields),
    fetchCollection("posts", contentFields),
    fetchCollection("pages", contentFields),
    fetchCollection("product_cat", categoryFields),
    fetchSitemapInventory(),
  ]);
  const products = rawProducts.map(normalizeLegacyProduct).sort((left, right) =>
    left.legacyPath.localeCompare(right.legacyPath),
  );
  const posts = rawPosts.map(normalizeLegacyContentItem).sort((left, right) =>
    left.legacyPath.localeCompare(right.legacyPath),
  );
  const pages = rawPages.map(normalizeLegacyContentItem).sort((left, right) =>
    left.legacyPath.localeCompare(right.legacyPath),
  );
  const categories = rawCategories.map(normalizeLegacyCategory).sort((left, right) =>
    left.legacyPath.localeCompare(right.legacyPath),
  );
  const audit = {
    source: `${apiRoot}/product`,
    capturedAt: new Date().toISOString(),
    legacyProductCount: products.length,
    newServiceCount: services.length,
    products,
  };

  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, "legacy-products.json"),
    `${JSON.stringify(audit, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(outputDirectory, "legacy-posts.json"),
    `${JSON.stringify(
      {
        source: `${apiRoot}/posts`,
        capturedAt: audit.capturedAt,
        count: posts.length,
        posts,
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(outputDirectory, "legacy-pages.json"),
    `${JSON.stringify(
      {
        source: `${apiRoot}/pages`,
        capturedAt: audit.capturedAt,
        count: pages.length,
        pages,
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(outputDirectory, "legacy-categories.json"),
    `${JSON.stringify(
      {
        source: `${apiRoot}/product_cat`,
        capturedAt: audit.capturedAt,
        count: categories.length,
        categories,
      },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(outputDirectory, "legacy-sitemap-inventory.json"),
    `${JSON.stringify(sitemapInventory, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(outputDirectory, "legacy-match-candidates.csv"),
    `${buildCandidateCsv(products)}\n`,
  );

  console.log(`Сохранено старых услуг: ${products.length}.`);
  console.log(`Сохранено старых статей: ${posts.length}.`);
  console.log(`Сохранено старых страниц: ${pages.length}.`);
  console.log(`Сохранено старых категорий: ${categories.length}.`);
  console.log(`URL в старых sitemap: ${sitemapInventory.entryCount}.`);
  console.log(`Новых услуг в каталоге: ${services.length}.`);
  console.log(`Результат: ${path.relative(root, outputDirectory)}/`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
