# Revisão complementar — autenticação e busca

- Aplicada a migração `20261007052000_duoeto_inbox_username_search.sql`: busca em conversas e primeiros contatos aceita nome ou usuário, com/sem `@`, preservando privacidade, bloqueios, não lidas e paginação.
- Concluído `/auth/finish`, que estava sem commit: links padrão de confirmação/recuperação iniciam sessão mesmo em outro navegador. Supabase atualizado para autorizar os callbacks de produção e localhost:3000.
- Removida a solicitação de código numérico da interface: os e-mails reais atuais só incluem link. Modelos com código não foram aplicados porque o provedor recusou a personalização sem SMTP próprio/upgrade.
- Envio de e-mails **não está concluído para cadastro geral**: SMTP próprio ainda precisa ser configurado; transporte padrão tem limite de 2 envios/hora. Testes administrativos de links não comprovam entrega de e-mails.
- Restante do lote anterior está no commit `c465834`; banco e Edge Function foram aplicados. Após o push `c20b0fb`, a Vercel respondeu 200 em `/auth/finish` com o novo callback e em `/confirmar` com a orientação por link sem código; publicação das correções confirmada por HTTP. Entrega de e-mail continua sem validação.

# Continuidade do MVP — 7 de outubro de 2026

Referências de produto: [Bíblia](BIBLIA_DO_PRODUTO.md) e [Decisões do MVP](DECISOES_MVP.md). As decisões posteriores prevalecem sobre propostas antigas. Este documento registra a implementação local e a aplicação validada no Supabase remoto. A implantação na Vercel não foi verificada por esta tarefa.

## Atualização — conta, confirmação e mensagens

Requisitos funcionais aprovados: manter login e entrar no Feed; Conversas como aba inicial; não lidas em ambas as abas/itens; login por usuário; reenvio de link e recuperação de senha; filtros do Feed em página separada e filtros de Mensagens automáticos. Incluídos lista/desbloqueio, paginação por cursor sem teto de 100 e exclusão definitiva de conta conforme decisão explícita do responsável.

Migração `20261007050000_duoeto_accounts_inbox.sql`: usuários privados, resolução de login restrita ao servidor, eventos Realtime próprios por usuário, não lidas com marca de leitura, paginação e funções de conta. Edge Function `duoeto-username-login` publicada e ativa. `20261007051000_duoeto_delete_related_reports.sql` remove também denúncias que apontem para conteúdo excluído mesmo quando denunciante/acusado continuam cadastrados.

Os fluxos autenticados foram exercitados com contas temporárias: confirmação por código, persistência em novo contexto de navegador, login por usuário, upload no Storage, filtros, notificações nas duas abas, leitura, busca automática, recuperação por link sem cookies anteriores, desbloqueio e exclusão das contas e fotos. As contas temporárias são removidas ao final; os seis perfis fictícios solicitados pelo responsável permanecem.

O navegador da nuvem não confia no certificado intermediário para acesso direto ao Supabase; não foi desativada a verificação TLS. A interface usou o fallback periódico, e o Realtime foi confirmado separadamente por assinatura autenticada e recebimento do evento via WebSocket com certificado verificado. Node.js nesta nuvem usa `NODE_USE_ENV_PROXY=1` para acessar o serviço com a configuração de proxy existente.

Para testar: suítes anteriores mais `npm run test:accounts`, `npm run typecheck` e `npm run build`. O teste de conta roda somente em PGlite isolado; não exclui usuários remotos. Consulte [Autenticação](AUTENTICACAO.md) para implantação dos modelos de e-mail e limites do transporte. O SMTP padrão está limitado a 2 e-mails/hora; provedor personalizado ainda é necessário para cadastro geral. Modelos em `supabase/templates/` foram preparados, mas o Supabase recusou aplicá-los no plano gratuito sem SMTP próprio. O fluxo usa os links padrão com callback `/auth/finish`, que conclui sessão em outro navegador sem depender de PKCE local. A checagem da Vercel inicialmente foi bloqueada pelo proxy (403 no túnel), mas voltou a funcionar: `/auth/finish` e `/confirmar` exibem as correções após o push `c20b0fb`.

## Atualização final — Feed, álbum e primeira impressão bilateral

