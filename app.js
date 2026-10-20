import { MUNICIPIOS } from './municipios.js';
const $=id=>document.getElementById(id), API='/api/proxy', TTL=24*60*60*1000, DB_NAME='simap-cache-v2';
let rubricas=[], ativos=new Set(), livresPref=[], livresCam=[], atual=null, aba='pref', carregando=false, token=0;
const sel=$('municipio');for(const [nome,codigo] of MUNICIPIOS){const o=document.createElement('option');o.value=codigo;o.textContent=nome;sel.append(o)}
function setStatus(m,t=''){const el=$('status');el.textContent=m;el.className='notice '+t}
function abrirBanco(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window))return reject(new Error('IndexedDB indisponível'));const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore('municipios',{keyPath:'codigo'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function operacao(modo,codigo,valor){const db=await abrirBanco();return new Promise((resolve,reject)=>{const tx=db.transaction('municipios',modo==='ler'?'readonly':'readwrite');const store=tx.objectStore('municipios');let req;if(modo==='ler')req=store.get(codigo);else if(modo==='salvar')req=store.put(valor);else if(modo==='apagar')req=store.delete(codigo);else req=store.clear();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onerror=()=>reject(tx.error)})}
const format=n=>n.toLocaleString('pt-BR');const data=t=>new Date(t).toLocaleString('pt-BR');
function normalizarCodigo(v){if(v===null||v===undefined)return null;const s=String(v).trim();if(!/^\d+$/.test(s))return null;const n=Number(s);return Number.isSafeInteger(n)?n:null}
function validar(items){if(!Array.isArray(items))throw Error('A API retornou um formato inválido.');for(const r of items){if(!r||typeof r!=='object'||!('codigo_item' in r))throw Error('A consulta retornou registros inválidos.')}return items}
function calcular(){ativos=new Set(rubricas.map(r=>normalizarCodigo(r.codigo_item)).filter(n=>n!==null));livresPref=[];livresCam=[];for(let i=1000;i<=1999;i++)if(!ativos.has(i))livresPref.push(i);for(let i=2000;i<=2999;i++)if(!ativos.has(i))livresCam.push(i);const pO=1000-livresPref.length,cO=1000-livresCam.length;$('total').textContent='2.000';$('livres').textContent=format(livresPref.length+livresCam.length);$('ocupados').textContent=format(pO+cO);$('percentual').textContent=((livresPref.length+livresCam.length)/20).toLocaleString('pt-BR',{maximumFractionDigits:1})+'% disponíveis';$('prefLivre').textContent=format(livresPref.length);$('prefOcup').textContent=format(pO);$('camLivre').textContent=format(livresCam.length);$('camOcup').textContent=format(cO);$('prefCount').textContent=format(livresPref.length)+' códigos';$('camCount').textContent=format(livresCam.length)+' códigos';renderizar()}
function vazio(tbody,msg,col=2){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=col;td.textContent=msg;tr.append(td);tbody.replaceChildren(tr)}
function tabelaLivres(id,lista){const body=$(id);const frag=document.createDocumentFragment();for(const n of lista){const tr=document.createElement('tr'),td=document.createElement('td'),estado=document.createElement('td'),tag=document.createElement('span');td.textContent=n;tag.className='pill';tag.textContent='Livre';estado.append(tag);tr.append(td,estado);frag.append(tr)}body.replaceChildren(frag);if(!lista.length)vazio(body,'Nenhum código livre encontrado.')}
function tabelaBusca(){const q=$('campoBusca').value.trim().toLocaleLowerCase('pt-BR');const resultados=rubricas.filter(r=>String(r.codigo_item??'').toLowerCase().includes(q)||String(r.descricao_item??'').toLocaleLowerCase('pt-BR').includes(q));$('resultCount').textContent=format(resultados.length)+' resultado(s) encontrado(s)';const body=$('buscaBody'),frag=document.createDocumentFragment();for(const r of resultados){const tr=document.createElement('tr'),a=document.createElement('button'),c=document.createElement('td'),d=document.createElement('td'),t=document.createElement('td');a.className='codebtn';a.textContent=String(r.codigo_item??'—');a.addEventListener('click',()=>detalhes(r));c.append(a);d.textContent=String(r.descricao_item??'—');t.textContent=String(r.tipo_item??'—');tr.append(c,d,t);frag.append(tr)}body.replaceChildren(frag);if(!resultados.length)vazio(body,'Nenhuma rubrica encontrada.',3)}
function renderizar(){if(!atual)return; if(aba==='pref')tabelaLivres('prefBody',livresPref);if(aba==='cam')tabelaLivres('camBody',livresCam);if(aba==='busca')tabelaBusca()}
function detalhes(r){const box=$('detalhes');box.replaceChildren();for(const [k,v] of Object.entries(r)){const div=document.createElement('div'),b=document.createElement('b'),val=document.createElement('span');div.className='detailrow';b.textContent=k;val.textContent=typeof v==='object'?JSON.stringify(v):String(v??'—');div.append(b,val);box.append(div)}$('modal').showModal()}
function mostrar(items,codigo,ts,origem,antigo=false){rubricas=validar(items);atual=codigo;calcular();const txt=origem==='cache'?'Carregado do cache local':'Consulta concluída e armazenada localmente';setStatus(`${txt}: ${format(items.length)} rubricas de ${sel.selectedOptions[0].textContent}.`+(antigo?' Atenção: cache vencido; confirme antes de usar os códigos.':''),antigo?'error':'ok');$('cacheInfo').textContent=`Última atualização: ${data(ts)} · ${antigo?'Cache vencido':`Validade: ${data(ts+TTL)}`} · Armazenamento somente neste navegador.`}
async function consultar(forcar=false){if(carregando)return;const codigo=sel.value, minhaVez=++token;carregando=true;[$('consultar'),$('atualizar')].forEach(b=>b.disabled=true);setStatus('Verificando dados locais...');let anterior=null;try{try{anterior=await operacao('ler',codigo)}catch(e){console.warn('Cache indisponível:',e)}if(!forcar&&anterior&&Date.now()-anterior.timestamp<TTL){mostrar(anterior.rubricas,codigo,anterior.timestamp,'cache');return}setStatus('Consultando API do TCE. Aguarde; municípios com muitos registros podem demorar...');const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),55000);let resposta;try{resposta=await fetch(`${API}?codigo_municipio=${encodeURIComponent(codigo)}`,{signal:controller.signal,cache:'no-store'})}finally{clearTimeout(timeout)}const json=await resposta.json().catch(()=>null);if(!resposta.ok)throw Error(json?.error||`Erro HTTP ${resposta.status}`);if(minhaVez!==token)return;validar(json);const ts=Date.now();try{await operacao('salvar',codigo,{codigo,timestamp:ts,rubricas:json})}catch(e){console.warn('Não foi possível salvar cache:',e);mostrar(json,codigo,ts,'api');setStatus('Consulta concluída, mas não foi possível salvar no navegador.','error');return}mostrar(json,codigo,ts,'api')}catch(e){if(anterior&&anterior.rubricas){mostrar(anterior.rubricas,codigo,anterior.timestamp,'cache',Date.now()-anterior.timestamp>=TTL);setStatus(`Não foi possível atualizar: ${e.message}. Exibindo dados locais de ${data(anterior.timestamp)}; verifique a validade.`, 'error')}else setStatus(`Falha na consulta: ${e.message}. Nenhum dado foi atualizado.`, 'error')}finally{carregando=false;[$('consultar'),$('atualizar')].forEach(b=>b.disabled=false)}}
$('consultar').addEventListener('click',()=>consultar());$('atualizar').addEventListener('click',()=>consultar(true));$('limpar').addEventListener('click',async()=>{const all=confirm('OK: limpar todo o cache local. Cancelar: escolher limpar apenas o município atual?');if(!all&&!confirm(`Limpar somente o cache de ${sel.selectedOptions[0].textContent}?`))return;try{await operacao(all?'limpar':'apagar',sel.value);setStatus(all?'Todo o cache deste navegador foi limpo.':'Cache do município selecionado removido.','ok');$('cacheInfo').textContent='';}catch(e){setStatus('Não foi possível limpar o cache: '+e.message,'error')}});
sel.addEventListener('change',()=>{token++;rubricas=[];atual=null;livresPref=[];livresCam=[];for(const id of ['total','livres','ocupados','prefLivre','prefOcup','camLivre','camOcup'])$(id).textContent='—';$('percentual').textContent='Aguardando consulta';$('cacheInfo').textContent='';$('prefCount').textContent='—';$('camCount').textContent='—';$('resultCount').textContent='Consulte o município selecionado.';['prefBody','camBody','buscaBody'].forEach(id=>$(id).replaceChildren());setStatus('Município alterado. Clique em Consultar para carregar seus dados.')});
document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{aba=btn.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.tabPane').forEach(p=>p.classList.toggle('active',p.id===aba));renderizar()}));$('campoBusca').addEventListener('input',()=>{if(atual)tabelaBusca()});$('fecharModal').addEventListener('click',()=>$('modal').close());$('copiar').addEventListener('click',async()=>{if(!atual){setStatus('Consulte um município antes de copiar.','error');return}const lista=aba==='cam'?livresCam:aba==='pref'?livresPref:[...livresPref,...livresCam];const conteudo=`${sel.selectedOptions[0].textContent} — códigos livres (${aba==='cam'?'Câmara':aba==='pref'?'Prefeitura':'Geral'})\n${lista.join(', ')}`;try{await navigator.clipboard.writeText(conteudo);setStatus(`${format(lista.length)} códigos livres copiados.`,'ok')}catch{setStatus('Não foi possível copiar automaticamente. Verifique as permissões do navegador.','error')}});

// Exportação independente da consulta de códigos livres e do cache de 24 horas.
let exportItems=[], exportCodigo=null, exportController=null, exportando=false;
const exportStatus=(mensagem,tipo='')=>{const el=$('exportStatus');el.textContent=mensagem;el.className='notice '+tipo};
function exportButtons(){ $('iniciarExport').disabled=exportando;$('cancelarExport').disabled=!exportando;const pronto=!exportando&&exportCodigo===sel.value&&exportItems.length>0;$('baixarCsv').disabled=!pronto;$('baixarXml').disabled=!pronto;}
function invalidarExport(){if(exportController)exportController.abort();exportController=null;exportando=false;exportItems=[];exportCodigo=null;$('exportProgress').value=0;$('exportDetalhe').textContent='Nenhum registro coletado.';exportStatus('Selecione um município e inicie a coleta.');exportButtons()}
sel.addEventListener('change',invalidarExport);
const esperar=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function iniciarExport(){
 if(exportando)return;
 exportItems=[];exportCodigo=null;exportando=true;const codigo=sel.value,nome=sel.selectedOptions[0].textContent,controller=new AbortController();exportController=controller;
 const progress=$('exportProgress');progress.removeAttribute('value');exportButtons();
 const vistos=new Set();let inicio=0,paginas=0,terminou=false;
 try{
  // count=1000 e incremento=100: as páginas se sobrepõem, por isso a deduplicação.
  while(paginas<10001){
   if(controller.signal.aborted)throw new DOMException('Coleta cancelada','AbortError');
   exportStatus(`Consultando ${nome} · start_index=${inicio} · ${format(exportItems.length)} registros únicos...`);
   let dados;
   for(let tentativa=0;tentativa<3;tentativa++){
    try{
     const r=await fetch(`/api/exportar?codigo_municipio=${encodeURIComponent(codigo)}&start_index=${inicio}`,{signal:controller.signal,cache:'no-store'});
     dados=await r.json().catch(()=>null);
     if(!r.ok)throw Error(dados?.error||`HTTP ${r.status}`);
     if(!Array.isArray(dados?.elements))throw Error('Resposta sem lista de registros');
     break;
    }catch(e){if(controller.signal.aborted)throw e;if(tentativa===2)throw e;await esperar(700*(tentativa+1))}
   }
   const itens=dados.elements;let novos=0;
   for(const item of itens){
    if(!item||typeof item!=='object'||!('codigo_item' in item))throw Error('Registro inválido retornado pelo TCE');
    // Não deduplicar somente por codigo_item: podem existir múltiplos registros para o mesmo código.
    const chave=JSON.stringify(Object.keys(item).sort().map(k=>[k,item[k]]));
    if(!vistos.has(chave)){vistos.add(chave);exportItems.push(item);novos++}
   }
   paginas++;$('exportDetalhe').textContent=`${format(exportItems.length)} registros únicos · ${paginas} páginas · índice ${inicio} · ${novos} novos nesta página`;
   if(itens.length<1000){terminou=true;break}
   // Se uma página completa não acrescentou nenhum registro, é sinal de repetição da API.
   if(novos===0)throw Error('A API repetiu uma página inteira. Coleta interrompida para evitar arquivo incompleto.');
   inicio+=100;
  }
  if(!terminou)throw Error('Limite de segurança da paginação atingido.');
  if(controller.signal.aborted)throw new DOMException('Coleta cancelada','AbortError');
  exportCodigo=codigo;progress.value=100;
  exportStatus(`Coleta concluída: ${format(exportItems.length)} registros únicos de ${nome}. Arquivos disponíveis para download.`,'ok');
 }catch(e){exportCodigo=null;progress.value=0;exportStatus(controller.signal.aborted?'Coleta cancelada. Inicie novamente para exportar.':`Falha: ${e.message}. Download bloqueado para evitar arquivos incompletos.`,'error')}
 finally{if(exportController===controller)exportController=null;exportando=false;exportButtons()}
}
$('iniciarExport').addEventListener('click',iniciarExport);
$('cancelarExport').addEventListener('click',()=>exportController?.abort());
const CAMPOS=['codigo_municipio','codigo_item','tipo_item','descricao_item','codigo_amparo_legal','numero_amparo_legal','data_amparo_legal','data_publicacao','numero_decreto','data_decreto','data_publicacao_decreto','tipo_classificacao','status_extinto','data_referencia_doc'];
function colunas(){return [...new Set([...CAMPOS,...exportItems.flatMap(item=>Object.keys(item))])]}
function csvValor(v){const s=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);return '"'+s.replace(/"/g,'""')+'"'}
function criarCsv(){const campos=colunas();return '\uFEFF'+[campos.map(csvValor).join(';'),...exportItems.map(r=>campos.map(k=>csvValor(r[k])).join(';'))].join('\r\n')}
function xmlEscape(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function criarXml(){const campos=colunas();const linhas=['<?xml version="1.0" encoding="UTF-8"?>','<denodo:view xmlns="http://www.denodo.com/restful/vdb_sim/views/dv_itens_remuneratorios" xmlns:denodo="http://www.denodo.com/restful" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" name="dv_itens_remuneratorios">'];for(const item of exportItems){linhas.push('  <dv_itens_remuneratorios>');for(const k of campos){if(!/^[A-Za-z_][\w.-]*$/.test(k))continue;const v=item[k];linhas.push(v==null?`    <${k} xsi:nil="true"/>`:`    <${k}>${xmlEscape(typeof v==='object'?JSON.stringify(v):v)}</${k}>`)}linhas.push('  </dv_itens_remuneratorios>')}linhas.push('</denodo:view>');return linhas.join('\n')}
function baixarExport(tipo){if(exportando||exportCodigo!==sel.value||!exportItems.length)return;const conteudo=tipo==='csv'?criarCsv():criarXml(),mime=tipo==='csv'?'text/csv;charset=utf-8':'application/xml;charset=utf-8',blob=new Blob([conteudo],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`itens_remuneratorios_municipio_${exportCodigo}.${tipo}`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('baixarCsv').addEventListener('click',()=>baixarExport('csv'));
$('baixarXml').addEventListener('click',()=>baixarExport('xml'));
exportButtons();
