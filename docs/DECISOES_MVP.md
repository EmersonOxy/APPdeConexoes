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
- “Passar” não registra exclusão e a pessoa pode retornar.
- “Não tenho interesse” remove o perfil somente do Feed de quem escolheu essa ação. O usuário pode reverter a escolha na tela de preferências.

## Primeiro contato e conversa

- O primeiro contato exige primeira impressão já enviada.
- Ele é exclusivamente texto, com 1 a 500 caracteres, sem links ativos, mídia ou anexos no MVP.
- Há um único primeiro contato pendente por par de pessoas.
- Ele expira depois de 30 dias sem resposta.
- O destinatário pode aceitar ou recusar sem abrir o conteúdo. A aceitação cria uma conversa; a recusa não cria conversa.
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
