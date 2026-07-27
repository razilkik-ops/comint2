const fs = require("fs");
const http = require("http");
const path = require("path");

const port = Number(process.env.PORT) || 4174;
const root = __dirname;
const legacyUrlMap = require("./legacy-url-map.js");
const routeRedirects = new Map([
  ["/polygraphy", "/cifrovaya-pechat/"],
  ["/polygraphy/", "/cifrovaya-pechat/"],
  ["/souvenirs", "/suveniryi/"],
  ["/souvenirs/", "/suveniryi/"],
]);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500);
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    response.writeHead(200, { "Content-Type": contentType });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname);
  const serviceMatch = cleanPath.match(/^\/services\/([^/.]+)(?:\.html)?\/?$/);

  if (routeRedirects.has(cleanPath)) {
    response.writeHead(301, { Location: routeRedirects.get(cleanPath) });
    response.end();
    return;
  }

  if (serviceMatch && legacyUrlMap[serviceMatch[1]]) {
    response.writeHead(301, { Location: legacyUrlMap[serviceMatch[1]] });
    response.end();
    return;
  }

  const ext = path.extname(cleanPath);
  const htmlPath = `${cleanPath.replace(/\/$/, "")}.html`;
  const indexPath = path.join(cleanPath, "index.html");
  const requestedPath =
    cleanPath === "/"
      ? "/index.html"
      : ext
        ? cleanPath
        : cleanPath.endsWith("/") || fs.existsSync(path.join(root, indexPath))
          ? indexPath
          : htmlPath;
  const filePath = path.join(root, requestedPath);
  const normalizedPath = path.normalize(filePath);
  const relativePath = path.relative(root, normalizedPath);
  const pathParts = relativePath.split(path.sep);
  const blockedNames = new Set([
    "cloudflare-bot",
    "catalog-item.html",
    "comint-cpanel-ready-privacy-cookies",
    "node_modules",
    "scripts",
    "seo-migration",
    "templates",
    "tmp-imagegen-logo",
    "server.js",
    "package.json",
    "package-lock.json",
    "site-screenshot.png",
  ]);
  const isBlocked =
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    pathParts.some((part) => part.startsWith(".")) ||
    pathParts.some((part) => blockedNames.has(part)) ||
    path.extname(normalizedPath).toLowerCase() === ".zip";

  if (isBlocked) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  sendFile(response, normalizedPath);
});

server.listen(port, () => {
  console.log(`COMINT site running on port ${port}`);
});
