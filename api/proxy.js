export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Use GET" });

  const codigo = req.query.codigo_municipio;

  if (!codigo) {
    return res.status(400).json({ error: "codigo_municipio obrigatório" });
  }

  const quantidade = 100;
  let deslocamento = 0;

  let resultadoFinal = [];

  try {

    while (true) {

      const url =
        `https://api-dados-abertos.tce.ce.gov.br/itens_remuneratorios` +
        `?codigo_municipio=${codigo}` +
        `&quantidade=${quantidade}` +
        `&deslocamento=${deslocamento}`;

      const resp = await fetch(url);

      if (!resp.ok) {
        return res.status(502).json({
          error: "Erro na API",
          status: resp.status
        });
      }

      const json = await resp.json();

      // tenta encontrar onde está o array
      let dados = [];

      if (Array.isArray(json)) dados = json;
      else if (Array.isArray(json.data)) dados = json.data;
      else if (Array.isArray(json.itens)) dados = json.itens;
      else if (Array.isArray(json.resultados)) dados = json.resultados;

      if (dados.length === 0) break;

      resultadoFinal.push(...dados);

      if (dados.length < quantidade) break;

      deslocamento += quantidade;

    }

    return res.status(200).json(resultadoFinal);

  } catch (e) {

    return res.status(500).json({
      error: "Erro interno",
      detalhe: String(e?.message || e)
    });

  }

}
