# ChatFlow: Entrada de Dados e Confirmação

## Regras Campo alvo × Tipo de validação

O frontend restringe as combinações para evitar erros:

| Campo alvo           | Tipo de validação permitido |
|----------------------|-----------------------------|
| **Nome**             | Apenas **Texto livre**      |
| **E-mail**           | Apenas **E-mail**           |
| **Data de Nascimento** | Apenas **Data (DD/MM ou DD/MM/AAAA)** |
| **Campo personalizado** | **Data**, **E-mail**, **Número** ou **Texto livre** (você informa a descrição) |

- **Nome** → sempre texto livre.
- **E-mail** → sempre validação de e-mail.
- **Data de Nascimento** → campo fixo do contato; validação apenas de data; uso futuro: calendário, aniversários, cartões/descontos.
- **Campo personalizado** → você digita a descrição (ex.: "Time do Coração") e escolhe o tipo; vai para **Informações adicionais**.

## Onde os dados são salvos

- **Campo alvo = Nome** → atualiza o **Nome** do contato (tela "Editar Contato" → Dados Contato).
- **Campo alvo = E-mail** → atualiza o **E-mail** do contato.
- **Campo alvo = Data de Nascimento** → atualiza o campo fixo **Data de nascimento** do contato (coluna `birthDate`). Permite uso posterior em calendário, aniversários, campanhas.
- **Campo alvo = Campo personalizado** → cria/atualiza uma linha em **Informações adicionais** do contato. Não sobrescreve nome, e-mail nem data de nascimento.

## Contato novo x existente (etapas “uma única vez”)

- **Contato novo** (apenas número, sem nome): o fluxo dispara a etapa que pergunta o **nome** e a que pergunta a **data de nascimento**; os dados são salvos e **não são perguntados de novo**.
- **Contato existente** (já tem nome e/ou data de nascimento): as etapas de **Nome** e **Data de nascimento** são **puladas** automaticamente e o fluxo segue para o próximo passo (sem repetir as perguntas).

Assim, nome e data de nascimento são usados “uma única vez” por contato: perguntados só quando faltam; depois disso o sistema não questiona de novo.

## Validações de segurança

Nas etapas **"Aguardar Entrada de Dados"** o backend aplica:

- **Limites de tamanho**
  - Nome: até 200 caracteres
  - E-mail: até 254 caracteres
  - Texto livre / campo personalizado: até 500 caracteres
- **Sanitização** em texto: trim e colapsar espaços múltiplos.
- **Validação por tipo**: data, e-mail, número ou texto livre (conforme configurado na etapa).

Se o valor for inválido ou ultrapassar o limite, o bot envia a mensagem de “não entendi” (configurada no fluxo) e o passo não avança.

## Fluxo com confirmação (ex.: nome)

1. **Etapa 1 – Entrada de dados**
   - Tipo: Aguardar Entrada de Dados  
   - Campo alvo: **Nome**  
   - Validação: **Texto livre**  
   - Condição: “Independe de resposta” → Próximo passo = Etapa 2  

2. **Etapa 2 – Confirmação**
   - Adicione uma **Mensagem com opções**  
   - Texto da mensagem: `Você confirma que seu nome é {{name}}?`  
   - Opções: **Sim** e **Não**  
   - Condições:
     - **Sim** → Próximo passo = Etapa 3 (ou a próxima etapa do fluxo)
     - **Não** → Próximo passo = Etapa 1 (volta para perguntar o nome de novo)

O placeholder **{{name}}** é substituído pelo nome que acabou de ser salvo no contato (valor digitado na Etapa 1). O backend recarrega o contato antes de enviar a mensagem da Etapa 2, então a confirmação sempre mostra o valor correto.

## Placeholders nas mensagens

Nas mensagens do fluxo (incluindo a de confirmação) você pode usar:

- **{{name}}** – Nome do contato (ou valor coletado na etapa de “nome”)
- **{{email}}** – E-mail do contato (ou valor coletado na etapa de “e-mail”)
- **{{greeting}}** – Saudação por horário (Bom dia! / Boa tarde! / Boa noite! / Olá!)
- **{{protocol}}** – Protocolo do ticket, se existir

Exemplos de texto de confirmação:

- `Você confirma que seu nome é {{name}}?`
- `O e-mail {{email}} está correto?`

## Resumo

- **Validações de segurança**: limites de caracteres e sanitização por tipo de campo.
- **Confirmação**: use uma etapa de “Mensagem com opções” logo após a etapa de entrada de dados, com o texto usando **{{name}}** (ou **{{email}}**) e opções **Sim** / **Não**; em “Não”, aponte o próximo passo de volta para a etapa que pergunta o dado de novo.
