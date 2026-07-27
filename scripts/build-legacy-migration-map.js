const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const migrationDirectory = path.join(root, "seo-migration");
const auditPath = path.join(migrationDirectory, "legacy-products.json");
const outputPath = path.join(migrationDirectory, "migration-map.json");
const publicMapPath = path.join(root, "legacy-url-map.js");

global.window = {};
require(path.join(root, "catalog-data.js"));

const { services } = global.window.ComintCatalogData;

const manualMatches = {
  "/cifrovaya-pechat/buklety/": "reklamnye-buklety-pechat-izgotovlenie-i-dizayn",
  "/cifrovaya-pechat/discount/": "diskontnye-karty",
  "/info-pos/hengery-izgotovlenie-i-pechat-hengerov/": "hengery-izgotovlenie-i-pechat",
  "/info-stendyi-tablichki/ofisnyie-tablichki/":
    "vyveski-i-tablichki-dlya-kabinetov-ofisnye-tablichki",
  "/mobilnoe-reklamnoe-oborudovanie/fold-up/": "fold-up-stendy-shirmy",
  "/mobilnoe-reklamnoe-oborudovanie/mobilnye-stendy/": "mobilnye-bannery",
  "/mobilnoe-reklamnoe-oborudovanie/pop-up-stendy/": "pop-up-stendy",
  "/mobilnoe-reklamnoe-oborudovanie/roll-ap-stendy/": "roll-up-stendy",
  "/naruzhnaya-reklama/shtender/": "reklamnye-shtendery",
  "/shirokoformatnaya-pechat/bannery/": "pechat-bannerov",
  "/shirokoformatnaya-pechat/flagi/": "pechat-flagov-vympelov-znamen",
  "/shirokoformatnaya-pechat/fonyi-pressvolyi/":
    "press-voll-brendvoll-press-stena-fony-dekoratsii",
  "/suveniryi/kepki/": "kepki-s-logotipom",
  "/suveniryi/kovriki-dlya-myishi/": "kovriki-dlya-myshi-s-pechatyu-logotipa",
  "/suveniryi/ezhednevniki/": "ezhednevniki-i-planingi-s-logotipom",
  "/suveniryi/pazlyi/": "pechat-logotipov-na-pazlah",
  "/suveniryi/uf-pechat-v-minske/": "uf-pechat",
};

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

function normalizeTitle(value) {
  return decodeHtml(value)
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[«»"'()/:,—–-]/g, " ")
    .replace(/\b(в|во|и|или|для|на|по|под|с|со|из|к|от|до)\b/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function writeCsv(fileName, header, rows) {
  const source = [
    header.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ].join("\n");
  fs.writeFileSync(path.join(migrationDirectory, fileName), `${source}\n`);
}

function buildPublicMap(mappings) {
  const byServiceSlug = Object.fromEntries(
    mappings.map((mapping) => [mapping.newServiceSlug, mapping.legacyPath]),
  );
  const json = JSON.stringify(byServiceSlug, null, 2).replace(/</g, "\\u003c");

  return `(function (root, factory) {
  const value = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = value;
  }

  if (root) {
    root.ComintLegacyUrlMap = value;
  }
})(typeof window !== "undefined" ? window : globalThis, function () {
  return ${json};
});
`;
}

function main() {
  if (!fs.existsSync(auditPath)) {
    throw new Error("Сначала запустите npm run audit:legacy-seo.");
  }

  const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  const servicesByNormalizedTitle = new Map();
  const servicesBySlug = new Map(services.map((service) => [service.slug, service]));

  for (const service of services) {
    const normalizedTitle = normalizeTitle(service.title);
    const matches = servicesByNormalizedTitle.get(normalizedTitle) || [];
    matches.push(service);
    servicesByNormalizedTitle.set(normalizedTitle, matches);
  }

  const mappings = [];
  const unmatched = [];
  const usedServiceSlugs = new Set();

  for (const product of audit.products) {
    const manualSlug = manualMatches[product.legacyPath];
    const exactMatches = servicesByNormalizedTitle.get(normalizeTitle(product.title)) || [];
    const service = manualSlug ? servicesBySlug.get(manualSlug) : exactMatches[0];
    const matchMethod = manualSlug ? "manual-reviewed" : "exact-normalized-title";

    if (!service || (!manualSlug && exactMatches.length !== 1)) {
      unmatched.push({
        legacyUrl: product.legacyUrl,
        legacyPath: product.legacyPath,
        legacyTitle: product.title,
        reason: !service ? "Нет однозначного соответствия" : "Найдено несколько соответствий",
      });
      continue;
    }

    if (usedServiceSlugs.has(service.slug)) {
      throw new Error(`Новая услуга ${service.slug} сопоставлена более одного раза.`);
    }

    usedServiceSlugs.add(service.slug);
    mappings.push({
      legacyUrl: product.legacyUrl,
      legacyPath: product.legacyPath,
      legacyTitle: product.title,
      newServiceSlug: service.slug,
      newServiceTitle: service.title,
      currentNewPath: `/services/${service.slug}`,
      canonicalPath: product.legacyPath,
      strategy: "preserve-legacy-url",
      matchMethod,
      legacyProductId: product.id,
    });
  }

  const unusedServices = services
    .filter((service) => !usedServiceSlugs.has(service.slug))
    .map((service) => ({
      slug: service.slug,
      title: service.title,
      section: service.section,
    }));

  const result = {
    generatedAt: new Date().toISOString(),
    strategy: "Старые URL остаются каноническими и отдают обновленные страницы с кодом 200.",
    legacyServiceCount: audit.products.length,
    newServiceCount: services.length,
    matchedCount: mappings.length,
    unmatchedLegacyCount: unmatched.length,
    unusedNewCount: unusedServices.length,
    mappings: mappings.sort((left, right) => left.legacyPath.localeCompare(right.legacyPath)),
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(publicMapPath, buildPublicMap(mappings));
  writeCsv(
    "unmatched-legacy-services.csv",
    ["legacy_url", "legacy_title", "reason", "decision"],
    unmatched.map((item) => [item.legacyUrl, item.legacyTitle, item.reason, "Ожидает решения заказчика"]),
  );
  writeCsv(
    "unused-new-services.csv",
    ["new_slug", "new_title", "section"],
    unusedServices.map((item) => [item.slug, item.title, item.section]),
  );

  console.log(`Подтверждено соответствий: ${mappings.length}.`);
  console.log(`Старых услуг без аналога: ${unmatched.length}.`);
  console.log(`Новых услуг без старой страницы: ${unusedServices.length}.`);
}

main();
