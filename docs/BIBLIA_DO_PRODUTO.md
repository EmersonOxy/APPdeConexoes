# Bíblia do Produto — App de Conexões

A identidade visual oficial está em [Identidade visual Duoeto](IDENTIDADE_VISUAL.md): Comfortaa 600 na marca, Geist Sans na interface e paleta azul/amarelo/verde pastel aprovada pelo responsável. Essa definição substitui as cores e fontes provisórias da primeira interface.

As escolhas posteriores para o primeiro corte estão registradas em [Decisões do MVP](DECISOES_MVP.md). Em caso de divergência de escopo, consulte esse documento, que registra as escolhas operacionais feitas na etapa de implementação autorizada pelo responsável pelo projeto.

**Versão:** 0.1  
**Situação:** base de produto consolidada a partir da conversa de descoberta  
**Data:** 6 de outubro de 2026

## 1. Finalidade

Esta é a referência de produto antes de desenhar telas ou escrever código. Ela registra o que já foi decidido, o que é apenas uma proposta detalhada e o que ainda precisa de decisão explícita.

Uma lacuna não deve ser preenchida por suposição durante o desenvolvimento. O foco aqui é produto: experiência, regras e limites. Arquitetura, banco de dados, permissões e interface devem nascer desta referência, mas são documentos próprios.

## 2. Estado atual do projeto

- O repositório público EmersonOxy/APPdeConexoes foi consultado em 6 de outubro de 2026 e está vazio: não há código, arquivos, documentação, esquema ou estrutura existente a preservar.
- O responsável pelo projeto informou que já possui um projeto Supabase e que a Vercel está conectada ao GitHub.
- A primeira fase será um produto web. A combinação discutida foi Next.js na aplicação, Supabase para banco de dados, autenticação e arquivos, Vercel para publicação e GitHub para o código. Isso é contexto técnico, não especificação de implementação.

## 3. Como ler os status

| Status | Significado |
| --- | --- |
| **Decidido** | Regra ou direção confirmada na conversa de produto. Deve ser respeitada. |
| **Provisório** | Proposta detalhada e coerente com a conversa, mas ajustável antes de virar regra de desenvolvimento. |
| **Em aberto** | Tema sem decisão. Não deve ser inventado como se estivesse fechado. |
| **Futuro** | Ideia fora do escopo inicial. Não entra no MVP sem nova decisão. |

Quando uma seção mistura status, cada item informa o seu próprio estado.

## 4. Visão do produto

### 4.1 O que é

**Decidido.** O App de Conexões é um espaço para conhecer pessoas para namoro, amizade e outros tipos de conexão definidos pelo próprio usuário. Ele não é um Tinder tradicional e não depende de um sistema de match para permitir o primeiro contato.

O diferencial é um ciclo de descoberta e reputação:

> conhecer um perfil → avaliar a primeira impressão → enviar um único primeiro contato → conversar, se houver resposta → avaliar a experiência de interação.

O objetivo não é transformar pessoas em uma disputa de popularidade. A reputação deve oferecer contexto, incentivar respeito e dar mais segurança para iniciar uma conversa.

### 4.2 O problema que o produto tenta resolver

**Decidido.** Aplicativos de relacionamento normalmente pedem decisões rápidas e pouco informadas. Este produto acrescenta duas camadas:

- a pessoa declara o que busca e apresenta sua personalidade;
- a comunidade fornece avaliações estruturadas, com regras transparentes e privacidade escolhida por quem avalia.

### 4.3 O que o MVP deve provar

**Decidido.** Antes de investir em aplicativo nativo ou recursos avançados, o MVP deve validar se as pessoas percebem valor e segurança na mecânica:

> perfil → Feed → avaliação → primeiro contato → conversa → avaliação de interação.

## 5. Princípios inegociáveis

1. **Conexão antes de mecânica de jogo.** **Decidido.** O produto não deve premiar volume de avaliações, mensagens ou popularidade.
2. **Sem match obrigatório.** **Decidido.** Avaliar é o requisito para iniciar contato; a resposta ao primeiro contato é o que cria uma conversa.
3. **Reputação compreensível.** **Decidido.** As fórmulas usam médias simples e não possuem pesos ocultos.
4. **O usuário controla sua intenção.** **Decidido.** Cada pessoa define o que procura; o produto não pressupõe que todo uso seja namoro.
5. **Perfil sem interrogatório.** **Decidido.** Informações essenciais são obrigatórias; personalidade e detalhes adicionais são opcionais.
6. **Dignidade na reputação.** **Decidido.** Não haverá badges negativos ou humilhantes.
7. **Privacidade por escolha.** **Decidido.** Quem avalia escolhe como sua avaliação aparece, sem deixar de contribuir para a nota agregada.
8. **Segurança e moderação são parte do produto.** **Decidido.** Bloqueio, denúncia, proteção de localização e prevenção de abuso não são extras.
9. **MVP concentrado.** **Decidido.** O primeiro produto deve provar o ciclo central antes de adicionar uma camada social, monetização ou algoritmos complexos.

