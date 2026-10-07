# Revisão funcional da Bíblia — 7 de outubro de 2026

Comparação completa das seções 1–20 de `BIBLIA_DO_PRODUTO.md` com as decisões posteriores, rotas, componentes e migrações atuais. Prioridade confirmada: funcionalidades antes do visual. Esta revisão substitui listas históricas de pendências quando elas divergirem do estado abaixo.

## Resultado por área

| Bíblia | Situação encontrada | Evidência / restante |
| --- | --- | --- |
| 1–5: finalidade, princípios e ciclo | Implementado o ciclo perfil → Feed → primeira impressão → contato → conversa → interação, sem match, ranking ou pesos ocultos. | RPCs de conexões/interações, testes `connections` e `interactions`. Prevenção operacional de fraude ainda precisa de política. |
| 6: navegação | Feed, Mensagens e Perfil; notificações secundárias; Conversas como aba inicial. | `application-shell`, `/mensagens`. Links específicos de notificações concluídos nesta revisão. |
| 7: cadastro e edição | E-mail confirmado, idade mínima 18, foto/nome/data/cidade/estado obrigatórios; interesses, descrição e objetivos opcionais; completude. | `/cadastro`, `/perfil`, validação e RLS. Login por usuário, recuperação e exclusão já implementados. SMTP limitado mantido por decisão do responsável. |
| 7–8: álbum e perfil público | Seis fotos, principal obrigatória, troca/remoção, navegação lateral, prévia do perfil salvo, reputação e interesses. | `profile-editor`, `profile-gallery`, `/pessoa/[id]`. Prévia ainda usa apresentação própria, não reprodução integral do Feed. Reordenação manual foi adiada nas decisões posteriores; moderação/limpeza de arquivos precisam de regras. |
| 8: badges | Interesses escolhidos disponíveis; reconhecimentos automáticos ainda não implementados. | Faltam limiares, textos e limites definidos. Não inventar critérios nem badges negativos. |
| 9: Feed | Um perfil por vez, gestos/setas, histórico recente, notas ocultas até avaliar, desinteresse unilateral por 7 dias e restauração. | `feed`, `profile-gallery`, testes `feed-gallery`. Badge “Novo” segue proposta, não requisito fechado. |
| 10: filtros | Idade, interesses, objetivos, reputação e completude; tela separada com aplicar/cancelar/padrão. | `/feed/filtros` e SQL de descoberta. Gênero, distância e badges dependem das definições listadas abaixo. |
| 11–12: reputação e privacidade | Primeira impressão única; quatro notas de interação; cinco mensagens por pessoa; reavaliação após sete dias; médias, contagens e três visibilidades. | Testes `interactions`, projeções privadas. Lista pública mostra as avaliações recentes; paginação dessa lista ainda pode evoluir. Auditoria técnica existe, mas operação de moderação não está pronta. |
| 13: primeiro contato | Texto único, avaliação prévia, aceite bilateral, recusa, edição/exclusão em uma hora, expiração em 30 dias e intervalo após recusa. | `ContactCard` e RPC. Nova tela abre diretamente contatos vindos de notificações, sem expor o texto antes de “Ler mensagem”. |
| 14: conversas | Texto, histórico incremental, paginação, busca por nome/usuário, não lidas, encerramento, perfil, bloqueio e denúncia. | `messages`, testes `messages` e `accounts`. Link direto abre conversa antiga mesmo fora da primeira página. Ordem por criação permanece a decisão atual. Mídia/respostas/exclusão de mensagens são futuras. |
| 15: segurança e moderação | Bloqueio bilateral, desbloqueio, denúncia privada com protocolo/status, contas inelegíveis impedidas, exclusão definitiva. | RLS e testes de autorização. Não existe operação completa de moderação: falta definir responsáveis, acesso, sanções, recursos e invalidação de avaliações. |
| 16: notificações | Eventos internos de contato, mensagem, encerramento e status de denúncia; leitura privada e atualização por evento/consulta. | Nesta revisão: histórico paginado sem teto de 100, total global de não lidas e destinos específicos autorizados. Não há push nem e-mail de eventos. |
| 17–18: escopo | Núcleo implementado; funcionalidades explicitamente futuras permanecem fora. | Não foram adicionados mídia, chamadas, comunidade, monetização, identidade verificada ou aplicativo nativo. |
| 19–20: decisões e governança | Cálculo, escala, reavaliação, idade mínima, e-mail, textos e eventos foram definidos depois da Bíblia inicial. | `DECISOES_MVP.md` prevalece; não tratar as perguntas históricas já respondidas como bloqueios atuais. |

## Lacunas tratadas nesta continuação

1. “Ver detalhes” antes abria apenas a lista geral. Agora direciona ao contato, conversa ou protocolo exato. Cada destino verifica novamente participante/autor e bloqueios, inclusive quando o item não está na primeira página.
2. Notificações antes paravam em 100. Agora têm páginas de 30, cursor pelo ID e total de não lidas independente da página carregada. IDs são texto para preservar precisão; notificações novas não duplicam nem pulam páginas antigas.
3. Contatos aceitos deixam de exibir o status em inglês e oferecem acesso à conversa na tela de detalhe.
4. Continuidade e decisões registram o envio limitado de e-mail como escolha temporária aceita, em vez de trabalho que ainda deva bloquear esta etapa.

## Próximas decisões de produto

- **Gênero:** quais opções o perfil oferece e o que exatamente o filtro seleciona.
- **Distância:** fonte da localização aproximada, consentimento, precisão, atualização e comportamento sem localização. Cidade/estado não são coordenadas; não simular quilômetros.
- **Badges positivos:** métricas, mínimo de avaliações, limiares e textos.
- **Moderação:** responsáveis e permissões, fila/prazos, sanções, recurso, comunicação e invalidação de avaliações; só então implementar o painel operacional.
- **Privacidade/retensão:** texto e responsável pela política, consentimentos, retenção de arquivos não usados e dados de auditoria. A exclusão definitiva solicitada já existe.
- **Evoluções opcionais:** ordenar mensagens por atividade, reordenar fotos complementares, ampliar a prévia para reproduzir o Feed e paginar avaliações públicas. Estas propostas não mudam silenciosamente as decisões atuais.

## Envio de e-mail

O responsável decidiu manter por ora o serviço padrão limitado do Supabase. Nenhum provedor SMTP, domínio ou conta paga foi contratado/criado. A confirmação continua obrigatória, por link. A entrega de e-mails não é garantida por testes administrativos de autenticação. SMTP próprio será retomado depois.

## Validação da entrega

- Dez suítes automatizadas passaram, além de TypeScript e build de produção. A suíte nova cobre mais de 100 avisos, IDs acima da precisão de Number, chegadas entre páginas, contagem global, isolamento, leitura privada e bloqueios.
- Migração `20261007053000` aplicada no Supabase real, com registro transacional no histórico.
- Chromium com duas contas temporárias: notificação → contato sem abrir texto → leitura → aceite → conversa; 106 avisos carregados em quatro páginas; aviso de mensagem → conversa correta; links negados sem login e após bloqueio.
- Perfis, fotos e contas temporárias removidos pelo fluxo de exclusão. O envio de e-mails não foi usado nesses testes, preservando a cota limitada.
- Realtime continua com consulta periódica de recuperação. Nesta nuvem, o navegador usa essa recuperação por não confiar no certificado intermediário do acesso direto ao Supabase; a verificação TLS não foi desativada.
