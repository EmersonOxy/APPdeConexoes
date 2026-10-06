# App de Conexões

MVP web para descobrir pessoas, avaliar a primeira impressão, iniciar um primeiro contato e construir reputação de interação de forma transparente.

## Documentação

- [Bíblia do Produto](docs/BIBLIA_DO_PRODUTO.md)
- [Decisões do MVP](docs/DECISOES_MVP.md)
- [Arquitetura do MVP](docs/ARQUITETURA_MVP.md)
- [Autenticação e verificações](docs/AUTENTICACAO.md)
- [Perfis Duoeto e migração](docs/PERFIS_DUOETO.md)
- [Feed real e privacidade](docs/FEED_DUOETO.md)

## Configuração local

1. Instale as dependências com npm ci.
2. Copie .env.example para .env.local.
3. Preencha as duas variáveis públicas do Supabase.
4. Execute npm run test:profiles, npm run test:feed, npm run typecheck e npm run build.
5. Inicie a aplicação com npm run dev.

O SQL em supabase/drafts é um rascunho para revisão e não deve ser aplicado. Login, confirmação de e-mail, edição e foto do próprio perfil estão implementados. O Feed usa perfis reais após a migração descrita em docs/FEED_DUOETO.md. Avaliações e mensagens persistidas continuam fora desta etapa.

Não envie .env.local nem chaves administrativas do Supabase para o Git.