## 6. Navegação principal

### 6.1 Estrutura

**Decidido.** A navegação principal possui três áreas:

| Área | Finalidade |
| --- | --- |
| **Feed** | Descoberta de perfis, avaliação e início de contato. |
| **Mensagens** | Caixa de primeiro contato e conversas já aceitas. |
| **Perfil** | Visualização e edição do próprio perfil, reputação, badges e privacidade. |

Dentro de **Mensagens**, há duas divisões:

- **Primeiro contato:** mensagens únicas ainda não respondidas;
- **Conversas:** interações iniciadas após a resposta do destinatário.

### 6.2 Navegação complementar

**Provisório.** O Perfil concentra edição, pré-visualização pública, fotos, preferências e privacidade. A área de Mensagens deve permitir busca por nome e filtros próprios, mas seus filtros ainda não foram definidos.

## 7. Cadastro e ativação do perfil

### 7.1 Informações obrigatórias

**Decidido.** Para ativar um perfil, a pessoa informa:

- foto;
- nome;
- idade;
- cidade;
- estado.

### 7.2 Informações opcionais

**Decidido.** O perfil pode conter:

- texto livre de apresentação;
- interesses;
- o que a pessoa procura;
- informações adicionais que ela escolher disponibilizar.

O produto terá um indicador de completude, atualizado quando informações e fotos são adicionadas. O indicador deve incentivar contexto, e não punir quem preserva a própria privacidade.

### 7.3 Edição do perfil

**Decidido.** Na edição, o usuário pode:

- adicionar, remover, reordenar e escolher a foto principal;
- alterar nome, idade, cidade e estado, sem deixar os obrigatórios vazios;
- editar “Sobre mim”, interesses, o que procura e campos adicionais;
- administrar as escolhas de privacidade aplicáveis ao perfil e às avaliações;
- usar “Ver como outras pessoas veem” para pré-visualizar seu perfil no contexto do Feed.

### 7.4 Em aberto antes de implementar

- idade mínima, critérios de elegibilidade e países ou regiões atendidos;
- quantidade mínima e máxima de fotos, formatos aceitos e moderação delas;
- lista fechada de objetivos e interesses;
- campos adicionais disponíveis e quais deles podem ser ocultados;
- se e como uma alteração de nome, idade ou localização precisa ser revisada;
- requisitos de verificação no cadastro.

## 8. Perfil público e badges

### 8.1 O que compõe o perfil

**Decidido.** O perfil reúne duas fontes de informação claramente separadas:

| Fonte | Conteúdo |
| --- | --- |
| **A pessoa diz sobre si** | Fotos, dados básicos, descrição, objetivos, interesses e informações adicionais escolhidas por ela. |
| **A comunidade diz sobre ela** | Reputação agregada, avaliações visíveis conforme a privacidade escolhida e badges gerados pelo sistema. |

O perfil também mostra badges de interesse escolhidos pelo usuário e pode indicar se o perfil está completo.

**Decidido em 7 de outubro de 2026.** O álbum permite até 6 fotos, incluindo a principal obrigatória, com até 3 MB por envio. O usuário pode trocar a principal e remover fotos complementares. A navegação entre fotos é lateral.

### 8.2 Badges

**Decidido.** Há dois grupos de badges:

- **Escolhidos pelo usuário:** interesses como jogos, filmes, música, academia, corrida, cozinhar, viajar, livros, gatos, cachorros e arte. A lista é exemplificativa, não final.
- **Gerados pelo sistema:** reconhecimentos positivos derivados da experiência, como “Ótimo de conversa”, “Muito respeitado” e “Muito engraçado”.

**Em aberto.** Os limiares, a redação final, a quantidade máxima exibida e a forma de calcular cada badge automático precisam ser definidos. Nenhum badge negativo será criado.

## 9. Feed de descoberta

### 9.1 Experiência de uso

