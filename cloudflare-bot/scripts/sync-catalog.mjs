import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../..");
const source = fs.readFileSync(path.join(projectRoot, "catalog-data.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);

const services = context.window.ComintCatalogData.services.map(({ title, section, catalogKind, slug }) => ({
  title,
  section,
  kind: catalogKind,
  slug,
}));

fs.writeFileSync(
  path.join(scriptDirectory, "../src/catalog.js"),
  `export default ${JSON.stringify(services, null, 2)};\n`,
);
fs.writeFileSync(path.join(scriptDirectory, "../src/catalog.json"), `${JSON.stringify(services, null, 2)}\n`);
console.log(`Synchronized ${services.length} services.`);
