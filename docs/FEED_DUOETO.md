# Feed Duoeto

## Escopo

O Feed consulta perfis reais, em ordem aleatória, para pessoas autenticadas com e-mail confirmado e perfil obrigatório completo. Mostra nome, idade calculada, cidade, estado, descrição, interesses, objetivos e foto principal. Não retorna data de nascimento, e-mail ou reputação.

O recorte usa a faixa padrão de 18 a 50 anos. Não apresenta distância, gênero ou outros filtros como se estivessem funcionando: esses dados e controles ainda não existem. Avaliação e primeiro contato não são simulados em perfis reais. Contatos/conversas ainda não existem no banco; quando implementados, suas exclusões e o encerramento por bloqueio devem integrar a mesma fronteira de autorização antes de serem liberados.

“Passar” consulta novamente o banco e exclui os perfis já vistos nesta visita (até 5.000). Não registra desinteresse. Ao esgotar candidatos, mostra estado vazio sem repetir automaticamente o último perfil. Reabrir a página inicia outra visita. “Não tenho interesse” persiste uma exclusão unilateral; a seção Preferências permite restaurar esse conjunto. Bloqueio persiste e impede a leitura entre as duas contas, independentemente de quem o criou. Desbloqueio não é implementado neste corte.

## Banco e autorização

Foi inspecionado o projeto `nblobpvjjuvvcxcfyeux` pelo plugin Supabase antes da implementação. A estrutura anterior possuía somente `public.duoeto_profiles`, com leitura e escrita pelo dono, e bucket privado de fotos.

A migração nova é `supabase/migrations/20261006175150_duoeto_feed.sql`, criada pela CLI. Ela adiciona `duoeto_blocks`, `duoeto_feed_hidden`, índices, RLS e funções específicas. Não reaplica a migração de perfis e não depende de `supabase/drafts`.

Aplicada pelo plugin Supabase em 6 de outubro de 2026. O nome do arquivo foi alinhado à versão `20261006175150` registrada pelo plugin no histórico remoto. A migração anterior de perfis foi aplicada manualmente no SQL Editor e não consta nesse histórico: não executar `db push` indiscriminadamente nem reaplicar a criação de perfis.

A verificação remota, usando o papel authenticated em transação revertida, confirmou 0 candidatos, 1 perfil próprio e 1 foto acessível. `anon` não tem EXECUTE nas duas novas RPCs. O advisor manteve os alertas anteriores sobre [execução da função duoeto_confirmed_user](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) e [proteção contra senhas vazadas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), sem alertas novos desta migração. Essas configurações existentes não foram alteradas nesta etapa.

As RPCs públicas usam SECURITY INVOKER. A projeção privilegiada fica em `duoeto_private` (não incluir nos schemas expostos pela Data API), com search_path vazio, execução revogada de PUBLIC/anon, identidade derivada de auth.uid() e projeção explícita. O acesso privilegiado é necessário para ler apenas a representação compartilhável sem liberar SELECT de dados privados na tabela original. O chamador nunca escolhe o ID do visitante.

Ambas as contas precisam estar confirmadas, com perfil/foto, sem deleted_at e sem banned_until vigente. Bloqueios são bilaterais; exclusões por desinteresse são unilaterais. A tabela de bloqueios só permite ao autor ler e inserir seus registros. Não há acesso anônimo às RPCs.

A RLS do Storage permite ler apenas a foto principal de um perfil elegível; fotos antigas permanecem restritas ao dono. Upload e exclusão continuam com as políticas anteriores. A rota `/feed/photo/[id]` verifica sessão, elegibilidade e RLS a cada leitura, devolvendo a imagem com `private, no-store`, sem enviar URL assinada ao navegador. O Feed reconsulta ao avançar e recarrega ao retornar à aba.

Limite inerente: uma imagem ou dados já entregues não podem ser apagados do dispositivo de quem os viu. O Storage permite que um cliente autorizado emita URLs assinadas diretamente; URLs já emitidas podem valer até expirar mesmo após bloqueio. A interface do Feed não as emite. Bloqueios impedem novas consultas autorizadas; não são revogação retroativa de conteúdo entregue. A edição do próprio perfil mantém o fluxo existente de URL assinada.

## Validação

- `npm run test:profiles`: regressões de validação, edição, foto e isolamento anteriores.
- `npm run test:feed`: PostgreSQL isolado com ambas as migrações reais; projeção sem dados privados, idade, exclusão do próprio perfil, contas incompletas/não confirmadas/banidas/excluídas, bloqueio bilateral, tentativa de inserir bloqueio de terceiro, exclusão unilateral e reversão, fotos atuais versus antigas, anonimato e preservação da edição própria.
- `npm run typecheck` e `npm run build`: tipagem e compilação de produção.
- Verificação HTTP no build de produção local: `/feed` redireciona visitantes anônimos para `/entrar`; foto sem sessão responde 404 com no-store. As duas RPCs reais negam chamadas REST anônimas. Navegador confirmou o formulário de login e ausência de erros no console.

O banco real contém somente um perfil no momento da inspeção. É esperado que esse usuário veja o estado vazio, pois o próprio perfil é excluído. A aceitação visual com duas contas confirmadas deve verificar foto, passar, desinteresse, restauração e bloqueio nos dois sentidos. Os testes isolados não substituem essa aceitação com o serviço Storage real.