**Decidido.** O Feed combina apresentação de perfis ao estilo Tinder com navegação vertical ao estilo TikTok, mostrando uma pessoa por vez:

- fotos do mesmo perfil são navegáveis lateralmente;
- deslizar para cima apresenta a próxima pessoa;
- deslizar para baixo permite voltar na sequência recente;
- no computador, as setas ↑ e ↓ navegam entre pessoas; avançar não registra rejeição nem exige avaliação;
- as informações do perfil aparecem progressivamente;
- o usuário pode avaliar, iniciar o primeiro contato ou executar ações sobre aquele perfil.

### 9.2 Nota escondida até a própria avaliação

**Decidido.** No Feed, a reputação da pessoa fica escondida até que o visitante faça sua própria avaliação de primeira impressão. A regra evita que uma nota existente induza artificialmente a avaliação de quem acabou de chegar.

### 9.3 Regras de seleção do Feed

**Provisório.** A proposta atual é uma ordem aleatória dentro do conjunto de perfis que atende aos filtros, e não um algoritmo de compatibilidade ou uma IA de afinidade. A seleção deve respeitar bloqueios, exclusões e contatos já iniciados.

Também são propostas, ainda sujeitas à confirmação:

- não repetir a mesma pessoa em sequência;
- só reintroduzir um perfil depois de uma quantidade razoável de outros perfis;
- permitir que um perfil já avaliado reapareça, mostrando “Avaliado” e a nota já dada, sem pedir nova primeira avaliação;
- remover do Feed perfis para os quais já foi enviado primeiro contato ou que já estejam em conversa;
- afastar temporariamente do Feed quem recusou um primeiro contato; o intervalo sugerido foi sete dias, mas não está decidido;
- mostrar o badge “Novo” sem priorizar artificialmente pessoas recém-cadastradas;
- ao esgotar os perfis válidos, mostrar opções de ajustar filtros, ampliar distância, ampliar faixa etária ou voltar mais tarde.

### 9.4 Ações no Feed

| Ação | Regra atual | Status |
| --- | --- | --- |
| **Navegar para a próxima pessoa** | Deslize ou setas. Não existe botão “Passar”; não registra rejeição. | Decidido |
| **Não tenho interesse** | Oculta aquela pessoa somente do Feed daquele usuário por 7 dias, sem bloquear contato, denunciar ou afetar a reputação. Após o prazo, volta a ser elegível. | Decidido |
| **Avaliar** | Registra a primeira impressão e revela a reputação no Feed para quem avaliou. | Decidido |
| **Enviar primeiro contato** | Só fica disponível após a avaliação de primeira impressão. | Decidido |
| **Bloquear** | Impede contato entre as duas pessoas. | Decidido |
| **Denunciar** | Encaminha o caso para moderação. | Decidido |

**Decidido no MVP.** A preferência pode ser restaurada antes do prazo e só afeta o Feed; perfil, fotos, contato e avaliações permanecem disponíveis. O histórico recente guarda até 50 perfis por visita e verifica novamente a elegibilidade. Histórico persistente e ilimitado fica para evolução futura.

## 10. Filtros

### 10.1 Critérios previstos

**Decidido.** O Feed deve permitir filtrar por:

- gênero;
- idade;
- distância;
- o que a pessoa procura;
- interesses;
- reputação mínima;
- badges;
- perfil completo.

### 10.2 Padrão inicial sugerido

**Provisório.** A referência discutida para o primeiro acesso foi:

> 18–50 anos · até 30 km · qualquer gênero · “Ainda pensando”

Esse conjunto é um ponto de partida de interface, não uma configuração final. O significado de “Ainda pensando”, a ordem dos filtros e os valores padrão precisam de confirmação.

### 10.3 Em aberto antes de implementar

- filtros obrigatórios, opcionais e seus valores permitidos;
- como perfis sem reputação ou com poucas avaliações respondem a uma reputação mínima;
- se filtros muito restritivos exibem explicações ou sugestões;
- como distância e localização aproximada são calculadas sem expor uma posição precisa;
- filtros e organização específicos da área de Mensagens.

## 11. Reputação e avaliações

### 11.1 Papel da reputação

**Decidido.** A reputação é informativa, transparente e baseada em experiência; não é um ranking de pessoas. Ela não possui pesos secretos nem deve gerar humilhação pública.

Há dois momentos de avaliação:

