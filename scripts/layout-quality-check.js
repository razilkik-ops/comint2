const fs = require("fs");
const path = require("path");
const { rootPages } = require("./render-shared-layout");

const root = path.resolve(__dirname, "..");
const errors = [];

global.window = {};
require(path.join(root, "catalog-data.js"));

const { services } = global.window.ComintCatalogData;
const headerStart = "<!-- EJS:HEADER:START -->";
const headerEnd = "<!-- EJS:HEADER:END -->";
const footerStart = "<!-- EJS:FOOTER:START -->";
const footerEnd = "<!-- EJS:FOOTER:END -->";

function assert(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function count(source, value) {
  return source.split(value).length - 1;
}

function extract(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);

  if (startIndex === -1 || endIndex === -1) {
    return "";
  }

  return source.slice(startIndex + start.length, endIndex).trim();
}

function activeHref(activeSection) {
  if (activeSection === "print") {
    return "/cifrovaya-pechat/";
  }

  if (activeSection === "souvenirs") {
    return "/suveniryi/";
  }

  if (activeSection === "company") {
    return "/company/";
  }

  if (activeSection === "blog") {
    return "/news/";
  }

  return "";
}

const pages = [
  ...rootPages.map((page) => ({
    ...page,
    relativePath: page.file,
  })),
  ...services.map((service) => ({
    relativePath: `services/${service.slug}.html`,
    activeSection: service.catalogKind,
    hasOrderModal: true,
  })),
];
const renderedFooters = new Set();

for (const page of pages) {
  const source = read(page.relativePath);
  const header = extract(source, headerStart, headerEnd);
  const footer = extract(source, footerStart, footerEnd);
  const expectedActiveHref = activeHref(page.activeSection);

  assert(count(source, headerStart) === 1 && count(source, headerEnd) === 1, `${page.relativePath}: неверные EJS-маркеры header`);
  assert(count(source, footerStart) === 1 && count(source, footerEnd) === 1, `${page.relativePath}: неверные EJS-маркеры footer`);
  assert(count(header, '<header class="site-header">') === 1, `${page.relativePath}: должен быть один общий header`);
  assert(count(footer, '<footer class="site-footer" id="contacts">') === 1, `${page.relativePath}: должен быть один общий footer`);
  assert(!source.includes("<%"), `${page.relativePath}: в статический HTML попал EJS-код`);
  assert(header.includes('src="/assets/comint_logo.svg"'), `${page.relativePath}: логотип header использует не корневой путь`);
  assert(footer.includes('src="/assets/comint_logo.svg"'), `${page.relativePath}: логотип footer использует не корневой путь`);
  assert(header.includes('class="mobile-submenu"'), `${page.relativePath}: отсутствует мобильное подменю`);
  assert(header.includes('href="/news/"'), `${page.relativePath}: отсутствует ссылка на блог в header`);
  assert(footer.includes('href="/news/"'), `${page.relativePath}: отсутствует ссылка на блог в footer`);
  assert(footer.includes('class="telegram-card"'), `${page.relativePath}: отсутствует карточка Telegram в footer`);

  if (expectedActiveHref) {
    assert(
      header.includes(`href="${expectedActiveHref}"`) &&
        new RegExp(`href="${expectedActiveHref.replace("/", "\\/")}"[^>]*aria-current="page"`).test(header),
      `${page.relativePath}: неверный активный раздел header`,
    );
    assert(count(header, 'aria-current="page"') === 1, `${page.relativePath}: активных разделов header должно быть один`);
  } else {
    assert(!header.includes('aria-current="page"'), `${page.relativePath}: активный раздел header не должен быть задан`);
  }

  if (page.hasOrderModal) {
    assert(
      header.includes('href="#contacts" data-open-order-modal'),
      `${page.relativePath}: кнопка быстрого заказа не открывает форму`,
    );
  } else {
    assert(
      header.includes('href="/#contacts"') && !header.includes("data-open-order-modal"),
      `${page.relativePath}: юридическая страница должна вести к контактам`,
    );
  }

  renderedFooters.add(footer);
}

assert(renderedFooters.size === 1, `footer должен быть идентичным на всех страницах, вариантов найдено: ${renderedFooters.size}`);

if (errors.length) {
  console.error(errors.map((error) => `ERROR: ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Layout checks passed: ${pages.length} pages use shared EJS header and footer.`);
