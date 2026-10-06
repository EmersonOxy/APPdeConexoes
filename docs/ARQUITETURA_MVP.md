# Arquitetura do MVP

## Direção

| Camada | Escolha |
| --- | --- |
| Aplicação | Next.js com App Router e TypeScript |
| Autenticação, banco e arquivos | Supabase |
| Publicação | Vercel |
| Código e documentação | GitHub |

## Rotas iniciais

| Rota | Responsabilidade |
| --- | --- |
| / | Explica o produto e direciona para cadastro ou Feed. |
| /cadastro | Onboarding de perfil após autenticação. |
| /feed | Descoberta, filtros, primeira impressão e primeiro contato. |
| /mensagens | Separa primeiros contatos e conversas aceitas. |
| /perfil | Exibe e permite editar o próprio perfil, interesses e preferências. |

As telas iniciais são uma base visual de produto. O acesso a dados reais será ligado quando as variáveis de ambiente do Supabase forem configuradas.

## Dados e segurança

O rascunho SQL em supabase/drafts propõe perfis, fotos, interesses, avaliações, primeiros contatos, conversas, mensagens, exclusões de Feed, bloqueios, denúncias, notificações e auditoria. Não deve ser aplicado antes de validar permissões, bloqueios, confirmação de e-mail e acesso à reputação.

As regras sensíveis devem morar no banco:

- Row Level Security em todas as tabelas expostas;
- operações de primeiro contato, resposta, encerramento, bloqueio e avaliações feitas por funções controladas;
- validação de participantes, bloqueio, contagem de mensagens e intervalo de avaliação no banco, não apenas na interface;
- médias públicas em uma visão sem revelar autores de avaliações privadas;
- dados brutos de avaliações acessíveis somente ao autor e à moderação com credencial administrativa.

## Configuração necessária

O arquivo .env.example lista os nomes necessários:

    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Copie-o para .env.local e preencha os valores somente na sua máquina. Cadastre as mesmas chaves na Vercel. Nunca envie .env.local, service-role key ou tokens para o Git.

## Próxima sequência técnica

1. Vincular o repositório local ao projeto Vercel correspondente.
2. Configurar as duas chaves públicas do Supabase em .env.local e na Vercel.
3. Revisar o rascunho SQL, testar permissões e convertê-lo em migração em um ambiente isolado.
4. Configurar a autenticação por e-mail confirmado no Supabase.
5. Ligar cadastro, Feed, avaliações e primeiro contato às funções seguras do banco.
6. Publicar uma prévia e testar o fluxo com contas de teste.
