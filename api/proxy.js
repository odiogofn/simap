export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  const codigo = String(req.query.codigo_municipio || "").trim();

  if (!codigo) {
    return res.status(400).json({ error: "codigo_municipio obrigatório" });
  }

  const count = 1000;
  const baseUrl = "https://api-dados-abertos.tce.ce.gov.br/sim/itens_remuneratorios";

  const montarUrl = (startIndex = 0) => {
    const params = new URLSearchParams();
    params.set("codigo_municipio", codigo.padStart(3, "0"));
    params.set("$format", "json");
    params.set("$count", String(count));
    params.set("$start_index", String(startIndex));
    return `${baseUrl}?${params.toString()}`;
  };

  try {
    let todos = [];
    let startIndex = 0;
    let pagina = 0;
    const limiteSegurancaPaginas = 500;

    while (pagina < limiteSegurancaPaginas) {
      const url = montarUrl(startIndex);
      const resp = await fetch(url);

      if (!resp.ok) {
        const texto = await resp.text().catch(() => "");
        return res.status(resp.status).json({
          error: "Erro ao consultar API do TCE",
          status: resp.status,
          url,
          detalhe: texto.slice(0, 500)
        });
      }

      const json = await resp.json();
      const elementos = Array.isArray(json?.elements) ? json.elements : [];

      todos.push(...elementos);

      if (elementos.length < count) break;

      pagina += 1;
      startIndex += count;
    }

    return res.status(200).json(todos);
  } catch (e) {
    return res.status(500).json({
      error: "Erro interno",
      detalhe: String(e?.message || e)
    });
  }
}