| Momento | Componentes | Gatilho |
| --- | --- | --- |
| **Primeira impressão** | Nota de 1 a 5 estrelas. | Ao conhecer o perfil no Feed; é obrigatória antes do primeiro contato. |
| **Interação** | Fotos, conversa, respeito e humor. | Exige primeiras impressões dos dois participantes e ao menos cinco mensagens de cada um na conversa. |

### 11.2 Regras de avaliação

**Decidido.**

- A avaliação de primeira impressão é uma por pessoa para cada perfil.
- A reputação exibida no Feed fica escondida até a primeira avaliação de quem visita o perfil.
- Os primeiros **15 votos** de primeira impressão estabelecem a reputação inicial.
- Há uma avaliação por pessoa em cada índice de interação.
- A reavaliação de interação pode ocorrer após **sete dias**.
- Se uma conversa for encerrada antes desse prazo, a avaliação de interação pode ser feita antes do encerramento.
- O marco de **35 avaliações de interação** representa histórico consolidado, sem alterar as fórmulas por isso.

### 11.3 Fórmulas conhecidas

**Decidido.** As fórmulas discutidas são aritméticas e visíveis:

    Percepção inicial = (Primeira impressão + Fotos) / 2

    Experiência = (Conversa + Respeito + Humor) / 3

    Nota geral = (Percepção inicial + Experiência) / 2

Para cada componente, a nota da pessoa é a média das avaliações válidas recebidas naquele componente. Não há pesos ocultos.

### 11.4 Pontos de cálculo que ainda exigem decisão

**Em aberto.** A fórmula está definida, mas as regras para dados ausentes ainda não estão. Antes de programar, é necessário decidir:

- como exibir e calcular a reputação enquanto só existem avaliações de primeira impressão, sem avaliação de fotos ou de experiência;
- se as quatro avaliações de interação usam explicitamente a mesma escala de 1 a 5 e como são apresentadas;
- se a reavaliação após sete dias substitui a nota anterior, cria histórico, ou ambas as coisas;
- se avaliações dadas depois das primeiras 15 continuam atualizando a reputação inicial e como isso ocorre;
- se o marco de 35 avaliações gera apenas uma informação de confiança ou também altera alguma visualização;
- regra de arredondamento, quantidade mínima de avaliações exibidas e tratamento de notas extremas;
- definição de mensagem válida para a contagem de cinco por pessoa, incluindo mídia, mensagem apagada, spam e mensagens de sistema;
- se existe texto livre em uma avaliação e como ele é moderado.

Nenhuma dessas lacunas deve ser resolvida silenciosamente por uma fórmula inteligente ou por critérios ocultos.

### 11.5 Prevenção de manipulação

**Decidido no princípio.** A estrutura já limita manipulação ao exigir contexto de interação, limitar avaliações por pessoa e tornar os cálculos claros.

**Em aberto.** Regras operacionais para detectar contas coordenadas, spam, avaliações abusivas, fraude e revisão de avaliações suspeitas ainda precisam ser desenhadas. Elas pertencem à política de segurança e moderação, não à nota pública automática.

## 12. Privacidade das avaliações

### 12.1 Escolha de visibilidade

**Decidido.** Ao publicar uma avaliação, o autor escolhe uma destas formas de visibilidade:

| Opção | Como aparece |
| --- | --- |
| **Pública + mostrar perfil** | A avaliação é pública e vinculada ao perfil de quem avaliou. |
| **Pública + mostrar somente nome** | A avaliação é pública, mas mostra somente o nome de quem avaliou. |
| **Privada/anônima** | A avaliação contribui para a reputação, sem identificar publicamente quem avaliou. |

Independentemente da escolha, a avaliação entra na reputação agregada.

### 12.2 Em aberto

- se a escolha de privacidade pode ser alterada ou a avaliação pode ser apagada depois de publicada;
- por quanto tempo avaliações privadas, dados de auditoria e histórico de reavaliações são retidos;
- quem na moderação pode ver a autoria de uma avaliação anônima e em que circunstâncias;
- se há comentários públicos e, se houver, quais regras de revisão se aplicam.

## 13. Primeiro contato

### 13.1 Regra central

**Decidido.** Não existe match prévio. Para enviar primeiro contato, a pessoa deve primeiro fazer uma avaliação de primeira impressão.

### 13.2 Fluxo

**Decidido.**