- Feed com um perfil por vez, foto em destaque, informações progressivas, gestos verticais para pessoas, laterais para fotos e ↑/↓ no computador. Botão “Passar” removido. Retorno à aba revalida o perfil sem reiniciar os filtros e o histórico.
- “Não tenho interesse” vale sete dias, só para o Feed de quem escolheu. Não impede foto, avaliação nem contato. Expiração consultada no banco, sem cron. Preferências legadas recebem sete dias a partir da migração por não terem data anterior.
- Álbum de até seis fotos, principal obrigatória, escolha da principal e remoção das complementares. Uploads de até 3 MB são processados e enviados um por requisição, sem exceder o limite de corpo da hospedagem. Perfil público agora mostra fotos; Storage permanece privado.
- Primeira impressão exigida do remetente antes do envio e do destinatário antes do aceite. Novas mensagens e avaliação de interação exigem ambas válidas. Conversas legadas são preservadas e exibem orientação se faltar avaliação, sem fabricar notas.
- Busca por nome no banco em contatos e conversas, antes do limite de 100 resultados. Paginação do histórico usa cursores antes/depois; atualização não descarta mensagens antigas nem duplica resultados.
- Navegação principal mantém Feed, Mensagens e Perfil; Notificações fica em controle secundário acessível. Manifesto usa as cores oficiais.

A migração `20261007040000_duoeto_feed_gallery_prerequisites.sql` foi aplicada e registrada no Supabase `nblobpvjjuvvcxcfyeux`. Validação autenticada em transação revertida confirmou ocultação por sete dias, fotos/perfil acessíveis após ocultação e busca. Perfis, contatos, conversas e mensagens foram preservados (2 perfis, 1 contato, 1 conversa e 11 mensagens no momento da validação). Anônimos não executam a RPC do álbum e usuários não inserem diretamente prazos de ocultação.

Passaram as oito suítes (`profiles`, `feed`, `connections`, `interactions`, `safety`, `discovery`, `feed-gallery`, `messages`), TypeScript e build de produção. A suíte original de Feed valida a migração histórica; as de conexões/discovery e a nova suíte validam a atualização completa. O servidor de produção local respondeu às páginas públicas, redirecionou páginas protegidas e negou fotos sem sessão com 404 e no-store.

Chromium validou componentes reais em cópia isolada com ações e imagens simuladas: navegação por teclado, gestos verticais/laterais, troca de fotos, atalhos ignorados em formulários, ocultação e layout móvel/desktop sem overflow ou erros JavaScript. Isso não equivale a teste autenticado de upload no Storage nem a confirmação de implantação na Vercel.

## Implementação anterior

- Corrigidas duas referências `publilc.duoeto_profiles` na listagem de conexões. A migração de interação também repara a função instalada com o erro, preservando dados.
- Avaliação de interação acessível em Mensagens: cinco mensagens de texto de cada participante na mesma conversa; o primeiro contato não conta. Quatro notas inteiras de 1 a 5, sem comentário livre. A primeira avaliação pode ocorrer em conversa ativa ou encerrada; o encerramento não reduz o intervalo de sete dias para reavaliação.
- Reavaliação substitui a avaliação anterior daquele autor/destinatário nas médias, preservando histórico privado. A visibilidade original não pode mudar. Usuários não leem diretamente o histórico e não alteram nem apagam avaliações.
- Reputação mostra médias de fotos, conversa, respeito e humor, percepção inicial, experiência, nota geral e contagens. Os rótulos de 15 primeiras impressões e 35 interações não alteram pesos. Sem interação não há nota geral. Avaliações privadas contribuem nas médias e não aparecem na lista pública. Uma avaliação pública de interação mostra suas quatro notas, sem inventar uma quinta nota individual.
- Denúncias de perfil, contato, conversa e avaliações públicas: motivos padronizados, relato opcional de até 1.000 caracteres, envio idempotente, protocolo e status em `/denuncias`. Participantes podem denunciar contatos/conversas mesmo após bloqueio. O denunciado não recebe notificação de denúncia. Somente uma operação administrativa confiável pode atualizar o status.
- Notificações em `/notificacoes`: contato recebido, aceito ou recusado, mensagem, encerramento e mudança de status da denúncia. São privadas, sem texto das mensagens ou autoria das avaliações privadas. Bloquear não gera notificação e oculta notificações de conexão com a pessoa bloqueada. Leitura restrita ao destinatário. Atualização periódica enquanto a aba está visível; sem push/e-mail.
- Filtros reais no banco: idade, objetivo, interesse, nota geral mínima e perfil completo. Idade padrão 18–50; demais filtros desligados. Completude considera dados obrigatórios/foto, descrição ou interesse e objetivo. Reputação mínima exclui quem ainda não tem nota geral; sem o filtro continuam no Feed.
- Navegação vertical na foto e retorno aos últimos 50 perfis nesta visita, com nova autorização no servidor. Perfis bloqueados, ocultados, em contato pendente ou conversa ativa não são restaurados pelo histórico.
- Indicador de completude e reputação real na prévia do próprio perfil.
- O cliente Supabase do servidor lê cookies antes de validar sua configuração, garantindo renderização por requisição. O build não tenta pré-renderizar páginas com sessão nem depende de valores Supabase fictícios.

## Migrações e aplicação remota

