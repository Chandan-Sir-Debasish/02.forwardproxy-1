const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const httpProxy = require("http-proxy");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");

dotenv.config();

// Models
const BlocklistRule = mongoose.model(
  "BlocklistRule",
  new mongoose.Schema({
    domain: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
  }),
);

const ProxyLog = mongoose.model(
  "ProxyLog",
  new mongoose.Schema({
    method: String,
    url: String,
    statusCode: Number,
    clientIp: String,
    timestamp: { type: Date, default: Date.now },
    blocked: { type: Boolean, default: false },
  }),
);

// Express API app
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// ========== API ROUTES ==========
app.get("/api/blocklist", async (req, res) => {
  const rules = await BlocklistRule.find().sort({ createdAt: -1 });
  res.json({ success: true, data: rules });
});

app.post("/api/blocklist", async (req, res) => {
  const { domain } = req.body;
  if (!domain)
    return res.status(400).json({ success: false, message: "Domain required" });
  try {
    const rule = new BlocklistRule({ domain });
    await rule.save();
    res.json({ success: true, data: rule });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete("/api/blocklist/:id", async (req, res) => {
  await BlocklistRule.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

app.get("/api/logs", async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const logs = await ProxyLog.find().sort({ timestamp: -1 }).limit(limit);
  res.json({ success: true, data: logs });
});

app.get("/api/stats", async (req, res) => {
  const total = await ProxyLog.countDocuments();
  const blocked = await ProxyLog.countDocuments({ blocked: true });
  res.json({ success: true, data: { total, blocked } });
});

app.post("/api/test-proxy", express.json(), async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  const http = require("http");
  const https = require("https");

  const proxyUrl = new URL(url);
  const protocol = proxyUrl.protocol === "https:" ? https : http;

  const options = {
    hostname: proxyUrl.hostname,
    port: proxyUrl.port || (proxyUrl.protocol === "https:" ? 443 : 80),
    path: proxyUrl.pathname + proxyUrl.search,
    method: "GET",
    headers: {
      "User-Agent": "ForwardProxyTester/1.0",
    },
  };

  const proxyReq = protocol.request(options, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (chunk) => (data += chunk));
    proxyRes.on("end", () => {
      res.json({
        success: true,
        statusCode: proxyRes.statusCode,
        headers: proxyRes.headers,
        preview: data.slice(0, 500) + (data.length > 500 ? "..." : ""),
      });
    });
  });

  proxyReq.on("error", (err) => {
    res.status(500).json({ success: false, error: err.message });
  });

  proxyReq.end();
});

async function isDomainBlocked(hostname) {
  if (process.env.BLOCKLIST_ENABLED !== "true") return false;
  const rules = await BlocklistRule.find();
  return rules.some((rule) => hostname.includes(rule.domain));
}

// Test proxy endpoint – respects blocklist and uses the forward proxy internally
app.post("/api/test-proxy", express.json(), async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch (e) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  // 1. Check blocklist
  const blocked = await isDomainBlocked(hostname);
  if (blocked) {
    // Log the blocked test attempt
    await ProxyLog.create({
      method: "TEST",
      url,
      statusCode: 403,
      clientIp: req.ip,
      blocked: true,
    });
    return res.json({
      success: false,
      blocked: true,
      message: `Domain "${hostname}" is blacklisted.`,
    });
  }

  // 2. If not blocked, fetch through the forward proxy (localhost:8888)
  const http = require("http");
  const https = require("https");
  const targetUrl = new URL(url);
  const protocol = targetUrl.protocol === "https:" ? https : http;

  const proxyOptions = {
    hostname: "localhost",
    port: 8888, // forward proxy port
    path: targetUrl.toString(),
    method: "GET",
    headers: {
      "User-Agent": "ForwardProxyTest/1.0",
      Host: targetUrl.host,
    },
  };

  const proxyReq = protocol.request(proxyOptions, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (chunk) => (data += chunk));
    proxyRes.on("end", async () => {
      // Log successful request
      await ProxyLog.create({
        method: "TEST",
        url,
        statusCode: proxyRes.statusCode,
        clientIp: req.ip,
        blocked: false,
      });
      res.json({
        success: true,
        statusCode: proxyRes.statusCode,
        headers: proxyRes.headers,
        contentPreview: data.slice(0, 2000) + (data.length > 2000 ? "..." : ""),
        fullLength: data.length,
      });
    });
  });

  proxyReq.on("error", async (err) => {
    await ProxyLog.create({
      method: "TEST",
      url,
      statusCode: 502,
      clientIp: req.ip,
      blocked: false,
    });
    res.status(502).json({ success: false, error: err.message });
  });

  proxyReq.end();
});

// ========== FORWARD PROXY SERVER ==========
const proxy = httpProxy.createProxyServer({});
const proxyServer = http.createServer(async (req, res) => {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  let url = req.url;
  let method = req.method;

  // Handle CONNECT method for HTTPS
  if (req.method === "CONNECT") {
    const [host, port] = req.url.split(":");
    const targetUrl = `${host}:${port || 443}`;
    proxy.web(req, res, {
      target: `https://${targetUrl}`,
      agent: false,
      changeOrigin: true,
    });
    return;
  }

  // Extract hostname for blocking
  let hostname = "";
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
  } catch (e) {
    hostname = req.headers.host || "";
  }

  let blocked = false;
  if (process.env.BLOCKLIST_ENABLED === "true") {
    const blockRules = await BlocklistRule.find();
    blocked = blockRules.some((rule) => hostname.includes(rule.domain));
  }

  if (blocked) {
    // Log blocked request
    await ProxyLog.create({
      method,
      url,
      statusCode: 403,
      clientIp,
      blocked: true,
    });
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end(`Access to ${hostname} is blocked by proxy policy.`);
    return;
  }

  // Forward request
  proxy.web(
    req,
    res,
    { target: url, changeOrigin: true, followRedirects: true },
    async (err) => {
      if (err) {
        await ProxyLog.create({
          method,
          url,
          statusCode: 502,
          clientIp,
          blocked: false,
        });
        res.writeHead(502);
        res.end("Proxy error");
      }
    },
  );

  // Log after response finishes
  res.on("finish", async () => {
    if (!blocked) {
      await ProxyLog.create({
        method,
        url,
        statusCode: res.statusCode,
        clientIp,
        blocked: false,
      });
    }
  });
});

proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err);
  if (!res.headersSent) {
    res.writeHead(500);
    res.end("Proxy internal error");
  }
});

// Start services
const start = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");

  const API_PORT = process.env.PORT || 5000;
  app.listen(API_PORT, () => console.log(`API server on port ${API_PORT}`));

  const PROXY_PORT = process.env.PROXY_PORT || 8888;
  proxyServer.listen(PROXY_PORT, () =>
    console.log(`Forward proxy listening on port ${PROXY_PORT}`),
  );
};

start().catch(console.error);
