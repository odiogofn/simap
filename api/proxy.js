import https from "https";

function isAllowed(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname === "api.tce.ce.gov.br";
  } catch {
    return false;
  }
}

function getText(url, timeoutMs = 25000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "SIMAP/1.0",
          "Accept": "application/json,text/plain,*/*"
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8"),
            contentType: res.headers["content-type"] || "application/json; charset=utf-8"
          });
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error("Timeout")));
  });
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  const url = req.query.url ? String(req.query.url) : "";
  if (!url) return res.status(400).json({ error: "missing url" });
  if (!isAllowed(url)) return res.status(400).json({ error: "url not allowed (only api.tce.ce.gov.br)" });

  try {
    const r = await getText(url, 25000);

    // Se upstream não ok, devolve diagnóstico
    if (r.status < 200 || r.status >= 300) {
      return res.status(502).json({
        error: "Upstream error",
        upstream_status: r.status,
        upstream_body_snippet: (r.body || "").slice(0, 1200)
      });
    }

    // Preserva content-type (JSON continua JSON)
    res.setHeader("content-type", r.contentType);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).send(r.body);
  } catch (e) {
    return res.status(500).json({
      error: "proxy error",
      details: String(e?.message || e)
    });
  }
}
