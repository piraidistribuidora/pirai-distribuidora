import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig={apiKey:"AIzaSyApGSq7s7RFaYUOQBKzvwblKU8kzrnx2h0",authDomain:"bar-pirai.firebaseapp.com",projectId:"bar-pirai",storageBucket:"bar-pirai.firebasestorage.app",messagingSenderId:"919706466304",appId:"1:919706466304:web:8ada24ec3a647396e780e5"};
const appFirebase=initializeApp(firebaseConfig);
const db=getFirestore(appFirebase);
const auth=getAuth(appFirebase);

const $=id=>document.getElementById(id);

function notify(msg,tipo="ok"){
  const t=$("toast");
  if(!t){ console.log(msg); return; }
  t.textContent=msg;
  t.className="toast "+tipo;
  t.classList.remove("hidden");
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>t.classList.add("hidden"),3200);
}
function confirmar(msg){ notify(msg,"aviso"); return true; }
const money=n=>"R$ "+Number(n||0).toFixed(2).replace(".",",");
const today=()=>new Date().toISOString().slice(0,10);
const month=()=>new Date().toISOString().slice(0,7);

function parseDataISO(data){
  if(!data) return null;
  const [y,m,d]=String(data).split("-").map(Number);
  if(!y||!m||!d) return null;
  return new Date(y,m-1,d,0,0,0,0);
}
function periodoDashboardAtual(){
  return $("dashPeriodo")?.value || "diario";
}
function labelPeriodoDashboard(){
  const p=periodoDashboardAtual();
  return {
    diario:"Diário",
    semanal:"Semanal",
    mensal:"Mensal",
    "3meses":"Últimos 3 meses",
    "1ano":"Último 1 ano",
    todo:"Todo o período"
  }[p] || "Diário";
}
function dataDentroDoPeriodoDashboard(dataTexto){
  const periodo=periodoDashboardAtual();
  const data=parseDataISO(dataTexto);
  if(!data && periodo!=="todo") return false;
  const hoje=new Date();
  const inicioHoje=new Date(hoje.getFullYear(),hoje.getMonth(),hoje.getDate());

  if(periodo==="diario"){
    return dataTexto===today();
  }
  if(periodo==="semanal"){
    const ini=new Date(inicioHoje);
    ini.setDate(ini.getDate()-6);
    return data>=ini && data<=hoje;
  }
  if(periodo==="mensal"){
    return String(dataTexto||"").startsWith(month());
  }
  if(periodo==="3meses"){
    const ini=new Date(inicioHoje);
    ini.setMonth(ini.getMonth()-3);
    return data>=ini && data<=hoje;
  }
  if(periodo==="1ano"){
    const ini=new Date(inicioHoje);
    ini.setFullYear(ini.getFullYear()-1);
    return data>=ini && data<=hoje;
  }
  if(periodo==="todo"){
    return true;
  }
  return dataTexto===today();
}
function atualizarTituloCardsDashboard(){
  const label=labelPeriodoDashboard();
  const mapa=[
    ["dashVendas","💰 Vendas"],
    ["dashPix","📱 PIX"],
    ["dashDinheiro","💵 Dinheiro"],
    ["dashCredito","💳 Crédito"],
    ["dashDebito","💳 Débito"],
    ["dashFiado","💳 Fiado"],
    ["dashMisto","🔀 Misto"],
    ["dashMes","📈 Faturamento"]
  ];
  mapa.forEach(([id,base])=>{
    const el=$(id);
    const card=el?.closest(".card");
    const h=card?.querySelector("h3");
    if(h) h.textContent=`${base} • ${label}`;
  });
}

const PERM_PAGES=["dashboard","vendas","mesas","comandas","estoque","entradas","clientes","fiados","funcionarios","caixa","financeiro","cancelamentos","devolucoes","relatorios","auditoria","configuracoes"];

let produtos=[], clientes=[], funcionarios=[], cart=[], usuario=null;

function withTimeout(promise, ms, msg){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(msg)),ms))
  ]);
}
async function anon(){
  if(!auth.currentUser) await withTimeout(signInAnonymously(auth),10000,"Tempo esgotado ao conectar ao Firebase Authentication.");
}
async function docs(nome){
  try{
    const s=await getDocs(collection(db,nome));
    return s.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){
    console.warn("Erro ao ler coleção",nome,e);
    return [];
  }
}
async function auditar(acao,detalhes=""){ await addDoc(collection(db,"auditoria"),{acao,detalhes,usuario:usuario?.nome||"Sistema",dataTexto:today(),dataHora:serverTimestamp()}); }
function openModal(title,body,onSave,readOnly=false){ $("modalTitle").innerText=title; $("modalBody").innerHTML=body; $("modal").classList.add("open"); $("modalCancel").classList.toggle("hidden",readOnly); $("modalSave").innerText=readOnly?"Fechar":"Salvar"; $("modalSave").onclick=onSave||closeModal; }
function closeModal(){ $("modal").classList.remove("open"); }

async function validarCredencialGerencia(usuarioDigitado, senhaDigitada){
  const u=String(usuarioDigitado||"").trim().toLowerCase();
  const s=String(senhaDigitada||"").trim();

  if(u==="henrique" && s==="38371450"){
    return {nome:"Henrique",usuario:"henrique",cargo:"Administrador"};
  }

  const fs=await docs("funcionarios");
  const f=fs.find(x=>
    x.ativo!==false &&
    (x.usuario||"").toLowerCase()===u &&
    String(x.senhaInicial||"")===s &&
    (x.cargo==="Administrador" || x.cargo==="Gerente")
  );

  return f || null;
}

function solicitarAutorizacaoGerencia(titulo, detalhe, acaoAutorizada){
  openModal("Autorização necessária",`
    <div class="alerta-caixa falta">
      <b>${titulo}</b><br>
      ${detalhe||"Esta ação exige autorização de administrador ou gerente."}
    </div>
    <label>Usuário do administrador/gerente</label>
    <input id="authUsuario" autocomplete="off" placeholder="Usuário">
    <label>Senha</label>
    <input id="authSenha" type="password" autocomplete="off" placeholder="Senha">
    <p class="hint">Essa autorização será registrada na auditoria.</p>
  `,async()=>{
    const aprovado=await validarCredencialGerencia(authUsuario.value,authSenha.value);
    if(!aprovado){
      notify("Autorização negada. Use login de administrador ou gerente.","erro");
      await auditar("AUTORIZACAO_NEGADA",titulo);
      return;
    }

    await auditar("AUTORIZACAO_APROVADA",`${titulo} | Autorizado por: ${aprovado.nome||aprovado.usuario}`);
    closeModal();
    await acaoAutorizada(aprovado);
  });
}

function usuarioPodeAutorizar(){
  return usuario && (usuario.cargo==="Administrador" || usuario.cargo==="Gerente");
}


function printHtml(html){
  let root=document.getElementById("printRoot");
  if(!root){
    root=document.createElement("div");
    root.id="printRoot";
    document.body.appendChild(root);
  }
  root.innerHTML=`<div class="print-area">${html}</div>`;
  window.print();
  setTimeout(()=>{root.innerHTML="";},500);
}
function itensTabela(itens){
  return `<table><thead><tr><th>Produto</th><th>Qtd</th><th>Valor</th></tr></thead><tbody>${itens.map(i=>`<tr><td>${i.produto}</td><td>${i.quantidade} ${i.tipo||""}</td><td class="right">${money(i.subtotal)}</td></tr>`).join("")}</tbody></table>`;
}


$("modalCancel").onclick=closeModal;

function permissoesPorCargo(cargo){
  const base={dashboard:false,vendas:false,mesas:false,comandas:false,estoque:false,entradas:false,clientes:false,fiados:false,funcionarios:false,caixa:false,financeiro:false,cancelamentos:false,devolucoes:false,relatorios:false,auditoria:false,configuracoes:false};
  if(cargo==="Administrador") Object.keys(base).forEach(k=>base[k]=true);
  if(cargo==="Gerente") Object.assign(base,{dashboard:true,vendas:true,mesas:true,comandas:true,estoque:true,entradas:true,clientes:true,fiados:true,caixa:true,financeiro:true,cancelamentos:true,devolucoes:true,relatorios:true,auditoria:true});
  if(cargo==="Caixa") Object.assign(base,{dashboard:true,vendas:true,clientes:true,fiados:true,caixa:true,cancelamentos:true,devolucoes:true});
  if(cargo==="Garçom") Object.assign(base,{dashboard:true,vendas:true,mesas:true,comandas:true});
  if(cargo==="Estoquista") Object.assign(base,{dashboard:true,estoque:true,entradas:true});
  if(cargo==="Financeiro") Object.assign(base,{dashboard:true,caixa:true,financeiro:true,cancelamentos:true,devolucoes:true,relatorios:true});
  return base;
}
function temPermissao(page){ if(!usuario) return false; if(usuario.cargo==="Administrador") return true; return !!(usuario.permissoes||{})[page]; }
function aplicarPermissoes(){ document.querySelectorAll("[data-page]").forEach(btn=>btn.classList.toggle("perm-hidden",!temPermissao(btn.dataset.page))); }
function primeiraPaginaPermitida(){ if(temPermissao("dashboard")) return "dashboard"; return PERM_PAGES.find(p=>temPermissao(p)) || "dashboard"; }

function entrarNoSistemaComo(f){
  usuario={
    nome:f.nome||f.usuario||"Usuário",
    usuario:f.usuario||"",
    cargo:f.cargo||"",
    permissoes:f.permissoes||permissoesPorCargo(f.cargo||"")
  };
  localStorage.setItem("bp_user",JSON.stringify(usuario));
  start();
}

$("btnLogin").onclick=async()=>{
  const u=$("loginUser").value.trim().toLowerCase();
  const s=$("loginPass").value.trim();
  $("loginErro").innerText="";

  if(!u || !s){
    $("loginErro").innerText="Digite usuário e senha.";
    return;
  }

  try{
    if(u==="henrique" && s==="38371450"){
      usuario={
        nome:"Henrique",
        usuario:"henrique",
        cargo:"Administrador",
        permissoes:permissoesPorCargo("Administrador")
      };
      localStorage.setItem("bp_user",JSON.stringify(usuario));
      await start();
      try{ await anon(); await auditar("LOGIN",usuario.nome); }catch(e){ console.warn("Auditoria/Auth não bloqueou o login:",e); }
      return;
    }

    await anon();
    const fs=await docs("funcionarios");
    const f=fs.find(x=>x.ativo!==false && (x.usuario||"").toLowerCase()===u && String(x.senhaInicial||"")===s);

    if(!f){
      $("loginErro").innerText="Usuário ou senha inválidos.";
      return;
    }

    usuario={
      nome:f.nome||u,
      usuario:f.usuario||u,
      cargo:f.cargo||"",
      permissoes:f.permissoes||permissoesPorCargo(f.cargo||"")
    };
    localStorage.setItem("bp_user",JSON.stringify(usuario));
    await start();
    try{ await auditar("LOGIN",usuario.nome); }catch(e){ console.warn("Auditoria não bloqueou o login:",e); }
  }catch(e){
    console.error("Erro no login:",e);
    $("loginErro").innerText="Não foi possível conectar ao sistema. Verifique internet/Firebase.";
  }
};