Novas migrações, nesta ordem:

1. `20261007010000_duoeto_interactions.sql`
2. `20261007020000_duoeto_safety_notifications.sql`
3. `20261007030000_duoeto_discovery_filters.sql`

Dependem das migrações anteriores de perfis, Feed e conexões. A migração de perfis foi aplicada manualmente no SQL Editor e pode não constar no histórico remoto; confira o estado real antes de aplicar qualquer arquivo. Não execute `db push` indiscriminadamente, não reaplique a criação de perfis e não use `supabase/drafts`.

As novas tabelas, histórico e funções privilegiadas ficam em `duoeto_private`, fora dos schemas da Data API. As tabelas têm RLS sem permissões diretas de usuário; somente RPCs específicas autorizam operações e projetam dados. Não exponha o schema privado. Não inclua credencial administrativa na aplicação. Atualizações de moderação precisam ocorrer por um operador confiável, com política operacional e auditoria ainda a definir.

Para autenticação e serviço real, preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL` nas configurações do ambiente e da Vercel. Depois, faça novo build e validação com contas controladas; não envie chaves no chat ou ao Git. As migrações de conexões e as três novas migrações foram aplicadas no projeto `nblobpvjjuvvcxcfyeux` em 7 de outubro de 2026, com registro transacional no histórico. Perfis e Feed existentes foram preservados. Publicação na Vercel e testes autenticados de upload no Storage ainda não foram verificados.

## Validação reproduzível

Em `/workspace/APPdeConexoes`, com Node.js >=22:

```sh
npm ci
npm run test:profiles
npm run test:feed
npm run test:connections
npm run test:interactions
npm run test:safety
npm run test:discovery
npm run test:feed-gallery
npm run test:messages
npm run test:accounts
npm run typecheck
npm run build
npm run start -- --hostname 127.0.0.1
```

As suítes de banco executam as migrações reais em PostgreSQL isolado via PGlite. A fixture de conexões simula a versão anterior com o erro `publilc` e valida a reparação pela migração nova. Testes cobrem notas/contagens/prazos, privacidade, substituição nas médias, projeções, participantes, contas inelegíveis, anonimato, bloqueios, notificações únicas e filtros. Não substituem teste de concorrência com conexões PostgreSQL independentes nem aceitação autenticada no Supabase real.

Resultado remoto: ciclo de primeira impressão → contato → aceite → cinco mensagens de cada participante → avaliação de interação → nota geral, mais denúncias privadas, notificações, encerramento, filtros, bloqueio e acesso ao histórico, executado sob o papel `authenticated` com dois perfis existentes em transação revertida. As novas tabelas ficaram sem registros de teste e os dois perfis existentes foram preservados. RPCs novas negaram execução anônima e `duoeto_private` permaneceu fora da Data API.

Resultado local: as seis suítes, TypeScript e build de produção passaram. Dez requisições HTTP validaram páginas públicas, redirecionamentos de rotas protegidas e callback sem código. Chromium com viewport móvel validou as páginas públicas e a navegação para Notificações, sem overflow horizontal ou erros JavaScript. Telas autenticadas e gestos do Feed ainda precisam de aceitação com contas reais.

Sem configuração Supabase, `/`, `/entrar` e `/cadastro` devem responder 200. Feed, Perfil, Mensagens, Notificações e Denúncias devem redirecionar para `/entrar?erro=configuracao`. Isso valida a fronteira de configuração, não o fluxo autenticado.

## Pendências que exigem decisões ou acesso externo

- Aceitação final no dispositivo do responsável e configuração de SMTP personalizado. Telas autenticadas e upload no Storage foram validados com contas temporárias.
- Reordenação manual de fotos complementares, política de retenção/limpeza de objetos antigos e moderação de imagens. O álbum de seis fotos, escolha da principal e remoção do álbum já estão implementados.
- Opções de gênero e significado do filtro, consentimento e precisão da localização aproximada para distância. Não há filtro de distância ou coordenadas inventadas.
- Critérios, limiares e redação dos badges automáticos e respectivo filtro. Interesses escolhidos já aparecem como chips.
- Operação de moderação: pessoas responsáveis, painel, acesso administrativo, auditoria das decisões, punição, recurso, invalidação de avaliações, prazos e comunicação. Registro/status de denúncia estão implementados; uma fila não significa que exista equipe operacional.
- Política de privacidade, consentimentos e retenção operacional antes da abertura pública. A exclusão definitiva da conta e dados associados foi aprovada e implementada.
- Ordenação por última atividade e filtros adicionais de Mensagens ainda podem evoluir. Paginação por criação/ID, busca por nome e filtro de não lidas estão implementados. Mídia, push/e-mail, identidade verificada, monetização e aplicativo nativo permanecem fora do primeiro corte.
