import https from "https";

function getText(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json,text/plain,*/*"
        }
      },
      (res) => {
        const chunks = [];
        res.on("data", (d) => chunks.push(d));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8")
          });
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error("Timeout")));
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 3 tentativas com backoff leve
async function getWithRetry(url) {
  const attempts = [
    { timeout: 10000, wait: 400 },
    { timeout: 15000, wait: 800 },
    { timeout: 20000, wait: 0 }
  ];

  let lastErr = null;
  for (let i = 0; i < attempts.length; i++) {
    try {
      return await getText(url, attempts[i].timeout);
    } catch (e) {
      lastErr = e;
      if (attempts[i].wait) await sleep(attempts[i].wait);
    }
  }
  throw new Error(`Timeout ao chamar a API do TCE após ${attempts.length} tentativas: ${String(lastErr?.message || lastErr)}`);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  try {
    const codigo_municipio = String(req.query.codigo_municipio || "").trim();
    const exercicio_orcamento = String(req.query.exercicio_orcamento || "").trim();
    const cpf_servidor = String(req.query.cpf_servidor || "").replace(/\D+/g, "");

    if (!codigo_municipio || !exercicio_orcamento || cpf_servidor.length !== 11) {
      return res.status(400).json({
        error: "Parâmetros inválidos",
        esperado: "codigo_municipio, exercicio_orcamento, cpf_servidor(11 dígitos)",
        recebido: { codigo_municipio, exercicio_orcamento, cpf_servidor }
      });
    }

    const upstream =
      "https://api.tce.ce.gov.br/index.php/sim/1_0/agentes_publicos.json" +
      `?codigo_municipio=${encodeURIComponent(codigo_municipio)}` +
      `&exercicio_orcamento=${encodeURIComponent(exercicio_orcamento)}` +
      `&cpf_servidor=${encodeURIComponent(cpf_servidor)}`;

    const r = await getWithRetry(upstream);

    if (r.status < 200 || r.status >= 300) {
      return res.status(502).json({
        error: "Upstream (TCE) retornou erro",
        upstream_status: r.status,
        upstream_url: upstream,
        upstream_body_snippet: (r.body || "").slice(0, 1200)
      });
    }

    let data;
    try {
      data = JSON.parse(r.body);
    } catch {
      return res.status(502).json({
        error: "Upstream retornou algo que não é JSON",
        upstream_url: upstream,
        upstream_body_snippet: (r.body || "").slice(0, 1200)
      });
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({
      error: "Falha interna no proxy",
      details: String(e?.message || e)
    });
  }
}
