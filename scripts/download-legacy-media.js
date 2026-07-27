const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const migrationDirectory = path.join(root, "seo-migration");
const sitemapInventory = require(path.join(migrationDirectory, "legacy-sitemap-inventory.json"));
const audits = [
  require(path.join(migrationDirectory, "legacy-products.json")).products,
  require(path.join(migrationDirectory, "legacy-posts.json")).posts,
  require(path.join(migrationDirectory, "legacy-pages.json")).pages,
  require(path.join(migrationDirectory, "legacy-categories.json")).categories,
];
const allowedPathPrefixes = ["/wp-content/uploads/", "/images/"];
const concurrency = 6;

function collectHtmlUrls(html, baseUrl) {
  const urls = [];

  for (const match of String(html || "").matchAll(/\b(?:src|href)=(["'])([^"']+)\1/gi)) {
    try {
      urls.push(new URL(match[2], baseUrl).href);
    } catch {
      // Ignore malformed links from legacy editor content.
    }
  }

  return urls;
}

function collectUrls() {
  const urls = new Set();

  for (const entry of sitemapInventory.entries) {
    for (const image of entry.images) {
      urls.add(image);
    }
  }

  for (const collection of audits) {
    for (const item of collection) {
      for (const image of item.seo?.openGraph?.images || []) {
        if (image.url) {
          urls.add(image.url);
        }
      }

      for (const url of collectHtmlUrls(item.content?.html, item.legacyUrl)) {
        urls.add(url);
      }
    }
  }

  return [...urls]
    .map((value) => {
      try {
        return new URL(value);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((url) => ["comint.by", "www.comint.by"].includes(url.hostname))
    .filter((url) => allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix)))
    .sort((left, right) => left.pathname.localeCompare(right.pathname));
}

function safeLocalPath(url) {
  const decodedPath = decodeURIComponent(url.pathname);
  const relativePath = decodedPath.replace(/^\/+/, "");
  const localPath = path.resolve(root, relativePath);

  if (!localPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Недопустимый путь: ${url.href}`);
  }

  return localPath;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    return await fetch(url, {
      headers: {
        "User-Agent": "COMINT-SEO-Migration-Media/1.0 (+https://comint.by)",
      },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function download(url) {
  const localPath = safeLocalPath(url);

  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
    return {
      url: url.href,
      path: path.relative(root, localPath),
      status: "existing",
      bytes: fs.statSync(localPath).size,
    };
  }

  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const allowedContentTypes = [
    "application/msword",
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument",
  ];
  const isAllowedContent =
    contentType.startsWith("image/") ||
    allowedContentTypes.some((allowedType) => contentType.startsWith(allowedType));

  if (!isAllowedContent) {
    throw new Error(`Неожиданный Content-Type: ${contentType || "не указан"}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, bytes);

  return {
    url: url.href,
    path: path.relative(root, localPath),
    status: "downloaded",
    bytes: bytes.length,
  };
}

async function worker(queue, results, failures) {
  while (queue.length) {
    const url = queue.shift();

    try {
      const result = await download(url);
      results.push(result);

      if (results.length % 50 === 0) {
        console.log(`Обработано медиафайлов: ${results.length}.`);
      }
    } catch (error) {
      failures.push({
        url: url.href,
        error: error.message,
      });
    }
  }
}

async function main() {
  const urls = collectUrls();
  const queue = [...urls];
  const results = [];
  const failures = [];
  const workers = Array.from({ length: concurrency }, () => worker(queue, results, failures));

  await Promise.all(workers);

  results.sort((left, right) => left.path.localeCompare(right.path));
  failures.sort((left, right) => left.url.localeCompare(right.url));

  const report = {
    generatedAt: new Date().toISOString(),
    requested: urls.length,
    downloaded: results.filter((item) => item.status === "downloaded").length,
    existing: results.filter((item) => item.status === "existing").length,
    failed: failures.length,
    totalBytes: results.reduce((total, item) => total + item.bytes, 0),
    files: results,
    failures,
  };

  fs.writeFileSync(
    path.join(migrationDirectory, "legacy-media-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  console.log(`Всего URL медиа: ${urls.length}.`);
  console.log(`Скачано: ${report.downloaded}. Уже было: ${report.existing}. Ошибок: ${report.failed}.`);

  if (failures.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
