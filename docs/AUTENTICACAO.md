# Autenticação por e-mail

## Implementado

- Cadastro em /cadastro com e-mail e senha de 8 a 128 caracteres.
- Login em /entrar.
- Confirmação PKCE em /auth/callback, com troca do código por sessão.
- Renovação de sessão pelo proxy e persistência de cookies.
- Proteção no servidor de /perfil e /mensagens, exigindo conta com e-mail confirmado.
- Saída da sessão atual pelo botão do perfil.
- Erros genéricos de autenticação sem exibir detalhes internos do provedor.

## Ambiente

Configure na Vercel:

    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    NEXT_PUBLIC_SITE_URL=https://appdeconexoes.vercel.app

Localmente, NEXT_PUBLIC_SITE_URL deve apontar para http://localhost:3000.
Os callbacks autorizados no Supabase são /auth/callback nos dois domínios.
O fluxo PKCE exige abrir o link de confirmação no mesmo navegador usado no cadastro.
O modelo padrão de e-mail do Supabase deve preservar seu link de confirmação, que entrega o código ao callback.

## Verificações realizadas

- Compilação de produção e TypeScript passaram.
- /cadastro e /entrar responderam HTTP 200.
- /perfil e /mensagens sem sessão redirecionaram para /entrar.
- Callback sem código e com código inválido redirecionou para erro de confirmação.

Não foram criados usuários reais ou enviados e-mails nos testes. Cadastro completo, confirmação recebida na caixa de entrada, renovação de sessão e logout autenticado precisam de um teste com uma conta controlada pelo responsável.

## Banco: revisão do rascunho

O SQL em supabase/drafts permanece impróprio para aplicação. A revisão identificou:

- A visão de reputação permite consulta antes de avaliar o perfil.
- Políticas de leitura de mensagens e contatos não verificam bloqueio bilateral.
- A atualização do próprio perfil permite modificar status e campos de ativação.
- Funções precisam restringir execução pública e aplicar elegibilidade em todas as operações.
- Contatos precisam de controle concorrente por par, expiração e limites contra spam.
- Reavaliação precisa de controle concorrente para garantir o intervalo de sete dias.
- Gênero e localização aproximada ainda não têm modelo adequado para filtros.

Antes de aplicar migrações, testar com duas contas e uma sessão anônima: acesso cruzado a mensagens, modificação de status, consulta prematura da reputação, contato após bloqueio, repetição de avaliação e conta suspensa. O login Supabase não depende da aplicação deste rascunho.
