const fs = require("fs");
const path = require("path");
const { transformHtml } = require("./prepare-github-pages");

const root = path.resolve(__dirname, "..");
const basePath = "/comint2/";
const errors = [];
const htmlFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (
      entry.name === ".git" ||
      entry.name === "node_modules" ||
      entry.name === "comint-cpanel-ready-privacy-cookies"
    ) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath);
    } else if (entry.name.endsWith(".html")) {
      htmlFiles.push(entryPath);
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function verifyLocalAsset(url, label) {
  if (
    !url ||
    url.startsWith("#") ||
    /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(url)
  ) {
    return;
  }

  const cleanUrl = url.split(/[?#]/, 1)[0];
  const relativePath = cleanUrl.startsWith(basePath)
    ? cleanUrl.slice(basePath.length)
    : cleanUrl.replace(/^\/+/, "");
  const filePath = path.join(root, relativePath);

  assert(fs.existsSync(filePath), `${label}: отсутствует локальный файл ${url}`);
}

walk(root);

for (const file of htmlFiles) {
  const relativeFile = path.relative(root, file);
  const transformed = transformHtml(fs.readFileSync(file, "utf8"), basePath);

  assert(
    transformed.includes(`<base data-deployment-base href="${basePath}" />`),
    `${relativeFile}: не установлен deployment base`,
  );
  assert(
    !/\b(?:href|src|action|poster)=(["'])\/(?!\/|comint2\/)/.test(transformed),
    `${relativeFile}: остался путь от корня GitHub Pages`,
  );

  for (const match of transformed.matchAll(/\b(?:src|poster)=(["'])(.*?)\1/g)) {
    verifyLocalAsset(match[2], relativeFile);
  }

  for (const match of transformed.matchAll(
    /<link\b[^>]*\bhref=(["'])(.*?)\1[^>]*>/g,
  )) {
    verifyLocalAsset(match[2], relativeFile);
  }
}

const scriptSource = fs.readFileSync(path.join(root, "script.js"), "utf8");
assert(
  scriptSource.includes("function withDeploymentBase"),
  "script.js: отсутствует обработка динамических Pages-путей",
);
assert(
  scriptSource.includes('base[data-deployment-base]'),
  "script.js: не используется deployment base из HTML",
);

if (errors.length) {
  console.error(errors.map((error) => `ERROR: ${error}`).join("\n"));
  process.exit(1);
}

console.log(`GitHub Pages checks passed: ${htmlFiles.length} HTML files use ${basePath}.`);
