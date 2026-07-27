const fs = require("fs");
const path = require("path");
const ejs = require("ejs");

const root = path.resolve(__dirname, "..");
const templatesDirectory = path.join(root, "templates", "partials");
const headerPath = path.join(templatesDirectory, "header.ejs");
const footerPath = path.join(templatesDirectory, "footer.ejs");
const headerTemplate = fs.readFileSync(headerPath, "utf8");
const footerTemplate = fs.readFileSync(footerPath, "utf8");

const headerStart = "<!-- EJS:HEADER:START -->";
const headerEnd = "<!-- EJS:HEADER:END -->";
const footerStart = "<!-- EJS:FOOTER:START -->";
const footerEnd = "<!-- EJS:FOOTER:END -->";

const rootPages = [
  { file: "index.html", activeSection: "", hasOrderModal: true },
  { file: "company.html", activeSection: "company", hasOrderModal: true },
  { file: "polygraphy.html", activeSection: "print", hasOrderModal: true },
  { file: "souvenirs.html", activeSection: "souvenirs", hasOrderModal: true },
  { file: "catalog-item.html", activeSection: "", hasOrderModal: true },
  { file: "cookies.html", activeSection: "", hasOrderModal: false },
  { file: "privacy-policy.html", activeSection: "", hasOrderModal: false },
];

function renderPartial(template, filename, data) {
  return ejs.render(template, data, {
    filename,
    rmWhitespace: false,
  });
}

function replaceSharedRegion(source, config) {
  const {
    startMarker,
    endMarker,
    fallbackExpression,
    rendered,
    label,
  } = config;
  const markedExpression = new RegExp(
    `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
  );
  const replacement = `${startMarker}\n${rendered}\n    ${endMarker}`;

  if (markedExpression.test(source)) {
    return source.replace(markedExpression, replacement);
  }

  if (!fallbackExpression.test(source)) {
    throw new Error(`Не найден блок ${label} для EJS-рендеринга`);
  }

  return source.replace(fallbackExpression, replacement);
}

function renderSharedLayout(source, options = {}) {
  const data = {
    activeSection: options.activeSection || "",
    hasOrderModal: options.hasOrderModal !== false,
  };
  const header = renderPartial(headerTemplate, headerPath, data).trimEnd();
  const footer = renderPartial(footerTemplate, footerPath, data).trimEnd();
  const withHeader = replaceSharedRegion(source, {
    startMarker: headerStart,
    endMarker: headerEnd,
    fallbackExpression: /<header class="site-header">[\s\S]*?<\/header>/,
    rendered: header,
    label: "header",
  });

  return replaceSharedRegion(withHeader, {
    startMarker: footerStart,
    endMarker: footerEnd,
    fallbackExpression: /<footer class="site-footer" id="contacts">[\s\S]*?<\/footer>/,
    rendered: footer,
    label: "footer",
  });
}

function renderFile(relativePath, options) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  fs.writeFileSync(filePath, renderSharedLayout(source, options));
}

function renderAllPages() {
  for (const page of rootPages) {
    renderFile(page.file, page);
  }

  global.window = {};
  require(path.join(root, "catalog-data.js"));

  for (const service of global.window.ComintCatalogData.services) {
    const relativePath = path.join("services", `${service.slug}.html`);
    const filePath = path.join(root, relativePath);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    renderFile(relativePath, {
      activeSection: service.catalogKind,
      hasOrderModal: true,
    });
  }
}

if (require.main === module) {
  renderAllPages();
  console.log("Rendered shared EJS header and footer for all HTML pages.");
}

module.exports = {
  renderAllPages,
  renderSharedLayout,
  rootPages,
};
