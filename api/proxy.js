export default async function handler(req, res) {

res.setHeader("Access-Control-Allow-Origin","*");
res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
res.setHeader("Access-Control-Allow-Headers","Content-Type");

if(req.method==="OPTIONS") return res.status(204).end();

const codigo=req.query.codigo_municipio;

if(!codigo){
return res.status(400).json({error:"codigo_municipio obrigatório"});
}

const quantidade=100;

try{

const firstUrl=
`https://api-dados-abertos.tce.ce.gov.br/itens_remuneratorios?codigo_municipio=${codigo}&quantidade=${quantidade}&deslocamento=0`;

const firstResp=await fetch(firstUrl);
const firstJson=await firstResp.json();

const total=firstJson.data.total;
const dadosPrimeira=firstJson.data.data;

const paginas=Math.ceil(total/quantidade);

let promises=[];

for(let i=1;i<paginas;i++){

const deslocamento=i*quantidade;

const url=
`https://api-dados-abertos.tce.ce.gov.br/itens_remuneratorios?codigo_municipio=${codigo}&quantidade=${quantidade}&deslocamento=${deslocamento}`;

promises.push(fetch(url).then(r=>r.json()));

}

const resultados=await Promise.all(promises);

let todos=[...dadosPrimeira];

for(const r of resultados){

const arr=r?.data?.data||[];
todos.push(...arr);

}

return res.status(200).json(todos);

}catch(e){

return res.status(500).json({
error:"Erro interno",
detalhe:String(e?.message||e)
});

}

}
