# Perfis Duoeto

Esta etapa implementa o próprio perfil: nome, data de nascimento, cidade, estado e foto principal obrigatórios; descrição, interesses e objetivos opcionais. A prévia mostra idade, não data de nascimento ou e-mail. A interface usa o ícone e a logo fornecidos pelo responsável.

## Ativação no Supabase

Execute somente supabase/migrations/20261006010000_duoeto_profiles.sql no SQL Editor do projeto nblobpvjjuvvcxcfyeux. A migração usa transação e cria a tabela duoeto_profiles e um bucket privado duoeto-profile-photos. Não execute supabase/drafts.

A migração foi aplicada no projeto em 6 de outubro de 2026 pelo SQL Editor, com resultado de sucesso. O comando acima serve apenas para novos ambientes; não execute a criação novamente no mesmo banco.

Perfis e fotos só podem ser lidos ou alterados pelo dono autenticado com e-mail confirmado. Esta etapa não libera descoberta pública nem conecta o Feed, que continua sendo prévia. A leitura de outros perfis será desenvolvida com bloqueios e regras de reputação na próxima etapa.

## Fotos

JPG, PNG e WebP até 5 MB são validados pelo servidor, redimensionados e convertidos para JPG sem metadados. Acesso via URL assinada de uma hora. Arquivos recebem um nome aleatório dentro da pasta da conta. A foto anterior é conservada nesta etapa para evitar perda em edições concorrentes; limpeza de arquivos substituídos fica para uma rotina futura.

## Verificação

npm run test:profiles executa:
- PostgreSQL isolado com mock das tabelas Auth e Storage e a migração real.
- Isolamento entre duas contas, rejeição de acesso anônimo e de usuário não confirmado.
- Rejeição de foto de terceiros, foto inexistente e data de nascimento de menor.
- Validação do formulário e campos opcionais.

Esses testes não substituem a verificação do serviço Storage real depois de aplicar a migração. O teste final é salvar, recarregar, editar e pré-visualizar com uma conta confirmada.

## Escopo

O limite de 18 anos é a decisão operacional deste corte. Objetivos permanecem opcionais conforme a bíblia e a orientação aceita para esta etapa; isso substitui a obrigatoriedade sugerida no documento DECISOES_MVP.
