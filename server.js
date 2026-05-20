const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = __dirname;
const dataDir = path.join(root, ".data");
const appointmentsFile = path.join(dataDir, "appointments.jsonl");
const port = Number(process.env.PORT || 4175);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".ico", "image/x-icon"]
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function securityHeaders(extra = {}) {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...extra
  };
}

function readRequestBody(request, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("İstek çok büyük."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function cleanText(value, maxLength = 1200) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validateAppointment(input) {
  const appointment = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    name: cleanText(input.name, 120),
    phone: cleanText(input.phone, 60),
    service: cleanText(input.service, 120),
    message: cleanText(input.message, 1200)
  };

  const phoneDigits = appointment.phone.replace(/\D/g, "");
  if (appointment.name.length < 2) return { error: "Ad soyad bilgisi eksik." };
  if (phoneDigits.length < 10) return { error: "Telefon numarası geçersiz." };
  return { appointment };
}

async function handleAppointment(request, response) {
  try {
    const rawBody = await readRequestBody(request);
    const parsed = JSON.parse(rawBody || "{}");
    const { appointment, error } = validateAppointment(parsed);

    if (error) {
      sendJson(response, 400, { ok: false, error });
      return;
    }

    await fs.promises.mkdir(dataDir, { recursive: true });
    await fs.promises.appendFile(appointmentsFile, `${JSON.stringify(appointment)}\n`, "utf8");
    sendJson(response, 201, { ok: true, id: appointment.id });
  } catch (error) {
    sendJson(response, 500, { ok: false, error: "Randevu isteği kaydedilemedi." });
  }
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(root, `.${requestedPath}`);

  if (!filePath.startsWith(root) || filePath.includes(`${path.sep}.data${path.sep}`)) {
    response.writeHead(404, securityHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
    response.end("Not found");
    return;
  }

  fs.promises
    .stat(filePath)
    .then((stats) => {
      if (!stats.isFile()) throw new Error("Not file");
      const extension = path.extname(filePath).toLowerCase();
      response.writeHead(200, securityHeaders({
        "Content-Type": mimeTypes.get(extension) || "application/octet-stream",
        "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600"
      }));
      if (request.method === "HEAD") {
        response.end();
        return;
      }
      fs.createReadStream(filePath).pipe(response);
    })
    .catch(() => {
      response.writeHead(404, securityHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
      response.end("Not found");
    });
}

const server = http.createServer((request, response) => {
  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && request.url === "/api/appointments") {
    handleAppointment(request, response);
    return;
  }

  if (request.method === "GET" || request.method === "HEAD") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405, securityHeaders({ "Content-Type": "text/plain; charset=utf-8" }));
  response.end("Method not allowed");
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} kullanımda. PORT=4176 node server.js gibi başka bir port seçin.`);
  } else if (error.code === "EPERM") {
    console.error(`Port ${host}:${port} açılamadı. Bu ortam yerel sunucu başlatmayı engelliyor olabilir.`);
  } else {
    console.error(`Sunucu başlatılamadı: ${error.message}`);
  }
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Pure Shine site and backend running at http://${host}:${port}`);
});
