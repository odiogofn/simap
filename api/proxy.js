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

      const resp = await fetch(url, {
        headers: { "accept": "application/json" }
      });

      if (!resp.ok) {
        const txt = await resp.text();
        return res.status(502).json({
          error: "Erro na API do TCE",
          detalhe: txt
        });
      }

      const dados = await resp.json();

      if (!Array.isArray(dados) || dados.length === 0) {
        break;
      }

      resultadoFinal = resultadoFinal.concat(dados);

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