1. A pessoa avalia o perfil no Feed.
2. Ela pode enviar **uma única mensagem** de primeiro contato.
3. Essa mensagem pode ser editada durante uma hora e excluída durante uma hora.
4. O destinatário pode recusar sem abrir a mensagem.
5. Para aceitar e iniciar a conversa, o destinatário também deve avaliar a primeira impressão do remetente. O aceite cria a conversa; ambas as avaliações devem existir antes da interação.

Enquanto não houver resposta, o primeiro contato não é uma conversa e não autoriza novas mensagens naquele canal.

### 13.3 Em aberto

- formatos permitidos no primeiro contato: somente texto ou também mídia;
- prazo para responder e comportamento depois de expirar;
- o que o remetente vê ao ser recusado, excluído ou bloqueado;
- limites contra spam, inclusive quantidade de primeiros contatos por período;
- se é possível iniciar novo contato depois de uma recusa e em quais condições.

## 14. Mensagens e conversas

### 14.1 Conversa aceita

**Decidido.** O aceite do primeiro contato cria uma conversa entre as duas pessoas, depois de ambas registrarem a primeira impressão. Encerrar uma conversa é diferente de bloquear e denunciar: encerra aquela interação sem acusar automaticamente a outra pessoa de violação.

### 14.2 Experiência prevista

**Provisório.** A conversa deve se aproximar da familiaridade de aplicativos como WhatsApp ou Instagram. Foram propostos:

- mensagens de texto;
- fotos, vídeos, áudios e GIFs;
- resposta a uma mensagem específica;
- exclusão de mensagens;
- acesso ao perfil da outra pessoa;
- bloqueio, denúncia e encerramento da conversa.

Esses itens são a direção desejada, mas o recorte de mídia e os detalhes de cada recurso precisam ser priorizados antes de entrarem no MVP.

### 14.3 Organização

**Decidido.** Mensagens abre na aba Conversas e separa primeiros contatos. Busca por nome e filtro de não lidas atualizam sem confirmação manual. As abas e os itens mostram contadores de não lidas, com atualização em tempo real e recuperação periódica. As listas têm paginação. Os filtros do Feed são editados em uma tela separada, com aplicação explícita.

### 14.4 Em aberto

- confirmação de leitura, status de entrega, indicadores de digitação e presença online;
- regras de edição e exclusão de mensagens em uma conversa;
- limites de arquivos, duração de áudio e vídeo, formatos e retenção de mídia;
- exportação, exclusão e recuperação de conversa;
- comportamento após encerrar uma conversa e condições para retomá-la;
- ordem das conversas, busca e filtros finais.

## 15. Bloqueio, denúncia, segurança e moderação

### 15.1 Bloqueio

**Decidido.** Bloquear significa que não haverá contato entre as duas pessoas. Quem bloqueou e quem foi bloqueado não devem se encontrar em Feed, busca ou Mensagens.

**Decidido no MVP.** Bloquear encerra conversas ativas sem notificar a pessoa bloqueada. A lista de bloqueados permite desfazer somente o próprio bloqueio, sem reabrir conversas encerradas; o bloqueio da outra pessoa continua valendo. Avaliações e novos contatos seguem as regras em DECISOES_MVP.md. Prevenção de contatos indiretos permanece pendente.

### 15.2 Denúncia

**Decidido.** Denunciar encaminha um caso à moderação e é diferente de “Não tenho interesse”, encerrar conversa ou bloquear.

**Em aberto.** Ainda precisam ser definidos motivos de denúncia, evidências anexáveis, prioridade, tempos de análise, comunicação de resultado, recurso, suspensão, banimento e reversão de decisões.

### 15.3 Privacidade de localização e dados

**Decidido.** O produto pode usar distância, mas não deve expor endereço nem coordenada precisa. Para o perfil, a apresentação é cidade e estado; qualquer localização usada para o cálculo de distância deve ser aproximada e inacessível a outras pessoas.

**Em aberto.** Precisão da localização, consentimento, atualização, retenção, download e exclusão de dados, além da política de privacidade, devem ser definidos antes de abrir o produto a usuários reais.

### 15.4 Verificação e moderação operacional

**Em aberto.** E-mail confirmado, telefone confirmado, verificação de identidade, painel administrativo, revisão de fotos e mensagens denunciadas, recuperação de conta e política anti-contas falsas foram discutidos como direções importantes, mas não estão fechados como requisitos do MVP.

## 16. Notificações

**Decidido.** O produto precisa ter notificações como parte da experiência do MVP.

**Em aberto.** Não foram definidos os canais — dentro do produto, push ou e-mail —, permissões, frequência, preferências do usuário nem eventos exatos. Antes de implementar, deve-se especificar pelo menos o tratamento de:

- recebimento, recusa e resposta de primeiro contato;
- nova mensagem em conversa;
- atualizações relevantes de moderação;
- mudanças que exijam ação do usuário, sem expor conteúdo sensível na tela bloqueada do dispositivo.

## 17. Escopo do MVP

### 17.1 Núcleo a validar

**Decidido.** O MVP precisa sustentar o fluxo completo:

    Cadastro → Perfil → Feed → Avaliação de primeira impressão
    → Primeiro contato → Conversa → Avaliação de interação

Também pertencem à base do produto bloqueio, denúncia, edição de perfil, privacidade de avaliações e notificações, ainda que seus detalhes operacionais estejam pendentes.

### 17.2 Critério de foco

**Decidido.** Todo item que não fortalece esse ciclo deve esperar. O objetivo do MVP não é parecer um produto final completo; é aprender se o mecanismo de conexões e reputação é desejado, seguro e compreensível.

## 18. Ideias explicitamente futuras

Os itens abaixo **não pertencem ao MVP** e não devem ser criados por antecipação:

- conexões entre usuários e elementos de rede social;
- plano pago ou monetização;
- histórico de retorno ilimitado no Feed;
- aplicativo nativo profissional para Android e iOS;
- verificação de identidade como selo;
- Feed personalizado por comportamento e afinidade;
- recursos sociais adicionais e funcionalidades de comunidade;
- chamadas de áudio e vídeo.

Essas ideias podem ser reavaliadas depois que o fluxo central estiver validado. Nenhuma é compromisso de produto ou cronograma.

## 19. Decisões prioritárias antes de desenvolver

Para evitar que código substitua decisões de produto, estas são as pendências mais importantes:

1. Fechar o cálculo quando há poucas ou nenhuma avaliação e definir o efeito prático dos marcos de 15 e 35 avaliações.
2. Definir escalas, reavaliações e auditoria das avaliações de interação.
3. Fechar opções de filtro, seus padrões e como distância e localização aproximada funcionam.
4. Especificar política de denúncia, bloqueio, moderação, punição, recurso e recuperação de conta.
5. Definir verificação mínima, critérios de idade, consentimentos e privacidade de dados.
6. Priorizar o conjunto real de mensagens e mídia que cabe no MVP.
7. Definir eventos, canais e preferências de notificações.
8. Decidir regras do Feed ainda provisórias, especialmente repetição, recusa, retorno e histórico.

## 20. Regra de governança do produto

Qualquer nova funcionalidade deve responder a três perguntas antes de entrar no produto:

1. Ela fortalece o ciclo principal de conhecer, avaliar e conversar com segurança?
2. Ela respeita a privacidade, a dignidade e a transparência da reputação?
3. Ela está decidida aqui ou precisa ser classificada explicitamente como provisória, em aberto ou futura?

Se a resposta à terceira pergunta for “precisa ser decidida”, ela não deve ser apresentada ao usuário como funcionalidade pronta nem implementada por suposição.

## Atualização de funcionalidades — 7 de outubro de 2026

Conforme confirmação do responsável, a etapa atual prioriza funcionalidades; o acabamento visual fica para depois. Acesso persistente com entrada direta no Feed, login por usuário/e-mail, reenvio de confirmação por link, recuperação/troca de senha, desbloqueio e paginação são requisitos atuais. A exclusão de conta é definitiva, incluindo conversas e avaliações associadas, com confirmação explícita na interface. Os detalhes e limites operacionais estão em [Decisões do MVP](DECISOES_MVP.md) e [Autenticação](AUTENTICACAO.md).

A busca nas conversas e primeiros contatos aceita também nome de usuário, com ou sem `@`. Os e-mails atuais confirmam por link; código numérico depende de modelo personalizado e não é solicitado na interface.

## Atualização — gênero e distância, 8 de outubro de 2026

Implementação autorizada pelo responsável: gênero opcional no perfil e filtro pelo gênero declarado; distância máxima aproximada opcional, com autorização antes de solicitar localização. Sem localização ou sem raio, o Feed continua disponível. Coordenadas exatas não são enviadas pelo aplicativo e posições aproximadas não são expostas a outros usuários. Atualização manual e remoção disponíveis. As opções, precisão, retenção e regras atuais estão em `DECISOES_MVP.md`; estas regras substituem as perguntas históricas de gênero/distância ainda abertas acima. Badges e moderação operacional continuam pendentes.
