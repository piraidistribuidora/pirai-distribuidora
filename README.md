# Bar Piraí ERP - Versão Limpa Final

## O que foi feito
Esta versão foi regenerada do zero para evitar código corrompido/remendado.

## Login inicial
Usuário: henrique
Senha: 38371450

## Módulos
- Login por funcionário cadastrado no Firestore
- Permissões por cargo
- Dashboard clicável
- Venda balcão
- Pagamento PIX, dinheiro, crédito, débito, fiado e misto
- Bandeira de cartão
- Mesas e comandas
- Estoque e entradas
- Clientes e fiados
- Funcionários
- Caixa
- Financeiro
- Relatórios
- Auditoria
- Configurações

## Observação de segurança
O login por funcionário funciona pelo Firestore e permissões no frontend. Para segurança empresarial completa, o ideal futuro é migrar cada funcionário para Firebase Authentication próprio.

Atualização final:
- Removido "Quantidade padrão de mesas" das Configurações.
- Alertas simples do navegador foram substituídos por notificações visuais profissionais dentro do sistema.
- Mantido gerenciamento de quantidade diretamente no módulo Mesas.

Atualização caixa profissional:
- Removido confirm() do navegador no fechamento de caixa.
- Fechamento agora usa modal interno profissional.
- Mostra valor inicial, entradas, saídas, saldo esperado, valor contado e diferença.
- Salva saldo esperado, valor contado, diferença e observação no Firestore.

Atualização mesas:
- Adicionada opção de excluir mesa.
- A exclusão só é permitida quando a mesa estiver LIVRE.
- Mesa ocupada/com comanda aberta não pode ser excluída para evitar inconsistência.

Atualização ativo/inativo/exclusão:
- Funcionários agora são editados com status Ativo/Inativo dentro do modal de edição.
- Produto agora é editado com status Ativo/Inativo dentro do modal de edição.
- Exclusão definitiva de funcionário e produto fica dentro do modal de edição.
- Removido botão direto de desativar com confirmação do navegador.
- Listagens exibem ativos e inativos com badge de status.

Atualização caixa/sincronia:
- Caixa exibe diferença contabilizada.
- Dashboard mostra diferença total de caixas fechados.
- Caixa possui filtro por data inicial e final.
- Relatórios agora possuem opção Caixa.
- Tabela de caixa mostra saldo esperado, valor final e diferença.

Atualização comanda/venda:
- Bandeira do cartão na comanda só aparece para Crédito ou Débito.
- Venda balcão agora possui desconto no total.
- Comanda agora possui desconto no total.
- Venda balcão e comanda possuem opção de imprimir conta/prévia.
- Vendas salvam valorBruto, desconto e valorTotal.

Auditoria minuciosa final:
- Corrigida variável de total da comanda no fechamento fiado.
- Garantida sincronização de caixa com dashboard e relatórios.
- Removidas chamadas nativas de confirm().
- Removidas chamadas nativas de alert().
- Conferidos IDs duplicados e referências de DOM.
- Conferida sintaxe JavaScript com node --check.

Atualização código de barras:
- Produtos agora possuem campo Código de Barras no cadastro e edição.
- Estoque mostra código de barras.
- Venda balcão possui campo para leitor de código de barras.
- Comanda possui campo para leitor de código de barras.
- Leitor USB/Bluetooth funciona como teclado: escaneia o código e pressiona Enter.
- Ao escanear código existente, adiciona automaticamente 1 unidade ao carrinho ou comanda.
- Se o código não existir, o sistema mostra notificação profissional.

Atualização cancelamentos/devoluções:
- Adicionado módulo Cancelamentos.
- Adicionado módulo Devoluções.
- Cancelar venda marca como cancelada e devolve itens ao estoque.
- Vendas canceladas deixam de entrar no dashboard, financeiro e relatórios de vendas.
- Devolução manual adiciona quantidade ao estoque e registra auditoria.
- Relatórios agora incluem Cancelamentos e Devoluções.

Atualização segurança/autorização:
- Ações sensíveis exigem usuário e senha de Administrador ou Gerente.
- Protegido: cancelar venda, devolução, fechar caixa, desconto em venda, desconto em comanda, excluir mesa, excluir produto, excluir funcionário, alterar status de produto, editar funcionário/permissões.
- Todas as autorizações aprovadas/negadas são registradas na auditoria.
- Descontos salvos indicam quem autorizou.

Correção de sincronização total:
- Dashboard e Caixa agora recalculam tudo diretamente do Firestore.
- Se não existir nenhum caixa, Dashboard mostra Caixa Aberto: Não e Diferença: R$ 0,00.
- Relatório de Caixa mostra "Nenhum caixa encontrado" quando não há registros.
- Botão Atualizar Dados no Dashboard.
- Botão Sincronizar/Limpar Cache no Caixa.
- Service worker simplificado para reduzir cache antigo no GitHub Pages.

Atualização Dashboard por período:
- Adicionado filtro do Dashboard: Diário, Semanal, Mensal, Últimos 3 meses, Último 1 ano e Todo o período.
- Cards de vendas, PIX, dinheiro, crédito, débito, fiado, misto e faturamento respeitam o período selecionado.
- Detalhes clicáveis do Dashboard também respeitam o período selecionado.

Correção venda balcão:
- Campo Cliente para Fiado agora só aparece quando a forma de pagamento for FIADO ou MISTO.
- Campo Valor recebido só aparece para DINHEIRO ou MISTO.
- Bandeira do cartão só aparece para CRÉDITO, DÉBITO ou MISTO.
- Ao trocar forma de pagamento, campos que não pertencem à forma escolhida são limpos automaticamente.

Correção login:
- Login agora possui tratamento de erro visível.
- Administrador local henrique/38371450 entra mesmo se a coleção funcionarios ainda estiver vazia.
- Se Firebase Authentication/Regras falharem, o sistema mostra mensagem clara em vez de parecer travado.
- Carregamento inicial agora não bloqueia a entrada caso alguma coleção ainda não exista ou retorne erro temporário.

Versão LOGIN FUNCIONAL:
- Login exibe status "Conectando ao Firebase".
- Timeout de 10 segundos no Authentication Anônimo.
- Se falhar, mostra erro claro em vez de parecer travado.
- Login padrão henrique / 38371450 continua funcionando como administrador inicial.

Versão LOGIN DESTRAVADO:
- Botão Entrar agora é type=button.
- Login admin henrique/38371450 abre o sistema imediatamente, sem depender do Firestore.
- Firebase/Auth/auditoria tentam rodar por trás, sem travar a entrada.
- Funcionários continuam validando via coleção funcionarios.
- Adicionado debug visual no login.
- Tecla Enter nos campos de login adicionada.

Correção crítica Firebase/Login:
- Corrigido import do Firebase de 12.14.0 para 10.12.2.
- A versão anterior podia impedir o app.js inteiro de carregar, deixando o botão Entrar sem ação.
- Adicionado detector visual de erro de carregamento no login.
- Botão Entrar garantido como type=button.

Correção final:
- Corrigida linha corrompida do logout que quebrava o JavaScript:
  $("logout").onclick$("logout").onclick=async()=> ...
- Mantido Firebase SDK em versão estável 10.12.2.
- Botão Entrar garantido como type=button.
- Service worker sem cache antigo.

Correção usando login da versão antiga funcional:
- Login refeito com base no comportamento da versão antiga.
- Removida mensagem/debug visual da tela inicial.
- Login henrique / 38371450 entra como Administrador.
- Funcionários continuam entrando via coleção funcionarios.
- Botão Entrar como type=button.
- Corrigida duplicação do logout.