$("logout").onclick=async()=>{ try{ await auditar("LOGOUT",usuario?.nome||""); }catch(e){} localStorage.removeItem("bp_user"); location.reload(); };
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>show(b.dataset.page));
$("loginUser")?.addEventListener("keydown",e=>{if(e.key==="Enter") $("loginPass").focus();});
$("loginPass")?.addEventListener("keydown",e=>{if(e.key==="Enter") $("btnLogin").click();});

async function start(){
  usuario=JSON.parse(localStorage.getItem("bp_user")||"null");
  if(!usuario) return;

  $("login").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("who").innerText=`${usuario.nome} • ${usuario.cargo}`;
  aplicarPermissoes();

  try{ await loadAll(); }catch(e){ console.warn("Falha ao carregar dados iniciais:",e); }
  show(primeiraPaginaPermitida());
}

function show(page){
  if(!temPermissao(page)){ notify("Acesso não permitido.","erro"); return; }
  document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
  $(page).classList.remove("hidden");
  $("pageTitle").innerText={dashboard:"Dashboard",vendas:"Venda Balcão",mesas:"Mesas",estoque:"Estoque",entradas:"Entradas",clientes:"Clientes",fiados:"Fiados",funcionarios:"Funcionários",caixa:"Caixa",financeiro:"Financeiro",cancelamentos:"Cancelamentos",devolucoes:"Devoluções",relatorios:"Relatórios",auditoria:"Auditoria",configuracoes:"Configurações"}[page]||page;
  Promise.resolve().then(async()=>{
    if(page==="dashboard") await dashboard();
    if(page==="caixa") await loadCaixa();
    if(page==="financeiro") await loadFinanceiro();
    if(page==="cancelamentos") await loadCancelamentos();
    if(page==="devolucoes") await loadDevolucoes();
    if(page==="relatorios") await gerarRelatorio();
    if(page==="auditoria") await loadAuditoria();
    if(page==="configuracoes") await loadConfig();
  }).catch(e=>{
    console.error("Erro ao abrir página",page,e);
    notify("Erro ao carregar esta tela. Veja se o Firestore está configurado.","erro");
  });
}
async function loadAll(){ await loadProdutos(); await loadClientes(); await loadFuncionarios(); await loadFiados(); await loadMesas(); await loadVendasSelects(); await loadMovimentacoes(); await loadDevolucoes(false); }

async function baixarEstoque(produtoId,qtd){
  const ref=doc(db,"produtos",produtoId);
  const snap=await getDoc(ref);
  if(!snap.exists()) throw new Error("Produto não encontrado.");
  const p=snap.data();
  const atual=+p.estoqueAtual||0;
  if(atual<qtd) throw new Error("Estoque insuficiente para "+p.nome);
  await updateDoc(ref,{estoqueAtual:atual-qtd});
  await addDoc(collection(db,"movimentacoesEstoque"),{produtoId,produto:p.nome,tipo:"VENDA",quantidade:-qtd,usuario:usuario.nome,dataTexto:today(),dataHora:serverTimestamp()});
}


async function devolverEstoque(produtoId,qtd,motivo="DEVOLUCAO"){
  const ref=doc(db,"produtos",produtoId);
  const snap=await getDoc(ref);
  if(!snap.exists()) return;
  const p=snap.data();
  await updateDoc(ref,{estoqueAtual:(+p.estoqueAtual||0)+(+qtd||0)});
  await addDoc(collection(db,"movimentacoesEstoque"),{produtoId,produto:p.nome,tipo:motivo,quantidade:+qtd||0,usuario:usuario.nome,dataTexto:today(),dataHora:serverTimestamp()});
}

async function loadProdutos(){
  produtos=(await docs("produtos")).filter(p=>!p.schema);
  const produtosAtivos=produtos.filter(p=>p.ativo!==false);
  $("produtosList").innerHTML=produtos.map(p=>`<tr>
    <td>${p.nome||""}</td>
    <td>${p.codigoBarras||""}</td>
    <td>${p.categoria||""}</td>
    <td>${p.estoqueAtual||0}</td>
    <td>${p.estoqueMinimo||0}</td>
    <td>${money(p.precoVendaUnidade)}</td>
    <td>
      <span class="badge ${p.ativo===false?"yellow":((+p.estoqueAtual||0)<=(+p.estoqueMinimo||0)?"red":"green")}">${p.ativo===false?"INATIVO":((+p.estoqueAtual||0)<=(+p.estoqueMinimo||0)?"BAIXO":"ATIVO")}</span>
      <div class="table-actions">
        <button onclick="editarProduto('${p.id}')">Editar</button>
      </div>
    </td>
  </tr>`).join("");
  $("entradaProduto").innerHTML=produtosAtivos.map(p=>`<option value="${p.id}">${p.nome}</option>`).join(""); if($("devProduto")) $("devProduto").innerHTML=produtosAtivos.map(p=>`<option value="${p.id}">${p.nome}</option>`).join("");
}
$("novoProduto").onclick=()=>openModal("Novo Produto",`<input id="pNome" placeholder="Nome"><input id="pCodigoBarras" placeholder="Código de barras"><input id="pCategoria" placeholder="Categoria"><input id="pCompra" type="number" step="0.01" placeholder="Preço compra"><input id="pVenda" type="number" step="0.01" placeholder="Preço venda unidade"><input id="pVendaCaixa" type="number" step="0.01" placeholder="Preço venda caixa"><input id="pUnCaixa" type="number" placeholder="Unidades por caixa"><input id="pEstoque" type="number" placeholder="Estoque atual"><input id="pMin" type="number" placeholder="Estoque mínimo">`,async()=>{
  const p={nome:pNome.value,codigoBarras:(pCodigoBarras.value||"").trim(),categoria:pCategoria.value,precoCompra:+pCompra.value||0,precoVendaUnidade:+pVenda.value||0,precoVendaCaixa:+pVendaCaixa.value||0,unidadesPorCaixa:+pUnCaixa.value||1,estoqueAtual:+pEstoque.value||0,estoqueMinimo:+pMin.value||0,ativo:true,criadoEm:serverTimestamp()};
  await addDoc(collection(db,"produtos"),p); await auditar("PRODUTO_CRIADO",p.nome); closeModal(); await loadAll();
});
window.editarProduto=id=>{
  const p=produtos.find(x=>x.id===id);
  openModal("Editar Produto",`
    <input id="pNome" value="${p.nome||""}" placeholder="Nome">
    <input id="pCodigoBarras" value="${p.codigoBarras||""}" placeholder="Código de barras">
    <input id="pCategoria" value="${p.categoria||""}" placeholder="Categoria">
    <input id="pCompra" type="number" step="0.01" value="${p.precoCompra||0}" placeholder="Preço compra">
    <input id="pVenda" type="number" step="0.01" value="${p.precoVendaUnidade||0}" placeholder="Preço venda unidade">
    <input id="pVendaCaixa" type="number" step="0.01" value="${p.precoVendaCaixa||0}" placeholder="Preço venda caixa">
    <input id="pUnCaixa" type="number" value="${p.unidadesPorCaixa||1}" placeholder="Unidades por caixa">
    <input id="pEstoque" type="number" value="${p.estoqueAtual||0}" placeholder="Estoque atual">
    <input id="pMin" type="number" value="${p.estoqueMinimo||0}" placeholder="Estoque mínimo">
    <label>Status do produto</label>
    <select id="pAtivo">
      <option value="true" ${p.ativo!==false?"selected":""}>Ativo</option>
      <option value="false" ${p.ativo===false?"selected":""}>Inativo</option>
    </select>
    <hr style="border-color:#334155;margin:16px 0">
    <button id="btnExcluirProduto" class="bad" type="button">Excluir produto definitivamente</button>
    <p class="hint">Use "Inativo" para manter histórico. Excluir remove o cadastro do Firestore.</p>
  `,async()=>{
    const dadosProduto={
      nome:pNome.value,
      codigoBarras:(pCodigoBarras.value||"").trim(),
      categoria:pCategoria.value,
      precoCompra:+pCompra.value||0,
      precoVendaUnidade:+pVenda.value||0,
      precoVendaCaixa:+pVendaCaixa.value||0,
      unidadesPorCaixa:+pUnCaixa.value||1,
      estoqueAtual:+pEstoque.value||0,
      estoqueMinimo:+pMin.value||0,
      ativo:pAtivo.value==="true"
    };
    const mudouStatus=(p.ativo!==false)!==dadosProduto.ativo;
    const salvarProduto=async()=>{
      await updateDoc(doc(db,"produtos",id),dadosProduto);
      await auditar("PRODUTO_EDITADO",pNome.value);
      closeModal();
      notify("Produto atualizado com sucesso.","ok");
      await loadAll();
    };
    if(mudouStatus){
      solicitarAutorizacaoGerencia("Alterar status do produto",`Produto: ${p.nome||""} | Novo status: ${dadosProduto.ativo?"Ativo":"Inativo"}`,salvarProduto);
    }else{
      await salvarProduto();
    }
  });

  setTimeout(()=>{
    const btn=$("btnExcluirProduto");
    if(btn){
      btn.onclick=()=>{
        solicitarAutorizacaoGerencia(
          "Excluir produto",
          `Confirme a exclusão definitiva de ${p.nome||"este produto"}. O ideal é inativar produtos com histórico.`,
          async()=>{
            await deleteDoc(doc(db,"produtos",id));
            await auditar("PRODUTO_EXCLUIDO",p.nome||id);
            notify("Produto excluído com sucesso.","ok");
            await loadAll();
          }
        );
      };
    }
  },0);
};

window.desativarProduto=async id=>{
  const p=produtos.find(x=>x.id===id);
  await updateDoc(doc(db,"produtos",id),{ativo:false});
  await auditar("PRODUTO_INATIVADO",p?.nome||id);
  notify("Produto inativado.","ok");
  await loadAll();
};

