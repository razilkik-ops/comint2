const fs = require("fs");
const path = require("path");

function normalizeBasePath(value) {
  const trimmed = String(value || "/").trim();
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function transformSrcset(value, basePath) {
  return value.replace(/(^|,\s*)\/(?!\/)/g, `$1${basePath}`);
}

function transformHtml(source, basePathInput) {
  const basePath = normalizeBasePath(basePathInput);
  let output = source.replace(
    /\b(href|src|action|poster)=(["'])\/(?!\/)/g,
    `$1=$2${basePath}`,
  );

  output = output.replace(
    /\bsrcset=(["'])([\s\S]*?)\1/g,
    (match, quote, value) =>
      `srcset=${quote}${transformSrcset(value, basePath)}${quote}`,
  );

  const deploymentBase = `<base data-deployment-base href="${basePath}" />`;
  if (/<base\b[^>]*>/i.test(output)) {
    return output.replace(/<base\b[^>]*>/i, deploymentBase);
  }

  return output.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n    ${deploymentBase}`);
}

function walkFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

function prepareDirectory(directory, basePathInput) {
  const root = path.resolve(directory);
  const basePath = normalizeBasePath(basePathInput);
  const htmlFiles = walkFiles(root).filter((file) => file.endsWith(".html"));

  for (const file of htmlFiles) {
    const source = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, transformHtml(source, basePath));
  }

  fs.writeFileSync(path.join(root, ".nojekyll"), "");
  return htmlFiles.length;
}

if (require.main === module) {
  const directory = process.argv[2];
  const basePath = process.argv[3];

  if (!directory || !basePath) {
    console.error("Usage: node scripts/prepare-github-pages.js <directory> <base-path>");
    process.exit(1);
  }

  const count = prepareDirectory(directory, basePath);
  console.log(`Prepared ${count} HTML files for GitHub Pages at ${normalizeBasePath(basePath)}.`);
}

module.exports = {
  normalizeBasePath,
  prepareDirectory,
  transformHtml,
};
