const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendError(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  });
  response.end(message);
}

function createServer() {
  return http.createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return sendError(response, 405, "Method not allowed.");
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
      return sendError(response, 400, "Invalid URL.");
    }
    const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
    const filePath = path.resolve(ROOT, relativePath);
    if (!filePath.startsWith(`${ROOT}${path.sep}`)) return sendError(response, 403, "Forbidden.");

    fs.stat(filePath, (statError, stats) => {
      if (statError || !stats.isFile()) return sendError(response, 404, "File not found.");
      response.writeHead(200, {
        "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": path.basename(filePath) === "sw.js" ? "no-cache" : "public, max-age=0"
      });
      if (request.method === "HEAD") return response.end();
      fs.createReadStream(filePath).pipe(response);
    });
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => console.log(`Footprints running at http://localhost:${PORT}`));
}

module.exports = { createServer };
