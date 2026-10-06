# App de Conexões

MVP web para descobrir pessoas, avaliar a primeira impressão, iniciar um primeiro contato e construir reputação de interação de forma transparente.

## Documentação

- [Bíblia do Produto](docs/BIBLIA_DO_PRODUTO.md)
- [Decisões do MVP](docs/DECISOES_MVP.md)
- [Arquitetura do MVP](docs/ARQUITETURA_MVP.md)
- [Autenticação e verificações](docs/AUTENTICACAO.md)
- [Perfis Duoeto e migração](docs/PERFIS_DUOETO.md)

## Configuração local

1. Instale as dependências com npm install.
2. Copie .env.example para .env.local.
3. Preencha as duas variáveis públicas do Supabase.
4. Use npm run build para verificar a base visual.
5. Inicie a aplicação com npm run dev para explorar a prévia.

O SQL em supabase/drafts é um rascunho para revisão, ainda não deve ser aplicado. Autenticação, cadastro e mensagens reais ainda não estão implementados; as telas são uma prévia identificada como tal.

Não envie .env.local nem chaves administrativas do Supabase para o Git.
