# Decisões do MVP

Este documento fecha as regras que estavam marcadas como “Em aberto” na Bíblia do Produto e que são necessárias para implementar o primeiro ciclo com segurança. Elas são decisões do MVP, revisáveis somente por uma mudança explícita neste documento.

## Reputação

### Escala e registros

- Todas as notas usam números inteiros de **1 a 5**.
- A primeira impressão é uma avaliação única e imutável entre duas pessoas. Não pode ser editada nem excluída no MVP.
- A avaliação de interação é um único formulário com quatro notas obrigatórias: fotos, conversa, respeito e humor.
- A avaliação de interação só é liberada depois de **cinco mensagens válidas enviadas por cada participante** na mesma conversa.
- Mensagem válida é mensagem de texto não apagada. Mídias e mensagens de sistema não contam no MVP.
- Uma nova avaliação de interação pode ser enviada sete dias após a anterior. A nova avaliação substitui a anterior no cálculo público, enquanto o histórico anterior fica disponível apenas para auditoria de moderação.
- Encerrar a conversa permite enviar a primeira avaliação de interação antes de sete dias, desde que a regra de cinco mensagens por pessoa tenha sido satisfeita. O encerramento não permite burlar o intervalo de sete dias para uma reavaliação.
- Não há texto livre em avaliações no MVP. Essa escolha reduz assédio e a necessidade de moderar comentários pessoais desde o primeiro lançamento.

### Cálculo e apresentação

Para cada componente, a nota é a média aritmética de suas avaliações válidas. A precisão interna é de duas casas decimais; a interface mostra uma casa decimal.

    Percepção inicial = (média de primeira impressão + média de fotos) / 2
    Experiência = (média de conversa + média de respeito + média de humor) / 3
    Nota geral = (percepção inicial + experiência) / 2

Regras para dados ainda incompletos:

- Sem nenhuma primeira impressão, o perfil mostra “Ainda sem avaliações”.
- De 1 a 14 primeiras impressões, mostra a média de primeira impressão acompanhada do rótulo “Reputação em formação” e a contagem de avaliações.
- A partir da 15ª primeira impressão, a média continua sendo atualizada normalmente e recebe o rótulo “Reputação inicial estabelecida”.
- Enquanto não houver uma avaliação de interação válida, não há “Nota geral”. O perfil mostra somente a primeira impressão, com seu status.
- Após a primeira avaliação de interação, a aplicação calcula e exibe a percepção inicial, a experiência e a nota geral.
- A partir de 35 avaliações de interação, a interface acrescenta o rótulo “Histórico consolidado”. O marco não altera pesos ou a fórmula.
- Não há pesos ocultos, exclusão automática de notas extremas, pontuação por popularidade ou ordenação do Feed pela reputação.

### Privacidade

Cada avaliação define sua visibilidade ao ser criada:

| Opção | Resultado |
| --- | --- |
| Pública com perfil | Mostra nome e perfil de quem avaliou. |
| Pública com nome | Mostra somente o nome de quem avaliou. |
| Privada/anônima | Contribui apenas para as médias; não aparece na lista pública. |

A opção não pode ser alterada nem a avaliação pode ser apagada pelo autor no MVP. Isso protege a consistência do cálculo e reduz tentativas de pressão após uma avaliação. A moderação pode invalidar uma avaliação comprovadamente abusiva ou fraudulenta; avaliações invalidadas deixam de entrar nos cálculos.

## Feed e filtros