$("registrarEntrada").onclick=async()=>{
  const p=produtos.find(x=>x.id===$("entradaProduto").value);
  if(!p){ notify("Cadastre um produto primeiro.","erro"); return; }
  const qtd=(+$("entradaCaixas").value||0)*(+p.unidadesPorCaixa||1)+ (+$("entradaUnidades").value||0);
  if(qtd<=0){ notify("Informe uma quantidade válida.","erro"); return; }
  await updateDoc(doc(db,"produtos",p.id),{estoqueAtual:(+p.estoqueAtual||0)+qtd});
  await addDoc(collection(db,"movimentacoesEstoque"),{produtoId:p.id,produto:p.nome,tipo:"ENTRADA",quantidade:qtd,fornecedor:$("entradaFornecedor").value,valorCompra:+$("entradaValor").value||0,observacao:$("entradaObs").value,usuario:usuario.nome,dataTexto:today(),dataHora:serverTimestamp()});
  await auditar("ENTRADA_ESTOQUE",`${p.nome} +${qtd}`); notify("Entrada registrada com sucesso.","ok"); await loadAll();
};
async function loadMovimentacoes(){ const m=await docs("movimentacoesEstoque"); $("movList").innerHTML=m.slice(-80).reverse().map(x=>`<tr><td>${x.produto||""}</td><td>${x.tipo||""}</td><td>${x.quantidade||0}</td><td>${x.usuario||""}</td><td>${x.dataTexto||""}</td></tr>`).join(""); }

async function loadClientes(){
  clientes=(await docs("clientes")).filter(c=>c.ativo!==false && !c.schema);
  $("clientesList").innerHTML=clientes.map(c=>`<tr><td>${c.nome||""}</td><td>${c.telefone||""}</td><td>${c.cpf||""}</td><td>${money(c.saldoDevedor)}<div class="table-actions"><button onclick="editarCliente('${c.id}')">Editar</button><button class="bad" onclick="desativarCliente('${c.id}')">Desativar</button></div></td></tr>`).join("");
}
$("novoCliente").onclick=()=>openModal("Novo Cliente",`<input id="cNome" placeholder="Nome completo"><input id="cTel" placeholder="Telefone"><input id="cCpf" placeholder="CPF"><input id="cNasc" type="date"><input id="cEnd" placeholder="Endereço"><textarea id="cObs" placeholder="Observações"></textarea>`,async()=>{
  const c={nome:cNome.value,telefone:cTel.value,cpf:cCpf.value,nascimento:cNasc.value,endereco:cEnd.value,observacoes:cObs.value,saldoDevedor:0,ativo:true,criadoEm:serverTimestamp()};
  await addDoc(collection(db,"clientes"),c); await auditar("CLIENTE_CRIADO",c.nome); closeModal(); await loadAll();
});
window.editarCliente=id=>{
  const c=clientes.find(x=>x.id===id);
  openModal("Editar Cliente",`<input id="cNome" value="${c.nome||""}"><input id="cTel" value="${c.telefone||""}"><input id="cCpf" value="${c.cpf||""}"><input id="cNasc" type="date" value="${c.nascimento||""}"><input id="cEnd" value="${c.endereco||""}"><textarea id="cObs">${c.observacoes||""}</textarea>`,async()=>{
    await updateDoc(doc(db,"clientes",id),{nome:cNome.value,telefone:cTel.value,cpf:cCpf.value,nascimento:cNasc.value,endereco:cEnd.value,observacoes:cObs.value});
    await auditar("CLIENTE_EDITADO",cNome.value); closeModal(); await loadAll();
  });
};
window.desativarCliente=async id=>{ const c=clientes.find(x=>x.id===id); await updateDoc(doc(db,"clientes",id),{ativo:false}); await auditar("CLIENTE_DESATIVADO",c?.nome||id); await loadAll(); };

function permissoesHtml(f={}){
  const p=f.permissoes||{};
  return `<h3>Permissões</h3>${PERM_PAGES.map(k=>`<label><input type="checkbox" id="perm_${k}" ${p[k]?"checked":""}> ${k}</label>`).join("")}`;
}
async function loadFuncionarios(){
  funcionarios=(await docs("funcionarios")).filter(f=>!f.schema);
  $("funcList").innerHTML=funcionarios.map(f=>`<tr>
    <td>${f.nome||""}</td>
    <td>${f.usuario||f.email||""}</td>
    <td>${f.cargo||""}</td>
    <td>
      <span class="badge ${f.ativo!==false?"green":"yellow"}">${f.ativo!==false?"ATIVO":"INATIVO"}</span>
      <div class="table-actions">
        <button onclick="editarFuncionario('${f.id}')">Editar</button>
      </div>
    </td>
  </tr>`).join("");
}
$("novoFuncionario").onclick=()=>openModal("Novo Funcionário",`<input id="fNome" placeholder="Nome completo"><input id="fEmail" placeholder="Email"><input id="fTel" placeholder="Telefone"><input id="fUsuario" placeholder="Usuário de login"><input id="fSenha" type="password" placeholder="Senha inicial"><select id="fCargo"><option>Administrador</option><option>Gerente</option><option>Caixa</option><option>Garçom</option><option>Estoquista</option><option>Financeiro</option></select>${permissoesHtml({permissoes:{}})}<p class="hint">Dica: salve e depois use Configurações para aplicar permissões padrão por cargo.</p>`,async()=>{
  const permissoes={}; PERM_PAGES.forEach(k=>permissoes[k]=$("perm_"+k)?.checked||false);
  const f={nome:fNome.value,email:fEmail.value,telefone:fTel.value,usuario:fUsuario.value.trim().toLowerCase(),senhaInicial:fSenha.value,cargo:fCargo.value,ativo:true,permissoes,criadoEm:serverTimestamp()};
  await addDoc(collection(db,"funcionarios"),f); await auditar("FUNCIONARIO_CRIADO",`${f.nome} - ${f.cargo}`); closeModal(); await loadAll();
});
window.editarFuncionario=id=>{
  const f=funcionarios.find(x=>x.id===id);
  openModal("Editar Funcionário",`
    <input id="fNome" value="${f.nome||""}" placeholder="Nome">
    <input id="fEmail" value="${f.email||""}" placeholder="Email">
    <input id="fTel" value="${f.telefone||""}" placeholder="Telefone">
    <input id="fUsuario" value="${f.usuario||""}" placeholder="Usuário de login">
    <input id="fSenha" type="password" value="${f.senhaInicial||""}" placeholder="Senha inicial">
    <select id="fCargo">${["Administrador","Gerente","Caixa","Garçom","Estoquista","Financeiro"].map(c=>`<option ${f.cargo===c?"selected":""}>${c}</option>`).join("")}</select>
    <label>Status do funcionário</label>
    <select id="fAtivo">
      <option value="true" ${f.ativo!==false?"selected":""}>Ativo</option>
      <option value="false" ${f.ativo===false?"selected":""}>Inativo</option>
    </select>
    ${permissoesHtml(f)}
    <hr style="border-color:#334155;margin:16px 0">
    <button id="btnExcluirFuncionario" class="bad" type="button">Excluir funcionário definitivamente</button>
    <p class="hint">Use "Inativo" para bloquear o acesso sem apagar o histórico. Excluir remove o cadastro.</p>
  `,async()=>{
    const permissoes={};
    PERM_PAGES.forEach(k=>permissoes[k]=$("perm_"+k)?.checked||false);
    const dadosFuncionario={
      nome:fNome.value,
      email:fEmail.value,
      telefone:fTel.value,
      usuario:fUsuario.value.trim().toLowerCase(),
      senhaInicial:fSenha.value,
      cargo:fCargo.value,
      ativo:fAtivo.value==="true",
      permissoes
    };
    const salvarFuncionario=async()=>{
      await updateDoc(doc(db,"funcionarios",id),dadosFuncionario);
      await auditar("FUNCIONARIO_EDITADO",fNome.value);
      closeModal();
      notify("Funcionário atualizado com sucesso.","ok");
      await loadAll();
      aplicarPermissoes();
    };
    solicitarAutorizacaoGerencia("Editar funcionário",`Alteração de acesso/permissões de ${f.nome||""}.`,salvarFuncionario);
  });

  setTimeout(()=>{
    const btn=$("btnExcluirFuncionario");
    if(btn){
      btn.onclick=()=>{
        solicitarAutorizacaoGerencia(
          "Excluir funcionário",
          `Confirme a exclusão definitiva de ${f.nome||"este funcionário"}. O ideal é inativar funcionários com histórico.`,
          async()=>{
            await deleteDoc(doc(db,"funcionarios",id));
            await auditar("FUNCIONARIO_EXCLUIDO",f.nome||id);
            notify("Funcionário excluído com sucesso.","ok");
            await loadAll();
          }
        );
      };
    }
  },0);
};

window.desativarFuncionario=async id=>{
  const f=funcionarios.find(x=>x.id===id);
  await updateDoc(doc(db,"funcionarios",id),{ativo:false});
  await auditar("FUNCIONARIO_INATIVADO",f?.nome||id);
  notify("Funcionário inativado.","ok");
  await loadAll();
};

async function loadFiados(){
  $("fiadosList").innerHTML=clientes.filter(c=>+c.saldoDevedor>0).map(c=>`<tr><td>${c.nome}</td><td>${c.telefone||""}</td><td>${money(c.saldoDevedor)}</td><td><button onclick="receberFiado('${c.id}')">Receber</button></td></tr>`).join("");
}
window.receberFiado=id=>{
  const c=clientes.find(x=>x.id===id);
  openModal("Receber Fiado",`<p>${c.nome} deve <b>${money(c.saldoDevedor)}</b></p><input id="pgValor" type="number" step="0.01" placeholder="Valor recebido"><select id="pgForma"><option>PIX</option><option>DINHEIRO</option><option>CREDITO</option><option>DEBITO</option></select>`,async()=>{
    const v=+pgValor.value||0; if(v<=0){notify("Informe um valor válido.","erro");return;}
    await updateDoc(doc(db,"clientes",id),{saldoDevedor:Math.max(0,+c.saldoDevedor-v)});
    await addDoc(collection(db,"pagamentosFiado"),{clienteId:id,cliente:c.nome,valor:v,formaPagamento:pgForma.value,dataTexto:today(),dataHora:serverTimestamp()});
    await addDoc(collection(db,"financeiro"),{tipo:"ENTRADA",categoria:"Recebimento de Fiado",valor:v,observacao:c.nome+" / "+pgForma.value,dataTexto:today(),dataHora:serverTimestamp()});
    await auditar("FIADO_RECEBIDO",`${c.nome} ${money(v)}`); closeModal(); await loadAll();
  });
};

$("criarMesas").onclick=async()=>{
  const n=+$("qtdMesasCriar").value||12;
  const mesas=await docs("mesas");
  const existentes=new Set(mesas.map(m=>+m.numero));
  let criadas=0;
  for(let i=1;i<=n;i++){
    if(!existentes.has(i)){
      await addDoc(collection(db,"mesas"),{numero:i,status:"LIVRE",responsavel:"",telefone:"",garcom:"",comandaId:"",criadoEm:serverTimestamp()});
      criadas++;
    }
  }
  notify(criadas?`${criadas} mesa(s) criada(s).`:`As mesas de 1 até ${n} já existem.`,"ok");
  await loadMesas(); await dashboard();
};
async function loadMesas(){
  const mesas=await docs("mesas");
  $("mesasGrid").innerHTML=mesas.sort((a,b)=>(+a.numero)-(+b.numero)).map(m=>`<div class="mesa">
    <div onclick="clicarMesa('${m.id}','${m.status}',${m.numero},'${m.comandaId||""}')">
      <h3>Mesa ${m.numero}</h3>
      <span class="badge ${m.status==="LIVRE"?"green":m.status==="OCUPADA"?"red":"yellow"}">${m.status}</span>
      <p>${m.responsavel||"Livre"}</p>
    </div>
    <div class="table-actions">
      <button class="bad" onclick="excluirMesa(event,'${m.id}','${m.status}',${m.numero})">Excluir</button>
    </div>
  </div>`).join("");
}

