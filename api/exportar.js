// Uma página por requisição: evita timeout da Vercel em exportações extensas.
export default async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET')return res.status(405).json({error:'Método não permitido'});
 const codigo=String(req.query.codigo_municipio||'').trim();
 const inicio=Number(req.query.start_index);
 if(!/^\d{1,3}$/.test(codigo)||!Number.isSafeInteger(inicio)||inicio<0||inicio>1000000||inicio%100!==0)return res.status(400).json({error:'Parâmetros inválidos'});
 const params=new URLSearchParams({codigo_municipio:codigo.padStart(3,'0'),'$format':'json','$count':'1000','$start_index':String(inicio)});
 try{
  const response=await fetch('https://api-dados-abertos.tce.ce.gov.br/sim/itens_remuneratorios?'+params,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(25000)});
  if(!response.ok)return res.status(502).json({error:`TCE retornou HTTP ${response.status}`});
  const payload=await response.json();
  if(!Array.isArray(payload?.elements))return res.status(502).json({error:'Formato inesperado da resposta do TCE'});
  return res.status(200).json({elements:payload.elements,start_index:inicio,count:1000});
 }catch(err){return res.status(502).json({error:'Falha na API do TCE: '+String(err?.message||err)})}
}
