# Perfis Duoeto

Esta etapa implementa o próprio perfil: nome, data de nascimento, cidade, estado e foto principal obrigatórios; descrição, interesses e objetivos opcionais. A prévia mostra idade, não data de nascimento ou e-mail. A interface usa o ícone e a logo fornecidos pelo responsável.

## Ativação no Supabase

Execute somente supabase/migrations/20261006010000_duoeto_profiles.sql no SQL Editor do projeto nblobpvjjuvvcxcfyeux. A migração usa transação e cria a tabela duoeto_profiles e um bucket privado duoeto-profile-photos. Não execute supabase/drafts.

A migração foi aplicada no projeto em 6 de outubro de 2026 pelo SQL Editor, com resultado de sucesso. O comando acima serve apenas para novos ambientes; não execute a criação novamente no mesmo banco.

A tabela de perfis continua acessível diretamente apenas pelo dono autenticado com e-mail confirmado. A etapa seguinte, descrita em [Feed Duoeto](FEED_DUOETO.md), acrescenta uma projeção limitada para descoberta e leitura somente da foto principal atual, com bloqueios bilaterais. Data de nascimento e e-mail não entram nessa projeção.

## Fotos

JPG, PNG e WebP até 3 MB são validados pelo servidor, redimensionados e convertidos para JPG sem metadados. O limite deixa margem para o formulário nos requests da Vercel. O bucket tem um limite adicional de 5 MB. Acesso via URL assinada de uma hora. Arquivos recebem um nome aleatório dentro da pasta da conta. A foto anterior é conservada nesta etapa para evitar perda em edições concorrentes; limpeza de arquivos substituídos fica para uma rotina futura.

## Verificação

npm run test:profiles executa:
- PostgreSQL isolado com mock das tabelas Auth e Storage e a migração real.
- Isolamento entre duas contas, rejeição de acesso anônimo e de usuário não confirmado.
- Rejeição de foto de terceiros, foto inexistente e data de nascimento de menor.
- Validação do formulário e campos opcionais.

Esses testes não substituem a verificação do serviço Storage real depois de aplicar a migração. O teste final é salvar, recarregar, editar e pré-visualizar com uma conta confirmada.

## Escopo

O limite de 18 anos é a decisão operacional deste corte. Objetivos permanecem opcionais conforme a bíblia e a orientação aceita para esta etapa; isso substitui a obrigatoriedade sugerida no documento DECISOES_MVP.

## Atualização — álbum de até seis fotos

O limite confirmado é seis fotos, incluindo a principal obrigatória. Cada arquivo tem até 3 MB e é enviado em uma requisição separada; o servidor valida JPEG/PNG/WebP, limita resolução de entrada, aplica orientação, redimensiona e recodifica em JPEG sem metadados. Só depois o formulário salva a principal e as fotos complementares. Isso evita um único envio de 18 MB na hospedagem.

A edição permite escolher a principal e remover imagens do álbum, mantendo ao menos a principal. As complementares mantêm a ordem de adição. O banco valida propriedade dos objetos, existência, unicidade e limite de seis, inclusive em chamadas diretas. Perfil público e Feed compartilham a galeria privada. Remover do álbum revoga compartilhamento; limpeza física de uploads antigos/incompletos depende da política de retenção ainda pendente.