window.excluirMesa=async(event,id,status,numero)=>{
  event.stopPropagation();
  if(status!=="LIVRE"){
    notify("Só é possível excluir mesa livre. Feche a comanda antes.","erro");
    return;
  }
  openModal("Excluir Mesa",`
    <p>Tem certeza que deseja excluir a <b>Mesa ${numero}</b>?</p>
    <p class="hint">Essa ação remove a mesa do sistema. Se precisar dela novamente, use o botão "Criar mesas sem duplicar".</p>
  `,async()=>{
    solicitarAutorizacaoGerencia("Excluir mesa",`Exclusão da Mesa ${numero}.`,async(aprovado)=>{
      await deleteDoc(doc(db,"mesas",id));
      await auditar("MESA_EXCLUIDA",`Mesa ${numero} | Autorizado por ${aprovado.nome||aprovado.usuario}`);
      closeModal();
      notify("Mesa excluída com sucesso.","ok");
      await loadMesas();
      await dashboard();
    });
  });
};

window.clicarMesa=(id,status,numero,comandaId)=>{
  if(status==="LIVRE"){
    openModal("Abrir Mesa "+numero,`<input id="mesaResp" placeholder="Responsável"><input id="mesaTel" placeholder="Telefone"><input id="mesaGarcom" placeholder="Garçom">`,async()=>{
      const c=await addDoc(collection(db,"comandas"),{mesaId:id,mesa:numero,responsavel:mesaResp.value,telefone:mesaTel.value,garcom:mesaGarcom.value,status:"ABERTA",total:0,abertaEm:serverTimestamp(),dataTexto:today()});
      await updateDoc(doc(db,"mesas",id),{status:"OCUPADA",responsavel:mesaResp.value,telefone:mesaTel.value,garcom:mesaGarcom.value,comandaId:c.id});
      await auditar("MESA_ABERTA","Mesa "+numero); closeModal(); await loadAll(); await abrirComanda(c.id);
    });
  }else if(comandaId) abrirComanda(comandaId);
};

function imprimirComanda(c,itens){
  const bruto=+c.total||0;
  const desconto=+$("cmdDesconto")?.value||0;
  const total=Math.max(0,bruto-desconto);
  printHtml(`
    <h2>Bar Piraí ERP</h2>
    <p><b>Conta da Mesa ${c.mesa||""}</b></p>
    <p>Responsável: ${c.responsavel||""}</p>
    <p>Garçom: ${c.garcom||""}</p>
    <p>Data: ${today()}</p>
    ${itensTabela(itens)}
    <p class="right">Subtotal: <b>${money(bruto)}</b></p>
    <p class="right">Desconto: <b>${money(desconto)}</b></p>
    <h3 class="right">Total: ${money(total)}</h3>
  `);
}

async function abrirComanda(id){
  const snap=await getDoc(doc(db,"comandas",id)); if(!snap.exists()){notify("Comanda não encontrada.","erro");return;}
  const c={id,...snap.data()};
  const itensSnap=await getDocs(collection(db,"comandas",id,"itens"));
  const itens=itensSnap.docs.map(d=>({id:d.id,...d.data()}));
  openModal(`Comanda Mesa ${c.mesa}`,`<p>Responsável: <b>${c.responsavel}</b> | Garçom: ${c.garcom||""}</p><div>${itens.map(i=>`<div class="cart-item"><span>${i.quantidade} ${i.tipo} - ${i.produto}: <b>${money(i.subtotal)}</b></span><button class="bad" onclick="removerItemComanda('${id}','${i.id}',${i.subtotal||0})">Remover</button></div>`).join("")||"Nenhum item."}</div><h2>${money(c.total)}</h2><hr><input id="barcodeComanda" class="barcode-input" placeholder="Ler código de barras para adicionar na comanda" autocomplete="off"><select id="cmdProduto">${produtos.map(p=>`<option value="${p.id}">${p.nome}</option>`).join("")}</select><input id="cmdQtd" type="number" value="1" min="1"><select id="cmdTipo"><option>UNIDADE</option><option>CAIXA</option></select><button id="cmdAdd" class="ok">Adicionar Item</button><hr><select id="cmdPag"><option>PIX</option><option>DINHEIRO</option><option>CREDITO</option><option>DEBITO</option><option>FIADO</option></select><select id="cmdBandeira" class="hidden"><option value="">Bandeira do cartão</option><option>Visa</option><option>Mastercard</option><option>Elo</option><option>Hipercard</option><option>American Express</option><option>Outra</option></select><select id="cmdCliente"><option value="">Cliente para fiado</option>${clientes.map(x=>`<option value="${x.id}">${x.nome}</option>`).join("")}</select><input id="cmdRecebido" type="number" placeholder="Valor recebido"><input id="cmdDesconto" type="number" step="0.01" value="0" placeholder="Desconto no total da comanda"><button id="cmdImprimir" class="ghost">Imprimir conta</button><button id="cmdFechar" class="bad">Fechar Comanda</button>`,closeModal);
  const atualizarCamposComanda=()=>{
    const forma=$("cmdPag").value;
    $("cmdBandeira").classList.toggle("hidden",!(forma==="CREDITO"||forma==="DEBITO"));
  };
  $("cmdPag").onchange=atualizarCamposComanda;
  atualizarCamposComanda();
  $("cmdImprimir").onclick=()=>imprimirComanda(c,itens);
  async function adicionarItemComandaPorProduto(p,q=1,tipo="UNIDADE"){
    if(!p){notify("Cadastre um produto primeiro.","erro");return;}
    const unidades=tipo==="CAIXA"?q*(+p.unidadesPorCaixa||1):q;
    if((+p.estoqueAtual||0)<unidades){notify("Estoque insuficiente para este produto.","erro");return;}
    const valor=tipo==="CAIXA"?(+p.precoVendaCaixa||(+p.precoVendaUnidade*(+p.unidadesPorCaixa||1))):+p.precoVendaUnidade;
    const sub=q*valor;
    await addDoc(collection(db,"comandas",id,"itens"),{produtoId:p.id,produto:p.nome,quantidade:q,tipo,unidadesVendidas:unidades,valorUnitario:valor,subtotal:sub,codigoBarras:p.codigoBarras||"",dataHora:serverTimestamp()});
    await updateDoc(doc(db,"comandas",id),{total:(+c.total||0)+sub});
    await auditar("ITEM_ADICIONADO",p.nome);
    closeModal();
    await loadAll();
    await abrirComanda(id);
  }

  const barcodeComanda=$("barcodeComanda");
  if(barcodeComanda){
    barcodeComanda.addEventListener("keydown",async e=>{
      if(e.key==="Enter"){
        e.preventDefault();
        const p=produtoPorCodigo(barcodeComanda.value);
        if(!p){notify("Código de barras não encontrado.","erro");return;}
        await adicionarItemComandaPorProduto(p,1,"UNIDADE");
      }
    });
  }

  $("cmdAdd").onclick=async()=>{
    const p=produtos.find(x=>x.id===cmdProduto.value);
    const q=+cmdQtd.value||1;
    const tipo=cmdTipo.value;
    await adicionarItemComandaPorProduto(p,q,tipo);
  };
  $("cmdFechar").onclick=async()=>{
    const descontoComandaFinal=+$("cmdDesconto")?.value||0;
    const totalComandaFinal=Math.max(0,(+c.total||0)-descontoComandaFinal);

    if((cmdPag.value==="CREDITO"||cmdPag.value==="DEBITO") && !cmdBandeira.value){notify("Selecione a bandeira do cartão.","erro");return;}
    if(cmdPag.value==="FIADO" && !cmdCliente.value){notify("Selecione o cliente.","erro");return;}

    const executarFechamentoComanda=async(aprovadoDesconto=null)=>{
      const its=(await getDocs(collection(db,"comandas",id,"itens"))).docs.map(d=>d.data());
      for(const it of its) await baixarEstoque(it.produtoId,+it.unidadesVendidas||0);

      if(cmdPag.value==="FIADO"){
      const cli=clientes.find(x=>x.id===cmdCliente.value);
      await updateDoc(doc(db,"clientes",cli.id),{saldoDevedor:+cli.saldoDevedor+totalComandaFinal});
      await addDoc(collection(db,"fiados"),{clienteId:cli.id,cliente:cli.nome,valor:totalComandaFinal,origem:"COMANDA",status:"ABERTO",dataTexto:today(),dataHora:serverTimestamp()});
    }

    const venda=await addDoc(collection(db,"vendas"),{tipo:"COMANDA",valorBruto:+c.total,desconto:descontoComandaFinal,valorTotal:totalComandaFinal,formaPagamento:cmdPag.value,bandeiraCartao:cmdBandeira.value||"",descontoAutorizadoPor:aprovadoDesconto?(aprovadoDesconto.nome||aprovadoDesconto.usuario):"",dataTexto:today(),dataHora:serverTimestamp()});
    for(const it of its) await addDoc(collection(db,"vendas",venda.id,"itens"),it);

    await updateDoc(doc(db,"comandas",id),{status:"FECHADA",valorBruto:+c.total,desconto:descontoComandaFinal,totalFinal:totalComandaFinal,fechadaEm:serverTimestamp()});
    if(c.mesaId) await updateDoc(doc(db,"mesas",c.mesaId),{status:"LIVRE",responsavel:"",telefone:"",garcom:"",comandaId:""});
    await auditar("COMANDA_FECHADA",`Mesa ${c.mesa} ${money(totalComandaFinal)}`);
    closeModal();
    notify("Comanda fechada com sucesso.","ok");
    await loadAll();
      show("mesas");
    };

    if(descontoComandaFinal>0){
      solicitarAutorizacaoGerencia("Autorizar desconto na comanda",`Desconto de ${money(descontoComandaFinal)} na Mesa ${c.mesa}.`,executarFechamentoComanda);
    }else{
      await executarFechamentoComanda();
    }
  };
}
window.removerItemComanda=async(comandaId,itemId,subtotal)=>{
  if(!confirmar("Remover item da comanda?")) return;
  const cSnap=await getDoc(doc(db,"comandas",comandaId)); const c=cSnap.data();
  await deleteDoc(doc(db,"comandas",comandaId,"itens",itemId));
  await updateDoc(doc(db,"comandas",comandaId),{total:Math.max(0,(+c.total||0)-(+subtotal||0))});
  await auditar("ITEM_REMOVIDO",`${money(subtotal)}`); closeModal(); await abrirComanda(comandaId);
};

