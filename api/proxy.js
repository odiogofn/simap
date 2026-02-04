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
          "Accept": "application/json,text/plain,*/*",
          // evita compactação estranha; opcional mas ajuda
          "Accept-Encoding": "identity"
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

/**
 * Repara JSON "quase válido" quando há barras invertidas mal escapadas.
 * Ex.: "\A" vira "\\A" (para o JSON.parse aceitar).
 * Mantém escapes válidos: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
 */
function repairJsonString(s) {
  if (!s) return s;

  // Remove BOM
  let out = s.replace(/^\uFEFF/, "");

  // Remove caracteres de controle inválidos (exceto \t \n \r)
  out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  // Corrige barras invertidas inválidas:
  // qualquer "\" que NÃO esteja antes de: ", \, /, b, f, n, r, t, u
  out = out.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
  return out;
}

function sliceJsonObject(text) {
  const cleaned = (text || "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return cleaned.slice(first, last + 1);
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

    // upstream não ok
    if (r.status < 200 || r.status >= 300) {
      return res.status(502).json({
        error: "Upstream error",
        upstream_status: r.status,
        upstream_body_snippet: (r.body || "").slice(0, 1200)
      });
    }

    // Tenta parse normal
    const raw = r.body || "";
    const maybeJson = sliceJsonObject(raw) ?? raw;

    try {
      const parsed = JSON.parse(maybeJson);
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
      return res.status(200).json(parsed);
    } catch (e1) {
      // Tenta reparar e parsear
      const repaired = repairJsonString(maybeJson);
      try {
        const parsed2 = JSON.parse(repaired);
        res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
        return res.status(200).json(parsed2);
      } catch (e2) {
        // Se ainda falhar, devolve diagnóstico
        return res.status(502).json({
          error: "Invalid JSON from upstream (even after repair)",
          parse_error: String(e2?.message || e2),
          upstream_snippet: repaired.slice(0, 1600)
        });
      }
    }
  } catch (e) {
    return res.status(500).json({
      error: "proxy error",
      details: String(e?.message || e)
    });
  }
}
