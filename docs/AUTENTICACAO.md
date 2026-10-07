# Conta e autenticação

## Fluxos atuais

- Cadastro: e-mail, usuário único e senha com confirmação. Usuário usa 3–24 letras/números/underscore, começando por letra; armazenamento normalizado em minúsculas. Nome exibido no perfil é independente.
- Entrada por e-mail ou usuário em `/entrar`. Conta existente define o usuário em `/conta`. Erros não revelam o e-mail associado ao usuário.
- Sessão em cookies persistentes de 30 dias, renovada pelo proxy; `/`, `/entrar` e `/cadastro` redirecionam uma sessão confirmada ao Feed. Sair remove a sessão local.
- `/confirmar` reenvia o link de confirmação. `/recuperar-senha` envia o link de recuperação. A interface não pede código numérico porque os modelos atuais não o incluem. `/nova-senha` salva a nova senha e abre o Feed.
- Os e-mails padrão usam `/auth/finish`: confirmação e recuperação são solicitadas sem depender de um verificador PKCE local. O navegador recebe os tokens no fragmento, remove-os do histórico e os troca por cookies de sessão verificados pelo servidor. Isso permite concluir o acesso em outro navegador sem editar o modelo do provedor.
- Para um futuro modelo personalizado, o link alternativo para outro navegador usa `/auth/confirm?token_hash=...&type=signup|recovery`, troca o token por sessão e funciona sem o verificador PKCE do navegador original. `/auth/callback` continua aceitando links PKCE anteriores; se faltar o verificador ou expirar, encaminha à confirmação/recuperação.
- `/conta` permite configurar usuário, trocar senha com a atual e excluir definitivamente. Exclusão exige senha atual e frase explícita; remove objetos pelo Storage API e depois conta, conversas, mensagens, avaliações e registros ligados ao conteúdo removido no banco. Uma falha parcial mostra erro e permite tentar concluir novamente. Não execute esse fluxo em contas reais para testar.
- `/bloqueados` lista bloqueios próprios e permite desfazê-los, mantendo os bloqueios da outra pessoa e o encerramento prévio das conversas.

## Login por nome de usuário

A Edge Function `supabase/functions/duoeto-username-login/index.ts` deve estar publicada com o slug `duoeto-username-login` e `verify_jwt=false`, pois o login começa sem sessão. Ela usa somente as variáveis de ambiente administrativas internas do Supabase, nunca a chave administrativa no Next.js ou navegador. A RPC `duoeto_login_identity` só aceita `service_role`; consulta privada e limite de 10 tentativas por usuário a cada 15 minutos. O Supabase Auth verifica a senha e a confirmação; apenas um login válido recebe tokens de sessão. E-mails não são publicados em RPC anônima.

## Configuração

Variáveis públicas da aplicação: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL`. O domínio de produção é `https://appdeconexoes.vercel.app`. O serviço Auth deve apontar para esse Site URL e permitir o callback `/auth/finish`. Os modelos versionados em `supabase/templates/` preservam `.ConfirmationURL` como caminho principal compatível, oferecem link alternativo com `.SiteURL`/`.TokenHash` e exibem `.Token`; não substitua por credenciais ou tokens fixos.

O provedor recusou alterações dos modelos no plano gratuito: os arquivos em `supabase/templates/` estão preparados, mas **não foram aplicados**. O código numérico só pode ser usado se constar no e-mail; o fluxo padrão por link já funciona sem personalizar modelos.

O projeto ainda utiliza o transporte padrão de e-mail do Supabase, com limite observado de 2 envios/hora e sem SMTP personalizado. A aplicação trata limites e permite reenvio do link, mas não pode garantir entrega nem aumentar a capacidade desse transporte. Antes de abrir cadastro geral, configurar SMTP de um provedor e domínio de envio validado. SMS e login social não foram habilitados.

## Validação

- Testes isolados cobrem unicidade/normalização, resolução privada e limite de tentativas, autorização, bloqueios, paginação, não lidas e exclusão de registros associados.
- Teste da Edge Function com respostas controladas confirma verificação de senha pelo Auth, retorno restrito a tokens no sucesso e resposta genérica sem e-mail no erro.
- Fluxos autenticados com contas temporárias no Supabase real validaram código de confirmação, sessão lembrada, login por usuário, upload de três fotos, filtros, contadores, recuperação em outro navegador, desbloqueio e exclusão completa. As contas foram removidas. Links/códigos de teste foram gerados pela API administrativa, sem enviar e-mails: isso não comprova entrega na caixa de entrada.
- O navegador da nuvem rejeita o certificado intermediário da conexão direta ao Supabase; o fallback periódico foi exercitado na interface. A entrega Realtime foi validada separadamente por WebSocket autenticado, com TLS verificado.

Busca de mensagens: nome de exibição ou nome de usuário, com ou sem `@`, sem diferenciar maiúsculas. A consulta só retorna contatos/conversas do solicitante e preserva bloqueios, filtro de não lidas e paginação. Não permite pesquisar um diretório de contas.

Migração adicional aplicada: `20261007052000_duoeto_inbox_username_search.sql`.

Migrações anteriores: `20261007050000_duoeto_accounts_inbox.sql` e `20261007051000_duoeto_delete_related_reports.sql`. Conferir histórico antes de aplicar. O rascunho `supabase/drafts` continua fora do fluxo de implantação.

Verificação complementar: links padrão gerados pelo Auth redirecionaram para `/auth/finish` com sessão válida; confirmação e recuperação foram concluídas em contextos de navegador novos. O callback de produção e localhost:3000 estão autorizados no Supabase. Testes administrativos não enviam e-mail e não comprovam entrega; SMTP e verificação do deploy web continuam pendentes.