async function loadVendasSelects(){
  $("vProduto").innerHTML=produtos.map(p=>`<option value="${p.id}">${p.nome}</option>`).join("");
  $("clienteFiado").innerHTML='<option value="">Selecione o cliente para fiado</option>'+clientes.map(c=>`<option value="${c.id}">${c.nome}</option>`).join("");
  renderCart(); atualizarCamposPagamento(); configurarLeitorVenda();
}

function normalizarCodigoBarras(codigo){
  return String(codigo||"").trim().replace(/\s+/g,"");
}
function produtoPorCodigo(codigo){
  const c=normalizarCodigoBarras(codigo);
  if(!c) return null;
  return produtos.find(p=>p.ativo!==false && normalizarCodigoBarras(p.codigoBarras)===c) || null;
}
function selecionarProdutoPorCodigo(codigo, origem="venda"){
  const p=produtoPorCodigo(codigo);
  if(!p){
    notify("Código de barras não encontrado.","erro");
    return null;
  }
  if(origem==="venda" && $("vProduto")){
    $("vProduto").value=p.id;
    $("vQtd").value=1;
    $("vTipo").value="UNIDADE";
    adicionarProdutoCarrinho(p,1,"UNIDADE");
    $("barcodeVenda").value="";
    $("barcodeVenda").focus();
  }
  return p;
}
function adicionarProdutoCarrinho(p,q,tipo){
  const unidades=tipo==="CAIXA"?q*(+p.unidadesPorCaixa||1):q;
  if((+p.estoqueAtual||0)<unidades){ notify("Estoque insuficiente para este produto.","erro"); return; }
  const valor=tipo==="CAIXA"?(+p.precoVendaCaixa||(+p.precoVendaUnidade*(+p.unidadesPorCaixa||1))):+p.precoVendaUnidade;
  cart.push({produtoId:p.id,produto:p.nome,quantidade:q,tipo,unidadesVendidas:unidades,valorUnitario:valor,subtotal:q*valor,codigoBarras:p.codigoBarras||""});
  renderCart();
  notify(`${p.nome} adicionado ao carrinho.`,"ok");
}
function configurarLeitorVenda(){
  const input=$("barcodeVenda");
  if(!input || input.dataset.configurado==="1") return;
  input.dataset.configurado="1";
  input.addEventListener("keydown",e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      selecionarProdutoPorCodigo(input.value,"venda");
    }
  });
}

function renderCart(){ $("cart").innerHTML=cart.map((i,k)=>`<div class="cart-item"><span>${i.quantidade} ${i.tipo} - ${i.produto}</span><b>${money(i.subtotal)}</b><button class="bad" onclick="removeCart(${k})">X</button></div>`).join(""); const bruto=cart.reduce((a,i)=>a+i.subtotal,0); const desc=+$("descontoVenda")?.value||0; $("cartTotal").innerText=money(Math.max(0,bruto-desc)); }
window.removeCart=i=>{ cart.splice(i,1); renderCart(); };
$("addVenda").onclick=()=>{
  const p=produtos.find(x=>x.id===$("vProduto").value);
  if(!p){notify("Cadastre um produto primeiro.","erro");return;}
  const q=+$("vQtd").value||1, tipo=$("vTipo").value;
  adicionarProdutoCarrinho(p,q,tipo);
};
function atualizarCamposPagamento(){
  const forma=$("pagamento").value;
  const isCartao=forma==="CREDITO"||forma==="DEBITO";
  const isMisto=forma==="MISTO";
  const isFiado=forma==="FIADO";

  if($("bandeiraCartao")) $("bandeiraCartao").classList.toggle("hidden",!(isCartao||isMisto));
  if($("pagamentoMistoBox")) $("pagamentoMistoBox").classList.toggle("hidden",!isMisto);
  if($("recebido")) $("recebido").classList.toggle("hidden",!(forma==="DINHEIRO"||isMisto));
  if($("clienteFiado")) $("clienteFiado").classList.toggle("hidden",!(isFiado||isMisto));

  if(!isCartao && !isMisto && $("bandeiraCartao")) $("bandeiraCartao").value="";
  if(!isFiado && !isMisto && $("clienteFiado")) $("clienteFiado").value="";
  if(forma!=="DINHEIRO" && !isMisto && $("recebido")) $("recebido").value="";
  if(!isMisto){
    ["mistoPix","mistoDinheiro","mistoCredito","mistoDebito","mistoFiado"].forEach(id=>{ if($(id)) $(id).value=""; });
  }
}
$("pagamento").onchange=atualizarCamposPagamento;
if($("descontoVenda")) $("descontoVenda").oninput=renderCart;
if($("imprimirVendaPreview")) $("imprimirVendaPreview").onclick=()=>imprimirVendaPreview();
$("recebido").oninput=()=>{ const bruto=cart.reduce((a,i)=>a+i.subtotal,0); const desconto=+$("descontoVenda")?.value||0; const total=Math.max(0,bruto-desconto); $("troco").innerText=$("pagamento").value==="DINHEIRO"?"Troco: "+money((+$("recebido").value||0)-total):""; };

function imprimirVendaPreview(){
  const bruto=cart.reduce((a,i)=>a+i.subtotal,0);
  const desconto=+$("descontoVenda")?.value||0;
  const total=Math.max(0,bruto-desconto);
  const forma=$("pagamento")?.value||"";
  printHtml(`
    <h2>Bar Piraí ERP</h2>
    <p><b>Prévia da venda balcão</b></p>
    <p>Data: ${today()}</p>
    ${itensTabela(cart)}
    <p class="right">Subtotal: <b>${money(bruto)}</b></p>
    <p class="right">Desconto: <b>${money(desconto)}</b></p>
    <h3 class="right">Total: ${money(total)}</h3>
    <p>Pagamento: ${forma}</p>
  `);
}

$("finalizarVenda").onclick=async()=>{
  const bruto=cart.reduce((a,i)=>a+i.subtotal,0);
  const desconto=+$("descontoVenda")?.value||0;
  const total=Math.max(0,bruto-desconto);
  if(!cart.length){notify("O carrinho está vazio.","erro");return;}
  const forma=$("pagamento").value;
  let detalhesPagamento={forma}, fiadoValor=0;
  if((forma==="CREDITO"||forma==="DEBITO") && !$("bandeiraCartao").value){notify("Selecione a bandeira.","erro");return;}
  if(forma==="DINHEIRO" && (+$("recebido").value||0)<total){notify("Valor recebido insuficiente.","erro");return;}
  if(forma==="FIADO"){ if(!$("clienteFiado").value){notify("Selecione um cliente.","erro");return;} fiadoValor=total; }
  if(forma==="MISTO"){
    const pix=+$("mistoPix").value||0, dinheiro=+$("mistoDinheiro").value||0, credito=+$("mistoCredito").value||0, debito=+$("mistoDebito").value||0, fiado=+$("mistoFiado").value||0;
    if(Math.abs((pix+dinheiro+credito+debito+fiado)-total)>0.01){notify("A soma do pagamento misto precisa bater com o total.","erro");return;}
    if((credito>0||debito>0) && !$("bandeiraCartao").value){notify("Selecione a bandeira.","erro");return;}
    if(fiado>0 && !$("clienteFiado").value){notify("Selecione um cliente para a parte fiada.","erro");return;}
    detalhesPagamento={forma,pix,dinheiro,credito,debito,fiado,bandeira:$("bandeiraCartao").value||""};
    fiadoValor=fiado;
  }
  const executarFinalizacaoVenda=async(aprovadoDesconto=null)=>{
    for(const i of cart) await baixarEstoque(i.produtoId,+i.unidadesVendidas);
    const venda=await addDoc(collection(db,"vendas"),{tipo:"BALCAO",valorBruto:bruto,desconto,valorTotal:total,formaPagamento:forma,bandeiraCartao:$("bandeiraCartao").value||"",detalhesPagamento,descontoAutorizadoPor:aprovadoDesconto?(aprovadoDesconto.nome||aprovadoDesconto.usuario):"",dataTexto:today(),dataHora:serverTimestamp()});
  for(const i of cart) await addDoc(collection(db,"vendas",venda.id,"itens"),i);
  if(fiadoValor>0){
    const c=clientes.find(x=>x.id===$("clienteFiado").value);
    await updateDoc(doc(db,"clientes",c.id),{saldoDevedor:+c.saldoDevedor+fiadoValor});
    await addDoc(collection(db,"fiados"),{clienteId:c.id,cliente:c.nome,valor:fiadoValor,origem:forma==="MISTO"?"BALCAO_MISTO":"BALCAO",status:"ABERTO",dataTexto:today(),dataHora:serverTimestamp()});
  }
  await auditar("VENDA_FINALIZADA",`${forma} ${money(total)}${aprovadoDesconto?(" | Desconto autorizado por "+(aprovadoDesconto.nome||aprovadoDesconto.usuario)):""}`);
    notify("Venda finalizada com sucesso.","ok");
    cart=[];
    if($("descontoVenda")) $("descontoVenda").value=0;
    await loadAll();
    show("vendas");
  };

  if(desconto>0){
    solicitarAutorizacaoGerencia("Autorizar desconto",`Desconto de ${money(desconto)} na venda balcão.`,executarFinalizacaoVenda);
  }else{
    await executarFinalizacaoVenda();
  }
};

