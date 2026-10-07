# Feed Duoeto — estado atual

O Feed consulta perfis reais em ordem aleatória, com e-mail confirmado, perfil completo nos campos obrigatórios e bloqueios bilaterais respeitados. A projeção não expõe data de nascimento ou e-mail. As decisões atuais estão em [DECISOES_MVP.md](DECISOES_MVP.md).

## Navegação e fotos

Uma pessoa por vez, foto em destaque e informações/avaliação em expansão progressiva. Deslize vertical ou ↑/↓ no computador troca de perfil; deslize lateral ou controles de foto navegam pelo álbum de até seis imagens. Não existe botão “Passar”. O histórico da visita guarda até 50 perfis e reautoriza cada retorno. Controles de formulário não acionam os atalhos do Feed.

Filtros de idade, interesse, objetivo, nota geral e completude são aplicados no banco. Localização aproximada, gênero e badges ainda exigem decisões. A visita evita repetir até 5.000 perfis vistos; ao esgotar os candidatos, mostra estado vazio. Uma nova visita reinicia a descoberta.

## Não tenho interesse e bloqueio

`duoeto_hide_profile` registra expiração de sete dias calculada no servidor. A tabela não permite inserção direta nem alteração do prazo por usuários. A escolha afeta somente o Feed de quem a fez; fotos, avaliação e contatos continuam permitidos. Preferências podem ser restauradas antes do prazo. Expiração não exige tarefa agendada: a consulta ignora preferências vencidas. Registros anteriores, sem data conhecida, recebem sete dias a partir da migração.

Bloqueio permanece bilateral, impede contato e leitura entre as contas e encerra conversas ativas. Não gera notificação. Desbloqueio ainda não foi implementado.

## Acesso às fotos

`duoeto_profile_photos` autoriza o álbum atual; `duoeto_feed_photo` mantém compatibilidade para a principal. O bucket continua privado. A rota `/feed/photo/[id]?index=0` verifica sessão e RLS e retorna `private, no-store`; índices permitidos vão de 0 a 5. Fotos removidas do álbum deixam de ser compartilhadas, embora o objeto antigo continue privado ao dono até que a política de retenção seja definida.

A migração `20261007040000_duoeto_feed_gallery_prerequisites.sql` atualiza as regras anteriores sem apagar dados. Não reaplique migrações antigas nem execute `db push` sem conferir o histórico remoto.

## Validação

- `test:feed` cobre a migração original isolada.
- `test:discovery`, `test:connections`, `test:interactions` e `test:safety` usam também a migração atual.
- `test:feed-gallery` cobre prazo, renovação, unilateralidade, contatos preservados, álbum privado, limite de seis fotos, avaliação bilateral e cursores de mensagem.
- Teste Chromium em cópia isolada da interface, com dados e ações simulados, exercita setas, gestos, álbum, formulários e ausência de overflow em celular/computador. A aceitação autenticada de upload no serviço real permanece distinta dessa validação.
