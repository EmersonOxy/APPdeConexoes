# App de Conexões

MVP web para descobrir pessoas, avaliar a primeira impressão, iniciar um primeiro contato e construir reputação de interação de forma transparente.

## Documentação

- [Auditoria funcional completa e próximas decisões](docs/AUDITORIA_FUNCIONAL.md)
- [Bíblia do Produto](docs/BIBLIA_DO_PRODUTO.md)
- [Decisões do MVP](docs/DECISOES_MVP.md)
- [Arquitetura do MVP](docs/ARQUITETURA_MVP.md)
- [Autenticação e verificações](docs/AUTENTICACAO.md)
- [Perfis Duoeto e migração](docs/PERFIS_DUOETO.md)
- [Feed real e privacidade](docs/FEED_DUOETO.md)
- [Continuidade do MVP, migrações e pendências](docs/CONTINUIDADE_MVP.md)

## Configuração local

1. Instale as dependências com npm ci.
2. Copie .env.example para .env.local.
3. Preencha as variáveis públicas do Supabase e NEXT_PUBLIC_SITE_URL.
4. Execute npm run test:profiles, npm run test:feed, npm run test:connections, npm run test:interactions, npm run test:safety, npm run test:discovery, npm run test:feed-gallery, npm run test:messages, npm run test:accounts, npm run test:notifications, npm run typecheck e npm run build.
5. Inicie a aplicação com npm run dev.

O SQL em supabase/drafts é um rascunho para revisão e não deve ser aplicado. Login, confirmação de e-mail, edição e foto do próprio perfil estão implementados. O Feed usa perfis reais após a migração descrita em docs/FEED_DUOETO.md. Primeiras impressões, contatos, conversas e avaliações de interação estão ligados às RPCs do banco. As novas migrações incluem denúncias, notificações e filtros; confira a ordem e as limitações em docs/CONTINUIDADE_MVP.md antes da aplicação remota.

Não envie .env.local nem chaves administrativas do Supabase para o Git.
