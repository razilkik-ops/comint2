const fs = require("fs");
const http = require("http");
const path = require("path");

const port = Number(process.env.PORT) || 4174;
const root = __dirname;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
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
  const requestedPath = cleanPath === "/" ? "/index.html" : cleanPath;
  const filePath = path.join(root, requestedPath);
  const normalizedPath = path.normalize(filePath);

  if (!normalizedPath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  sendFile(response, normalizedPath);
});

server.listen(port, () => {
  console.log(`COMINT site running on port ${port}`);
});
