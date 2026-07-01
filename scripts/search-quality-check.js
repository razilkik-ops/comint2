const fs = require("fs");
const path = require("path");
const vm = require("vm");

const catalogPath = path.join(__dirname, "..", "catalog-data.js");
const catalogCode = fs.readFileSync(catalogPath, "utf8");
const sandbox = { window: {} };

vm.runInNewContext(catalogCode, sandbox, { filename: catalogPath });

const catalog = sandbox.window.ComintCatalogData;

const cases = [
  ["подарки клиентам", "souvenirs", "Подарочные наборы"],
  ["велкам пак для сотрудников", "souvenirs", "Подарочные наборы"],
  ["ручки для раздачи", "souvenirs", "Ручки с логотипом"],
  ["usb накопители с логотипом", "souvenirs", "Флешки с логотипом"],
  ["шоппер с логотипом", "souvenirs", "Печать на тканевых сумках"],
  ["бумажный пакет для бутика", "souvenirs", "Фирменные бумажные пакеты с логотипом"],
  ["магнитик на холодильник", "souvenirs", "Печать на магнитах"],
  ["коврик для мышки", "souvenirs", "Коврики для мыши с печатью логотипа"],
  ["ruchki", "souvenirs", "Ручки с логотипом"],
  ["hexrb", "souvenirs", "Ручки с логотипом"],
  ["ijggth", "souvenirs", "Печать на тканевых сумках"],
  ["табличка на дверь офиса", "print", "Вывески и таблички для кабинетов / офисные таблички"],
  ["номер телефона в машину", "print", "Карточки с номером телефона для машин"],
  ["реклама в магазине на полках", "print", "Комплексное оформление магазина / рекламное оформление торгового зала"],
  ["ценникодержатель", "print", "Ценникодержатели из пластика и оргстекла"],
  ["буклетница напольная", "print", "Буклетницы напольные и стойки для буклетов"],
  ["стенд на выставку", "print", "Мобильные выставочные конструкции для стендов"],
  ["roll up для выставки", "print", "Roll up стенды"],
  ["pop up стенд", "print", "Pop up стенды"],
  ["press wall фотозона", "print", "Пресс-волл / брендволл / пресс-стена / фоны / декорации"],
  ["наклейки на упаковку товара", "print", "Самоклеящиеся этикетки"],
  ["пломба контроль вскрытия", "print", "Гарантийные пломбы печатные"],
  ["наклейка на машину", "print", "Наклейки на авто"],
  ["меню для кафе", "print", "Печать меню"],
  ["фото на стену в интерьер", "print", "Изготовление фотообоев на заказ"],
  ["скинали фартук на кухню", "print", "Скинали для кухни"],
  ["наружная световая вывеска", "print", "Световые короба / лайтбоксы"],
  ["объемные буквы на фасад", "print", "Изготовление световых объемных букв"],
  ["штендер у входа", "print", "Рекламные штендеры"],
  ["скидочная карта клиента", "print", "Дисконтные карты"],
  ["бейджик сотрудника", "print", "Изготовление и печать бейджей"],
  ["прайс лист", "print", "Разработка и печать прайс-листов"],
  ["vizitki", "print", "Изготовление и печать визиток"],
  ["dbpbnrb", "print", "Изготовление и печать визиток"],
  ["yfrktqrb yf fdnj", "print", "Наклейки на авто"],
  ["приглашение на свадьбу", "print", "Рассадки и пригласительные на свадьбу"],
  ["печать банер", "print", "Печать баннеров"],
  ["карта доступа сотрудника", "print", "Печать и изготовление пропусков"],
];

let failed = 0;

cases.forEach(([query, kind, expectedTitle]) => {
  const results = catalog.searchAll(query, { kind, limit: 3, minScore: 10 });
  const actualTitle = results[0]?.title || "нет результата";
  const ok = actualTitle === expectedTitle;

  if (!ok) {
    failed += 1;
    console.error(`FAIL: ${query}`);
    console.error(`  expected: ${expectedTitle}`);
    console.error(`  actual:   ${actualTitle}`);
    console.error(`  top:      ${results.map((item) => item.title).join(" | ")}`);
    return;
  }

  console.log(`OK: ${query} -> ${actualTitle}`);
});

if (failed) {
  console.error(`\n${failed} search quality checks failed.`);
  process.exit(1);
}

console.log(`\n${cases.length} search quality checks passed.`);