function valorRecebidoPorForma(vendas, forma){
  let total=0;
  vendas.forEach(v=>{
    if(v.formaPagamento===forma) total+=+v.valorTotal||0;
    if(v.formaPagamento==="MISTO" && v.detalhesPagamento){
      const k=forma==="PIX"?"pix":forma==="DINHEIRO"?"dinheiro":forma==="CREDITO"?"credito":forma==="DEBITO"?"debito":"";
      if(k) total+=+v.detalhesPagamento[k]||0;
    }
  });
  return total;
}
async function loadFinanceiro(){
  const lanc=await docs("financeiro"), vendas=(await docs("vendas")).filter(v=>!v.cancelada);
  const pix=valorRecebidoPorForma(vendas,"PIX"), dinheiro=valorRecebidoPorForma(vendas,"DINHEIRO"), credito=valorRecebidoPorForma(vendas,"CREDITO"), debito=valorRecebidoPorForma(vendas,"DEBITO");
  let entradas=0, saidas=0;
  $("financeiroList").innerHTML=lanc.sort((a,b)=>(b.dataTexto||"").localeCompare(a.dataTexto||"")).map(l=>{ if(l.tipo==="ENTRADA") entradas+=+l.valor||0; if(l.tipo==="SAIDA") saidas+=+l.valor||0; return`<tr><td>${l.tipo}</td><td>${l.categoria||""}</td><td>${money(l.valor)}</td><td>${l.observacao||""}</td><td>${l.dataTexto||""}</td></tr>`; }).join("");
  const saldo=pix+dinheiro+credito+debito+entradas-saidas;
  $("finPix").innerText=money(pix); $("finDinheiro").innerText=money(dinheiro); $("finCredito").innerText=money(credito); $("finDebito").innerText=money(debito); $("finEntradas").innerText=money(entradas); $("finSaidas").innerText=money(saidas); $("finSaldo").innerText=money(saldo); $("dashSaldo").innerText=money(saldo);
}
function abrirLancamentoFinanceiro(tipo){
  const entrada=`<option>Recebimento de Fiado</option><option>Aporte do Proprietário</option><option>Empréstimo Recebido</option><option>Ajuste Positivo de Caixa</option><option>Outras Receitas</option>`;
  const saida=`<option>Sangria</option><option>Fornecedor</option><option>Compra de Mercadoria</option><option>Água</option><option>Energia</option><option>Internet</option><option>Salário</option><option>Vale Funcionário</option><option>Impostos</option><option>Ajuste Negativo de Caixa</option><option>Outras Despesas</option>`;
  openModal(tipo==="ENTRADA"?"Nova Entrada Financeira":"Nova Saída / Sangria",`<input id="finValor" type="number" step="0.01" placeholder="Valor"><select id="finCat">${tipo==="ENTRADA"?entrada:saida}</select><textarea id="finObs" placeholder="Observação"></textarea>`,async()=>{
    const l={tipo,categoria:finCat.value,valor:+finValor.value||0,observacao:finObs.value,dataTexto:today(),dataHora:serverTimestamp()};
    await addDoc(collection(db,"financeiro"),l); await auditar(tipo==="ENTRADA"?"ENTRADA_FINANCEIRA":"SAIDA_FINANCEIRA",`${l.categoria} ${money(l.valor)}`); closeModal(); await loadFinanceiro(); await dashboard();
  });
}
$("novaEntrada").onclick=()=>abrirLancamentoFinanceiro("ENTRADA");
$("novaSaida").onclick=()=>abrirLancamentoFinanceiro("SAIDA");

async function caixaAberto(){ const caixas=await docs("caixas"); return caixas.find(c=>c.status==="ABERTO")||null; }
async function obterResumoCaixa(){
  const caixas=await docs("caixas");
  const financeiro=(await docs("financeiro")).filter(l=>!l.cancelado);
  const vendas=(await docs("vendas")).filter(v=>!v.cancelada);

  const aberto=caixas.find(c=>c.status==="ABERTO")||null;
  const fechados=caixas.filter(c=>c.status==="FECHADO");

  if(!caixas.length){
    return {caixas:[],aberto:null,valorInicial:0,entradasDinheiro:0,saidas:0,saldoEsperado:0,diferencaAberto:0,diferencaFechados:0,caixaAberto:false};
  }

  const dataBase=aberto?.dataAberturaTexto||today();
  let entradasDinheiro=0, saidas=0;

  if(aberto){
    vendas.filter(v=>(v.dataTexto||"")>=dataBase).forEach(v=>{
      if(v.formaPagamento==="DINHEIRO") entradasDinheiro+=+v.valorTotal||0;
      if(v.formaPagamento==="MISTO"&&v.detalhesPagamento) entradasDinheiro+=+v.detalhesPagamento.dinheiro||0;
    });
    financeiro.filter(l=>(l.dataTexto||"")>=dataBase).forEach(l=>{
      if(l.tipo==="ENTRADA") entradasDinheiro+=+l.valor||0;
      if(l.tipo==="SAIDA") saidas+=+l.valor||0;
    });
  }

  const valorInicial=+aberto?.valorInicial||0;
  const saldoEsperado=aberto ? valorInicial+entradasDinheiro-saidas : 0;
  const diferencaAberto=aberto && aberto.valorFinal!=null ? (+aberto.valorFinal||0)-saldoEsperado : 0;
  const diferencaFechados=fechados.reduce((a,c)=>a+(+c.diferenca||0),0);

  return {caixas,aberto,valorInicial,entradasDinheiro,saidas,saldoEsperado,diferencaAberto,diferencaFechados,caixaAberto:!!aberto};
}

async function loadCaixa(){
  const resumo=await obterResumoCaixa();

  $("caixaStatus").innerText=resumo.caixaAberto?"Aberto":"Fechado";
  $("dashCaixa").innerText=resumo.caixaAberto?"Sim":"Não";
  $("caixaInicial").innerText=money(resumo.valorInicial);
  $("caixaEntradas").innerText=money(resumo.entradasDinheiro);
  $("caixaSaidas").innerText=money(resumo.saidas);
  $("caixaSaldo").innerText=money(resumo.saldoEsperado);

  if($("caixaDiferenca")) $("caixaDiferenca").innerText=money(resumo.caixaAberto?resumo.diferencaAberto:resumo.diferencaFechados);
  if($("dashDiferencaCaixa")) $("dashDiferencaCaixa").innerText=money(resumo.diferencaFechados);

  const inicio=$("caixaDataInicio")?.value||"";
  const fim=$("caixaDataFim")?.value||"";
  const lista=resumo.caixas.filter(c=>{
    const d=c.dataAberturaTexto||"";
    if(inicio && d<inicio) return false;
    if(fim && d>fim) return false;
    return true;
  }).sort((a,b)=>(b.dataAberturaTexto||"").localeCompare(a.dataAberturaTexto||""));

  $("caixaList").innerHTML=lista.length?lista.map(c=>`<tr>
    <td>${c.status||""}</td>
    <td>${money(c.valorInicial)}</td>
    <td>${c.saldoEsperado!=null?money(c.saldoEsperado):"-"}</td>
    <td>${c.valorFinal!=null?money(c.valorFinal):"-"}</td>
    <td>${c.diferenca!=null?money(c.diferenca):"-"}</td>
    <td>${c.usuario||""}</td>
    <td>${c.dataAberturaTexto||""}</td>
  </tr>`).join(""):'<tr><td colspan="7">Nenhum caixa encontrado.</td></tr>';
}
$("abrirCaixa").onclick=async()=>{ if(await caixaAberto()){notify("Já existe um caixa aberto.","erro");return;} const valor=+$("valorInicialCaixa").value||0; await addDoc(collection(db,"caixas"),{status:"ABERTO",valorInicial:valor,usuario:usuario.nome,dataAberturaTexto:today(),abertoEm:serverTimestamp()}); await auditar("CAIXA_ABERTO",money(valor)); await loadCaixa(); await dashboard(); };
$("fecharCaixa").onclick=async()=>{
  const aberto=await caixaAberto();
  if(!aberto){notify("Não existe caixa aberto.","erro");return;}

  await loadCaixa();

  const valorInicial=+aberto.valorInicial||0;
  const entradasTxt=$("caixaEntradas").innerText;
  const saidasTxt=$("caixaSaidas").innerText;
  const esperadoTxt=$("caixaSaldo").innerText;
  const esperadoNum=Number(esperadoTxt.replace("R$ ","").replace(/\./g,"").replace(",","."))||0;

  openModal("Fechamento de Caixa",`
    <div class="fechamento-grid">
      <div class="detalhe-box"><b>Status</b><br>Aberto</div>
      <div class="detalhe-box"><b>Valor inicial</b><br>${money(valorInicial)}</div>
      <div class="detalhe-box"><b>Entradas em dinheiro</b><br>${entradasTxt}</div>
      <div class="detalhe-box"><b>Sangrias/Saídas</b><br>${saidasTxt}</div>
      <div class="detalhe-box destaque"><b>Saldo esperado</b><br>${esperadoTxt}</div>
    </div>

    <hr style="border-color:#334155;margin:16px 0">

    <label>Valor contado no caixa</label>
    <input id="valorContadoCaixa" type="number" step="0.01" value="${esperadoNum.toFixed(2)}">

    <label>Observação do fechamento</label>
    <textarea id="obsFechamentoCaixa" placeholder="Ex.: caixa conferido, sobra, falta, conferência manual..."></textarea>

    <div id="diferencaCaixaBox" class="alerta-caixa">Diferença: R$ 0,00</div>
  `,async()=>{
    const contado=+valorContadoCaixa.value||0;
    const diferenca=contado-esperadoNum;

    solicitarAutorizacaoGerencia("Fechar caixa",`Fechamento com esperado ${money(esperadoNum)}, contado ${money(contado)} e diferença ${money(diferenca)}.`,async(aprovado)=>{
      await updateDoc(doc(db,"caixas",aberto.id),{
        status:"FECHADO",
        valorFinal:contado,
        saldoEsperado:esperadoNum,
        diferenca,
        observacaoFechamento:obsFechamentoCaixa.value,
        fechadoPor:usuario.nome,
        autorizadoPor:aprovado.nome||aprovado.usuario,
        dataFechamentoTexto:today(),
        fechadoEm:serverTimestamp()
      });

      await auditar("CAIXA_FECHADO",`Esperado: ${money(esperadoNum)} | Contado: ${money(contado)} | Diferença: ${money(diferenca)} | Autorizado por ${aprovado.nome||aprovado.usuario}`);
      notify("Caixa fechado com sucesso.","ok");
      await loadCaixa();
      await dashboard();
    });
  });

  setTimeout(()=>{
    const input=$("valorContadoCaixa");
    const box=$("diferencaCaixaBox");
    if(input && box){
      input.oninput=()=>{
        const contado=+input.value||0;
        const dif=contado-esperadoNum;
        box.textContent="Diferença: "+money(dif);
        box.className="alerta-caixa "+(dif===0?"ok":dif>0?"sobra":"falta");
      };
    }
  },0);
};

if($("filtrarCaixa")) $("filtrarCaixa").onclick=loadCaixa;


async function loadCancelamentos(){
  const vendas=await docs("vendas");
  const busca=($("cancelBusca")?.value||"").toLowerCase();
  const lista=vendas.filter(v=>{
    const txt=JSON.stringify(v).toLowerCase();
    return !busca || txt.includes(busca);
  }).sort((a,b)=>(b.dataTexto||"").localeCompare(a.dataTexto||""));

  $("cancelamentosList").innerHTML=lista.map(v=>`<tr>
    <td>${v.tipo||""}</td>
    <td>${v.formaPagamento||""}${v.bandeiraCartao?"/"+v.bandeiraCartao:""}</td>
    <td>${money(v.valorTotal)}</td>
    <td><span class="badge ${v.cancelada?"red":"green"}">${v.cancelada?"CANCELADA":"ATIVA"}</span></td>
    <td>${v.dataTexto||""}</td>
    <td>${v.cancelada?"-":`<button class="bad" onclick="cancelarVenda('${v.id}')">Cancelar</button>`}</td>
  </tr>`).join("");
}
if($("buscarCancelamentos")) $("buscarCancelamentos").onclick=loadCancelamentos;
if($("cancelBusca")) $("cancelBusca").oninput=loadCancelamentos;

