export default async function handler(req, res) {
  // CORS (pra seu index.html poder chamar /api/...)
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
        error: "Parâmetros inválidos. Use codigo_municipio, exercicio_orcamento e cpf_servidor (11 dígitos)."
      });
    }

    const url =
      "https://api.tce.ce.gov.br/index.php/sim/1_0/agentes_publicos.json" +
      `?codigo_municipio=${encodeURIComponent(codigo_municipio)}` +
      `&exercicio_orcamento=${encodeURIComponent(exercicio_orcamento)}` +
      `&cpf_servidor=${encodeURIComponent(cpf_servidor)}`;

    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const text = await r.text();

    if (!r.ok) {
      return res.status(r.status).json({
        error: "Erro da API do TCE",
        status: r.status,
        body_snippet: text.slice(0, 800)
      });
    }

    // Às vezes pode vir HTML/erro; tentamos JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "Resposta não-JSON da API do TCE",
        body_snippet: text.slice(0, 800)
      });
    }

    // cache leve (ajuda muito no Vercel)
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: "Falha no proxy", details: String(e?.message || e) });
  }
}
