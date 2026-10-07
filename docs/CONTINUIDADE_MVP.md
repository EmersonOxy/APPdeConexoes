# Continuidade do MVP — 7 de outubro de 2026

Referências de produto: [Bíblia](BIBLIA_DO_PRODUTO.md) e [Decisões do MVP](DECISOES_MVP.md). As decisões posteriores prevalecem sobre propostas antigas. Este documento registra a implementação local e a aplicação validada no Supabase remoto. A implantação na Vercel não foi verificada por esta tarefa.

## Implementação

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
npm run typecheck
npm run build
npm run start -- --hostname 127.0.0.1
```

As suítes de banco executam as migrações reais em PostgreSQL isolado via PGlite. A fixture de conexões simula a versão anterior com o erro `publilc` e valida a reparação pela migração nova. Testes cobrem notas/contagens/prazos, privacidade, substituição nas médias, projeções, participantes, contas inelegíveis, anonimato, bloqueios, notificações únicas e filtros. Não substituem teste de concorrência com conexões PostgreSQL independentes nem aceitação autenticada no Supabase real.

Resultado remoto: ciclo de primeira impressão → contato → aceite → cinco mensagens de cada participante → avaliação de interação → nota geral, mais denúncias privadas, notificações, encerramento, filtros, bloqueio e acesso ao histórico, executado sob o papel `authenticated` com dois perfis existentes em transação revertida. As novas tabelas ficaram sem registros de teste e os dois perfis existentes foram preservados. RPCs novas negaram execução anônima e `duoeto_private` permaneceu fora da Data API.

Resultado local: as seis suítes, TypeScript e build de produção passaram. Dez requisições HTTP validaram páginas públicas, redirecionamentos de rotas protegidas e callback sem código. Chromium com viewport móvel validou as páginas públicas e a navegação para Notificações, sem overflow horizontal ou erros JavaScript. Telas autenticadas e gestos do Feed ainda precisam de aceitação com contas reais.

Sem configuração Supabase, `/`, `/entrar` e `/cadastro` devem responder 200. Feed, Perfil, Mensagens, Notificações e Denúncias devem redirecionar para `/entrar?erro=configuracao`. Isso valida a fronteira de configuração, não o fluxo autenticado.

## Pendências que exigem decisões ou acesso externo

- Aceitação das telas com duas contas confirmadas no navegador, upload real no Storage e verificação da publicação na Vercel. A configuração pública foi carregada localmente de arquivo ignorado; banco remoto e ciclo SQL autenticado já foram validados.
- Limite de fotos e regras de remoção/reordenação/moderação para implementar álbum e navegação lateral; atualmente existe uma foto principal.
- Opções de gênero e significado do filtro, consentimento e precisão da localização aproximada para distância. Não há filtro de distância ou coordenadas inventadas.
- Critérios, limiares e redação dos badges automáticos e respectivo filtro. Interesses escolhidos já aparecem como chips.
- Operação de moderação: pessoas responsáveis, painel, acesso administrativo, auditoria das decisões, punição, recurso, invalidação de avaliações, prazos e comunicação. Registro/status de denúncia estão implementados; uma fila não significa que exista equipe operacional.
- Política de privacidade, consentimentos, retenção e exclusão de dados antes da abertura pública.
- Busca e filtros de Mensagens continuam sem especificação final. Mídia, push/e-mail, identidade verificada, monetização e aplicativo nativo permanecem fora do primeiro corte.
