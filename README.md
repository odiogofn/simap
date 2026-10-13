# SIMAP 2.0

Auditor de rubricas do TCE Ceará, preparado para deploy na Vercel.

## Uso

Importe este repositório na Vercel (framework: Other). A função `api/proxy.js` consulta a API oficial do TCE. Abra o endereço implantado, escolha um município e clique em **Consultar município**.

## Funcionalidades

- Consulta individual por município e abas Prefeitura, Câmara e Buscar.
- Contagem de códigos livres e ocupados nas faixas 1000–1999 e 2000–2999.
- Pesquisa por código ou descrição e detalhes de rubricas cadastradas.
- Cache local IndexedDB com validade de 24 horas por município.
- Atualização manual que ignora o cache.
- Limpeza de cache do município ou de todos os municípios.
- Exportação dos códigos livres por cópia para área de transferência.

## Observações

O cache fica somente no navegador/dispositivo e pode ser apagado pelo próprio navegador. Em caso de falha na atualização, dados anteriores podem ser exibidos com aviso de validade. O proxy rejeita paginação incompleta. A contagem considera apenas as duas faixas indicadas; códigos fora delas permanecem pesquisáveis na aba Buscar.