- O Feed seleciona aleatoriamente perfis elegíveis. Não há personalização comportamental no MVP.
- A ordem exclui bloqueios, pessoas marcadas como “Não tenho interesse”, conversas ativas e primeiros contatos pendentes.
- Uma pessoa não aparece duas vezes em sequência. Após terminar uma rodada, ela só pode voltar depois de outros perfis elegíveis.
- Um perfil já avaliado pode reaparecer com o indicador “Avaliado” e a nota já dada, mas não permite nova primeira impressão.
- O padrão inicial é: 18–50 anos, até 30 km, qualquer gênero, todos os objetivos e sem reputação mínima.
- “Ainda pensando” é uma opção de objetivo do perfil, não um filtro padrão obrigatório.
- O filtro de reputação mínima só inclui perfis que já tenham Nota geral. Quem estiver em formação continua aparecendo quando esse filtro não for usado.
- O filtro de perfil completo considera perfil com dados obrigatórios, foto principal, ao menos uma descrição ou interesse e um objetivo informado. Objetivos são opcionais para salvar um perfil; esta exigência se aplica apenas ao filtro de completude.
- Navegar para outra pessoa não é uma ação de rejeição: não há botão “Passar”. O Feed combina apresentação de perfis com navegação vertical: deslizar para cima avança; para baixo revisita a sequência recente. No computador, ↑ e ↓ fazem a mesma navegação; botões acessíveis também estão disponíveis. As fotos do mesmo perfil são navegadas lateralmente.
- “Não tenho interesse” oculta o perfil somente do Feed de quem escolheu a ação durante **7 dias**. Depois, ele volta a ser elegível, respeitando os demais filtros e exclusões. A preferência pode ser desfeita antes. Não impede contato, leitura do perfil/fotos ou avaliação e não afeta a reputação; não equivale a bloqueio.

## Fotos do perfil

- Decisão confirmada em 7 de outubro de 2026: até **6 fotos por perfil**, incluindo a principal obrigatória.
- Cada envio aceita JPG, PNG ou WebP de até **3 MB**, processado para remover metadados.
- O usuário escolhe a foto principal e pode remover as demais; para remover a principal, escolhe outra ou envia uma substituta.
- As fotos complementares aparecem na ordem em que foram adicionadas. Reordenação manual das complementares e política de retenção física continuam pendentes.
- O álbum segue a privacidade do perfil e os bloqueios bilaterais. Fotos removidas do álbum deixam de ser compartilhadas.

## Primeiro contato e conversa

- O remetente deve avaliar a primeira impressão antes de enviar o contato. O destinatário também deve avaliar o remetente antes de aceitar. **As duas primeiras impressões válidas são obrigatórias antes da conversa e da avaliação de interação**, além das cinco mensagens de cada participante.
- Ele é exclusivamente texto, com 1 a 500 caracteres, sem links ativos, mídia ou anexos no MVP.
- Há um único primeiro contato pendente por par de pessoas.
- Ele expira depois de 30 dias sem resposta.
- O destinatário pode aceitar ou recusar sem abrir o conteúdo. A aceitação exige a primeira impressão e cria uma conversa; a recusa não exige avaliação e não cria conversa.
- Depois de uma recusa, o remetente não pode iniciar novo primeiro contato para a mesma pessoa durante 30 dias.
- A mensagem de primeiro contato pode ser editada ou excluída por até uma hora, enquanto ainda estiver pendente.
- Conversas aceitas começam com texto. Fotos, vídeos, áudios, GIFs, respostas a mensagem e exclusão de mensagens são funcionalidades futuras de conversas.
- Encerrar uma conversa é unilateral, interrompe novas mensagens e não significa denúncia nem bloqueio.

## Bloqueio, denúncia e notificações

- Bloqueio é bilateral para visibilidade: as duas pessoas deixam de aparecer em Feed, busca, primeiro contato e conversas.
- Bloquear encerra uma conversa ativa e impede novos contatos. A pessoa bloqueada não recebe um motivo nem uma notificação de bloqueio.
- Denúncia sempre registra um motivo padronizado: spam, assédio, golpe/fraude, conteúdo ofensivo, perfil falso ou outro.
- A denúncia pode se referir a perfil, primeiro contato, conversa ou avaliação. O relato textual é opcional e limitado a 1.000 caracteres.
- O status da denúncia é privado ao denunciante e à moderação. O usuário denunciado só é informado quando uma punição exigir comunicação.
- O MVP tem notificações dentro do produto para primeiro contato recebido, primeiro contato respondido ou recusado, nova mensagem, conversa encerrada e atualizações relevantes de denúncia.
- Push e e-mail não fazem parte do primeiro corte. Eles serão incluídos depois que as preferências de notificação estiverem definidas.

## Limites de segurança