window.cancelarVenda=async(vendaId)=>{
  const snap=await getDoc(doc(db,"vendas",vendaId));
  if(!snap.exists()){notify("Venda não encontrada.","erro");return;}
  const venda={id:vendaId,...snap.data()};
  if(venda.cancelada){notify("Essa venda já está cancelada.","erro");return;}

  const itensSnap=await getDocs(collection(db,"vendas",vendaId,"itens"));
  const itens=itensSnap.docs.map(d=>d.data());

  openModal("Cancelar Venda",`
    <p>Deseja cancelar esta venda?</p>
    <p><b>Tipo:</b> ${venda.tipo||""}</p>
    <p><b>Valor:</b> ${money(venda.valorTotal)}</p>
    <p class="hint">Ao cancelar, os itens voltam ao estoque. Se houver fiado vinculado, será lançado ajuste no histórico/auditoria.</p>
    <textarea id="motivoCancelamento" placeholder="Motivo do cancelamento"></textarea>
  `,async()=>{
    const motivo=motivoCancelamento.value||"Cancelamento manual";
    solicitarAutorizacaoGerencia("Cancelar venda",`Cancelamento de ${venda.tipo||""} no valor de ${money(venda.valorTotal)}.`,async(aprovado)=>{
      for(const it of itens){
        await devolverEstoque(it.produtoId,+it.unidadesVendidas||0,"CANCELAMENTO_VENDA");
      }
      await updateDoc(doc(db,"vendas",vendaId),{cancelada:true,status:"CANCELADA",motivoCancelamento:motivo,canceladoPor:usuario.nome,autorizadoPor:aprovado.nome||aprovado.usuario,dataCancelamentoTexto:today(),canceladoEm:serverTimestamp()});
      await addDoc(collection(db,"cancelamentos"),{vendaId,tipo:venda.tipo||"",valor:venda.valorTotal||0,motivo,usuario:usuario.nome,autorizadoPor:aprovado.nome||aprovado.usuario,dataTexto:today(),dataHora:serverTimestamp()});
      await auditar("VENDA_CANCELADA",`${venda.tipo||""} ${money(venda.valorTotal)} | ${motivo} | Autorizado por ${aprovado.nome||aprovado.usuario}`);
      notify("Venda cancelada e estoque ajustado.","ok");
      await loadAll();
      await loadCancelamentos();
      await dashboard();
    });
  });
};

async function loadDevolucoes(renderTabela=true){
  if($("devProduto")) $("devProduto").innerHTML=produtos.filter(p=>p.ativo!==false).map(p=>`<option value="${p.id}">${p.nome}</option>`).join("");
  if(!renderTabela || !$("devolucoesList")) return;
  const devs=await docs("devolucoes");
  $("devolucoesList").innerHTML=devs.sort((a,b)=>(b.dataTexto||"").localeCompare(a.dataTexto||"")).map(d=>`<tr>
    <td>${d.produto||""}</td><td>${d.quantidade||0}</td><td>${d.motivo||""}</td><td>${d.usuario||""}</td><td>${d.dataTexto||""}</td>
  </tr>`).join("");
}
if($("registrarDevolucao")) $("registrarDevolucao").onclick=async()=>{
  const p=produtos.find(x=>x.id===$("devProduto").value);
  if(!p){notify("Selecione um produto.","erro");return;}
  const qtd=+$("devQtd").value||0;
  if(qtd<=0){notify("Informe uma quantidade válida.","erro");return;}
  const motivo=$("devMotivo").value||"Devolução manual";
  solicitarAutorizacaoGerencia("Registrar devolução",`Devolução de ${qtd} unidade(s) do produto ${p.nome}.`,async(aprovado)=>{
    await devolverEstoque(p.id,qtd,"DEVOLUCAO");
    await addDoc(collection(db,"devolucoes"),{produtoId:p.id,produto:p.nome,quantidade:qtd,motivo,usuario:usuario.nome,autorizadoPor:aprovado.nome||aprovado.usuario,dataTexto:today(),dataHora:serverTimestamp()});
    await auditar("DEVOLUCAO_ESTOQUE",`${p.nome} +${qtd} | ${motivo} | Autorizado por ${aprovado.nome||aprovado.usuario}`);
    $("devQtd").value=1; $("devMotivo").value="";
    notify("Devolução registrada e estoque atualizado.","ok");
    await loadAll();
    await loadDevolucoes();
  });
};


async function gerarRelatorio(){
  const tipo=$("relTipo").value, periodo=$("relPeriodo").value, inicio=$("relDataInicio").value, fim=$("relDataFim").value;
  const filtra=data=>{ data=data||""; if(periodo==="hoje") return data===today(); if(periodo==="mes") return data.startsWith(month()); if(periodo==="personalizado"){ if(inicio&&data<inicio)return false; if(fim&&data>fim)return false; } return true; };
  const vendas=(await docs("vendas")).filter(v=>!v.cancelada);
  if(tipo==="vendas"){
    const lista=vendas.filter(v=>filtra(v.dataTexto)); let total=0,fiado=0;
    $("relVendasList").innerHTML=lista.map(v=>{ total+=+v.valorTotal||0; if(v.formaPagamento==="FIADO") fiado+=+v.valorTotal||0; return`<tr><td>${v.tipo}</td><td>${v.formaPagamento}${v.bandeiraCartao?"/"+v.bandeiraCartao:""}</td><td>${money(v.valorTotal)}</td><td>${v.dataTexto||""}</td></tr>`; }).join("");
    $("relVendas").innerText=money(total); $("relQtd").innerText=lista.length; $("relTicket").innerText=money(lista.length?total/lista.length:0); $("relFiado").innerText=money(fiado); return;
  }
  if(tipo==="estoque"){
    $("relVendas").innerText=String(produtos.length); $("relQtd").innerText=produtos.reduce((a,p)=>a+(+p.estoqueAtual||0),0); $("relTicket").innerText="-"; $("relFiado").innerText=String(produtos.filter(p=>+p.estoqueAtual<=+p.estoqueMinimo).length);
    $("relVendasList").innerHTML=produtos.map(p=>`<tr><td>${p.nome}</td><td>${p.codigoBarras||p.categoria||""}</td><td>${p.estoqueAtual||0} un.</td><td>Mín. ${p.estoqueMinimo||0}</td></tr>`).join(""); return;
  }
  if(tipo==="clientes"||tipo==="fiados"){
    const lista=tipo==="fiados"?clientes.filter(c=>+c.saldoDevedor>0):clientes; const total=lista.reduce((a,c)=>a+(+c.saldoDevedor||0),0);
    $("relVendas").innerText=money(total); $("relQtd").innerText=lista.length; $("relTicket").innerText="-"; $("relFiado").innerText=money(total);
    $("relVendasList").innerHTML=lista.map(c=>`<tr><td>${c.nome}</td><td>${c.telefone||""}</td><td>${money(c.saldoDevedor)}</td><td>${c.cpf||""}</td></tr>`).join(""); return;
  }
  
  
  if(tipo==="cancelamentos"){
    const lista=(await docs("cancelamentos")).filter(c=>filtra(c.dataTexto));
    const total=lista.reduce((a,c)=>a+(+c.valor||0),0);
    $("relVendas").innerText=money(total);
    $("relQtd").innerText=lista.length;
    $("relTicket").innerText="-";
    $("relFiado").innerText="-";
    $("relVendasList").innerHTML=lista.map(c=>`<tr><td>${c.tipo||""}</td><td>${c.motivo||""}</td><td>${money(c.valor)}</td><td>${c.dataTexto||""} | ${c.usuario||""}</td></tr>`).join("");
    return;
  }
  if(tipo==="devolucoes"){
    const lista=(await docs("devolucoes")).filter(d=>filtra(d.dataTexto));
    const totalQtd=lista.reduce((a,d)=>a+(+d.quantidade||0),0);
    $("relVendas").innerText=String(totalQtd);
    $("relQtd").innerText=lista.length;
    $("relTicket").innerText="-";
    $("relFiado").innerText="-";
    $("relVendasList").innerHTML=lista.map(d=>`<tr><td>${d.produto||""}</td><td>${d.motivo||""}</td><td>${d.quantidade||0} un.</td><td>${d.dataTexto||""} | ${d.usuario||""}</td></tr>`).join("");
    return;
  }
  if(tipo==="caixa"){
    const caixas=await docs("caixas");
    const lista=caixas.filter(c=>filtra(c.dataAberturaTexto));
    const totalEsperado=lista.reduce((a,c)=>a+(+c.saldoEsperado||0),0);
    const totalFinal=lista.reduce((a,c)=>a+(+c.valorFinal||0),0);
    const totalDif=lista.reduce((a,c)=>a+(+c.diferenca||0),0);
    $("relVendas").innerText=money(totalFinal);
    $("relQtd").innerText=lista.length;
    $("relTicket").innerText=money(totalEsperado);
    $("relFiado").innerText=money(totalDif);
    $("relVendasList").innerHTML=lista.length?lista.sort((a,b)=>(b.dataAberturaTexto||"").localeCompare(a.dataAberturaTexto||"")).map(c=>`<tr><td>${c.status||""}</td><td>Inicial: ${money(c.valorInicial)} | Esperado: ${money(c.saldoEsperado||0)}</td><td>Final: ${c.valorFinal!=null?money(c.valorFinal):"-"} | Dif.: ${c.diferenca!=null?money(c.diferenca):"-"}</td><td>${c.dataAberturaTexto||""} | ${c.usuario||""}</td></tr>`).join(""):'<tr><td colspan="4">Nenhum caixa encontrado.</td></tr>';
    return;
  }

if(tipo==="produtos"||tipo==="lucro"){
    const itens=[]; for(const v of vendas.filter(v=>filtra(v.dataTexto))){ const sub=await getDocs(collection(db,"vendas",v.id,"itens")); sub.docs.forEach(d=>itens.push(d.data())); }
    const mapa={}; itens.forEach(i=>{ if(!mapa[i.produto]) mapa[i.produto]={qtd:0,total:0}; mapa[i.produto].qtd+=+i.quantidade||0; mapa[i.produto].total+=+i.subtotal||0; });
    const lista=Object.entries(mapa).sort((a,b)=>b[1].total-a[1].total); let lucroTotal=0, total=0;
    $("relVendasList").innerHTML=lista.map(([nome,v])=>{ const prod=produtos.find(p=>p.nome===nome); const custo=(+prod?.precoCompra||0)*v.qtd; const lucro=v.total-custo; lucroTotal+=lucro; total+=v.total; return`<tr><td>${nome}</td><td>${v.qtd} vendido(s)</td><td>${money(v.total)}</td><td>${tipo==="lucro"?"Lucro: "+money(lucro):""}</td></tr>`; }).join("");
    $("relVendas").innerText=money(total); $("relQtd").innerText=lista.length; $("relTicket").innerText="-"; $("relFiado").innerText=tipo==="lucro"?money(lucroTotal):"-"; return;
  }
}
$("gerarRelatorio").onclick=gerarRelatorio;

