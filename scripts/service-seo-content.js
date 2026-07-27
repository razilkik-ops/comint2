const souvenirs = require("./seo-content/souvenirs");
const print = require("./seo-content/print");
const interiorRetail = require("./seo-content/interior-retail");
const advertising = require("./seo-content/advertising");

const serviceSeoContent = {
  ...souvenirs,
  ...print,
  ...interiorRetail,
  ...advertising,
};

function getServiceSeoContent(service) {
  const content = serviceSeoContent[service.title];

  if (!content) {
    throw new Error(`SEO-текст не найден для услуги: ${service.title}`);
  }

  if (!content.intro || !Array.isArray(content.points) || content.points.length !== 3 || !content.brief) {
    throw new Error(`SEO-текст заполнен не полностью: ${service.title}`);
  }

  return content;
}

module.exports = {
  getServiceSeoContent,
  serviceSeoContent,
};