- O perfil só fica elegível ao Feed quando o cadastro obrigatório estiver completo.
- Localização é armazenada e usada apenas de forma aproximada para distância; endereço e coordenadas exatas nunca são exibidos.
- Usuários suspensos ou banidos não aparecem no Feed e não podem enviar mensagens, avaliações ou primeiros contatos.
- E-mail confirmado é obrigatório antes de ativar o perfil. Telefone e verificação de identidade são futuros.
- A moderação usa registros de auditoria, mas avaliações privadas não revelam publicamente a autoria.

## O que continua fora do MVP

- Aplicativo nativo;
- chamadas de áudio e vídeo;
- mídia em conversas;
- Feed personalizado;
- conexões sociais, seguidores ou comunidade;
- monetização;
- telefone e identidade verificados;
- comentários livres em avaliações.

## Continuidade e compatibilidade — 7 de outubro de 2026

- Busca por nome e filtro de não lidas em Primeiro contato e Conversas aplicados automaticamente, sem botão de confirmação. Listas paginadas por data de criação e ID em lotes de 30, sem limite total de 100; o histórico de mensagens tem paginação própria.
- Atualizações da conversa preservam mensagens antigas carregadas e recebem novas mensagens por cursor, sem duplicatas.
- Conversas e avaliações existentes não são apagadas nem recebem notas fabricadas. Se faltar primeira impressão válida de algum participante, a conversa aguarda esse pré-requisito para novas mensagens/avaliações de interação; leitura e encerramento permanecem disponíveis.
- Preferências antigas de desinteresse não tinham data: a migração preserva cada uma durante sete dias a partir da aplicação. Novas escolhas contam sete dias a partir do clique.

## Conta e acesso — decisões confirmadas em 7 de outubro de 2026

- Manter a sessão entre visitas e abrir diretamente o Feed após login, confirmação e retorno ao aplicativo. Cookies persistentes de 30 dias, renovados durante o uso; sair encerra a sessão local. Perfil incompleto continua com orientação para completar os campos.
- Login por e-mail ou nome de usuário único, diferente do nome exibido. Novos cadastros escolhem usuário; contas existentes podem defini-lo em Minha conta. Usuário: 3–24 caracteres, começando por letra, com letras sem acento, números e underscore, sem distinção de maiúsculas/minúsculas.
- Reenvio de confirmação e recuperação de senha disponíveis na entrada. Confirmação por link ou código recebido por e-mail, inclusive em outro navegador. Não dispensar a verificação de e-mail para contornar falhas de entrega.
- Confirmar a senha ao cadastrar; troca de senha com senha atual em Minha conta e recuperação por e-mail quando esquecida.
- **Exclusão definitiva aprovada pelo responsável:** remover conta, fotos, conversas associadas, mensagens, avaliações e registros associados ao conteúdo removido. A interface exige senha atual e a frase EXCLUIR MINHA CONTA, explicando que outras pessoas também perderão o histórico compartilhado. Não desativar apenas nem fabricar anonimização em substituição à decisão.
- Lista de bloqueados com desbloqueio. Desbloquear remove somente o bloqueio de quem executou a ação; um bloqueio da outra pessoa continua valendo. Não reabrir conversas encerradas automaticamente.

## Mensagens e filtros — decisões confirmadas em 7 de outubro de 2026

- Conversas é a primeira aba ao abrir Mensagens.
- Cada aba e conversa/contato apresenta contador de não lidas, além do indicador geral em Mensagens. A leitura é privada ao destinatário; não foi definido recibo de leitura visível ao remetente.
- Abrir a conversa com a aba visível marca como lidas apenas notificações até o ponto de leitura retornado pelo servidor. Mensagens chegadas depois continuam novas. Contatos podem ser marcados como lidos sem abrir o texto.
- Atualização por eventos Realtime privados e consulta periódica de recuperação. Eventos carregam apenas um contador, sem texto de mensagem nem e-mail.
- Os filtros do Feed ficam em página separada, com Aplicar, Cancelar e restauração do padrão. Ao aplicar, o servidor carrega outra seleção antes de exibir os resultados. Os filtros de Mensagens respondem automaticamente à digitação e à chegada de dados.