async function loadAuditoria(){
  const lista=await docs("auditoria"), busca=($("audBusca").value||"").toLowerCase(), inicio=$("audDataInicio").value, fim=$("audDataFim").value;
  $("auditoriaList").innerHTML=lista.filter(x=>{ const t=JSON.stringify(x).toLowerCase(), d=x.dataTexto||""; if(busca&&!t.includes(busca)) return false; if(inicio&&d<inicio) return false; if(fim&&d>fim) return false; return true; }).map(x=>`<tr><td>${x.acao||""}</td><td>${x.detalhes||""}</td><td>${x.usuario||""}</td><td>${x.dataTexto||""}</td></tr>`).join("");
}
$("audBusca").oninput=loadAuditoria; $("filtrarAuditoria").onclick=loadAuditoria;

async function loadConfig(){
  const cfg=(await docs("configuracoes"))[0]||{};
  $("cfgNome").value=cfg.nomeEmpresa||"Bar Piraí"; $("cfgTelefone").value=cfg.telefone||""; $("cfgWhatsapp").value=cfg.whatsapp||""; $("cfgEndereco").value=cfg.endereco||""; $("cfgMeta").value=cfg.metaMensal||"";
}
$("salvarConfig").onclick=async()=>{
  const cfgs=await docs("configuracoes"); const data={nomeEmpresa:$("cfgNome").value,telefone:$("cfgTelefone").value,whatsapp:$("cfgWhatsapp").value,endereco:$("cfgEndereco").value,metaMensal:+$("cfgMeta").value||0,atualizadoEm:serverTimestamp()};
  if(cfgs[0]) await updateDoc(doc(db,"configuracoes",cfgs[0].id),data); else await addDoc(collection(db,"configuracoes"),data);
  await auditar("CONFIGURACOES_SALVAS","Configurações atualizadas"); notify("Configurações salvas com sucesso.","ok");
};
$("aplicarCargosPadrao").onclick=async()=>{ const fs=await docs("funcionarios"); for(const f of fs){ if(f.cargo) await updateDoc(doc(db,"funcionarios",f.id),{permissoes:permissoesPorCargo(f.cargo)}); } await auditar("CARGOS_PADRAO_APLICADOS","Permissões redefinidas por cargo"); notify("Permissões padrão aplicadas.","ok"); await loadAll(); };

function detalheItem(titulo,valor,extra=""){ return `<div class="detalhe-item"><b>${titulo}</b><br><span>${valor}</span>${extra?`<br><small>${extra}</small>`:""}</div>`; }
async function abrirDetalheDashboard(tipo){
  const vendas=(await docs("vendas")).filter(v=>!v.cancelada), mesas=await docs("mesas"), comandas=await docs("comandas"), financeiro=await docs("financeiro");
  let titulo="Detalhes", html="";
  const vendasHoje=vendas.filter(v=>dataDentroDoPeriodoDashboard(v.dataTexto));
  if(tipo==="vendasHoje"){titulo="Vendas • "+labelPeriodoDashboard(); html=vendasHoje.map(v=>detalheItem(v.tipo,money(v.valorTotal),v.formaPagamento)).join("")||"Nenhuma venda.";}
  if(tipo==="pixHoje"||tipo==="dinheiroHoje"||tipo==="creditoHoje"||tipo==="debitoHoje"||tipo==="fiadoHoje"){const map={pixHoje:"PIX",dinheiroHoje:"DINHEIRO",creditoHoje:"CREDITO",debitoHoje:"DEBITO",fiadoHoje:"FIADO"}; const forma=map[tipo]; titulo=forma+" • "+labelPeriodoDashboard(); html=vendasHoje.filter(v=>v.formaPagamento===forma || (v.formaPagamento==="MISTO"&&v.detalhesPagamento)).map(v=>detalheItem(v.tipo,money(v.valorTotal),v.formaPagamento)).join("")||"Nenhum registro.";}
  if(tipo==="mistoHoje"){titulo="Misto • "+labelPeriodoDashboard(); html=vendasHoje.filter(v=>v.formaPagamento==="MISTO").map(v=>detalheItem(v.tipo,money(v.valorTotal),JSON.stringify(v.detalhesPagamento||{}))).join("")||"Nenhum misto.";}
  if(tipo==="faturamentoMes"){titulo="Faturamento • "+labelPeriodoDashboard(); const l=vendas.filter(v=>dataDentroDoPeriodoDashboard(v.dataTexto)); html=l.map(v=>detalheItem(v.tipo,money(v.valorTotal),v.formaPagamento)).join("")||"Sem vendas no mês.";}
  if(tipo==="saldoFinanceiro"){titulo="Saldo Financeiro"; html=financeiro.slice(-30).reverse().map(f=>detalheItem(f.categoria||f.tipo,money(f.valor),`${f.tipo} | ${f.dataTexto||""}`)).join("")||"Sem lançamentos.";}
  if(tipo==="caixaAberto"){titulo="Caixa"; const c=await caixaAberto(); html=c?detalheItem("Caixa aberto",money(c.valorInicial),c.usuario):"Não há caixa aberto.";} if(tipo==="diferencaCaixa"){titulo="Diferença de Caixa"; const caixas=await docs("caixas"); const fechados=caixas.filter(c=>c.status==="FECHADO"); const total=fechados.reduce((a,c)=>a+(+c.diferenca||0),0); html=`<div class="detalhe-box"><b>Diferença total contabilizada</b><br>${money(total)}</div>`+fechados.slice(-20).reverse().map(c=>detalheItem("Caixa "+(c.dataAberturaTexto||""),money(c.diferenca||0),`Esperado: ${money(c.saldoEsperado||0)} | Contado: ${money(c.valorFinal||0)}`)).join("");}
  if(tipo==="mesasOcupadas"){titulo="Mesas Ocupadas"; html=mesas.filter(m=>m.status==="OCUPADA").map(m=>detalheItem("Mesa "+m.numero,m.responsavel||"",m.garcom||"")).join("")||"Nenhuma mesa ocupada.";}
  if(tipo==="comandasAbertas"){titulo="Comandas Abertas"; html=comandas.filter(c=>c.status==="ABERTA").map(c=>detalheItem("Mesa "+c.mesa,money(c.total),c.responsavel||"")).join("")||"Nenhuma comanda aberta.";}
  if(tipo==="produtos"){titulo="Produtos"; html=produtos.map(p=>detalheItem(p.nome,`${p.estoqueAtual||0} un.`,p.categoria||"")).join("")||"Nenhum produto.";}
  if(tipo==="estoqueBaixo"){titulo="Estoque Baixo"; html=produtos.filter(p=>+p.estoqueAtual<=+p.estoqueMinimo).map(p=>detalheItem(p.nome,`Atual: ${p.estoqueAtual} | Mínimo: ${p.estoqueMinimo}`)).join("")||"Nenhum alerta.";}
  openModal(titulo,html,closeModal,true);
}
document.querySelectorAll("[data-detail]").forEach(c=>c.onclick=()=>abrirDetalheDashboard(c.dataset.detail));

async function dashboard(){
  await loadProdutos();
  await loadClientes();
  atualizarTituloCardsDashboard();

  const vendas=(await docs("vendas")).filter(v=>!v.cancelada);
  let totalPeriodo=0,pix=0,dinheiro=0,credito=0,debito=0,fiado=0,misto=0;

  const vendasPeriodo=vendas.filter(v=>dataDentroDoPeriodoDashboard(v.dataTexto));

  vendasPeriodo.forEach(v=>{
    const valor=+v.valorTotal||0;
    totalPeriodo+=valor;
    if(v.formaPagamento==="PIX") pix+=valor;
    if(v.formaPagamento==="DINHEIRO") dinheiro+=valor;
    if(v.formaPagamento==="CREDITO") credito+=valor;
    if(v.formaPagamento==="DEBITO") debito+=valor;
    if(v.formaPagamento==="FIADO") fiado+=valor;
    if(v.formaPagamento==="MISTO"){
      misto+=valor;
      pix+=+v.detalhesPagamento?.pix||0;
      dinheiro+=+v.detalhesPagamento?.dinheiro||0;
      credito+=+v.detalhesPagamento?.credito||0;
      debito+=+v.detalhesPagamento?.debito||0;
      fiado+=+v.detalhesPagamento?.fiado||0;
    }
  });

  $("dashVendas").innerText=money(totalPeriodo);
  $("dashPix").innerText=money(pix);
  $("dashDinheiro").innerText=money(dinheiro);
  $("dashCredito").innerText=money(credito);
  $("dashDebito").innerText=money(debito);
  $("dashFiado").innerText=money(fiado);
  $("dashMisto").innerText=money(misto);
  $("dashMes").innerText=money(totalPeriodo);
  $("dashProdutos").innerText=produtos.filter(p=>p.ativo!==false).length;
  $("dashBaixo").innerText=produtos.filter(p=>p.ativo!==false && +p.estoqueAtual<=+p.estoqueMinimo).length;

  const mesas=await docs("mesas");
  $("dashMesas").innerText=mesas.filter(m=>m.status==="OCUPADA").length;

  const comandas=await docs("comandas");
  $("dashComandas").innerText=comandas.filter(c=>c.status==="ABERTA").length;

  await loadFinanceiro();

  const resumoCaixa=await obterResumoCaixa();
  $("dashCaixa").innerText=resumoCaixa.caixaAberto?"Sim":"Não";
  if($("dashDiferencaCaixa")) $("dashDiferencaCaixa").innerText=money(resumoCaixa.diferencaFechados);
}

if($("dashDiferencaCaixa")) $("dashDiferencaCaixa").innerText=money(resumoCaixa.diferencaFechados);
}


if($("dashPeriodo")) $("dashPeriodo").onchange=async()=>{ await dashboard(); notify("Dashboard atualizado para "+labelPeriodoDashboard()+".","ok"); };
if($("atualizarDashboard")) $("atualizarDashboard").onclick=async()=>{ await dashboard(); notify("Dashboard atualizado.","ok"); };
if($("limparCacheLocal")) $("limparCacheLocal").onclick=async()=>{
  try{
    if("caches" in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
    sessionStorage.clear();
    notify("Cache local limpo. Dados sincronizados com o Firestore.","ok");
  }catch(e){
    notify("Dados recarregados. Alguns caches do navegador podem depender do próprio Chrome.","aviso");
  }
  await loadAll();
  await dashboard();
  await loadCaixa();
};
if($("filtrarCaixa")) $("filtrarCaixa").onclick=loadCaixa;
if(localStorage.getItem("bp_user")) start();
