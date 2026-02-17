# ChatFlow – Mensagens com botões clicáveis (JSON para o frontend)

O backend aceita interações do tipo `MessageOptionsField` com um array `values` de **até 3 opções**. Essas opções são enviadas como **botões clicáveis** no WhatsApp (Baileys). Se o dispositivo não suportar botões, o sistema envia automaticamente a mesma mensagem em formato de **lista numerada** (fallback).

## Regras de negócio

- **Máximo de 3 botões** por mensagem (limite do WhatsApp para botões diretos).
- Mensagens de **texto simples** (`MessageField`) continuam iguais.
- O **ticketId** e **contactId** são preservados: a resposta do botão cai na mesma conversa e é tratada pelo fluxo (Condições com "Respostas").

## Exemplo de JSON para criar/atualizar um fluxo com pergunta e botões

Payload enviado pelo frontend (ex.: `POST /chat-flow` ou `PUT /chat-flow/:id`):

```json
{
  "name": "Fluxo com botões",
  "isActive": true,
  "flow": {
    "name": "Fluxo com botões",
    "lineList": [
      {
        "from": "node_start_id",
        "to": "node_pergunta_id",
        "connector": "...",
        "paintStyle": {}
      },
      {
        "from": "node_pergunta_id",
        "to": "node_proximo_id",
        "connector": "...",
        "paintStyle": {}
      }
    ],
    "nodeList": [
      {
        "id": "node_start_id",
        "name": "Início",
        "type": "start",
        "left": "100px",
        "top": "40px"
      },
      {
        "id": "node_pergunta_id",
        "nodeId": "node_pergunta_id",
        "name": "Escolha uma opção",
        "type": "node",
        "left": "300px",
        "top": "40px",
        "interactions": [
          {
            "id": "interaction_1",
            "type": "MessageOptionsField",
            "data": {
              "message": "Olá! Como podemos ajudar?",
              "values": ["Falar com atendente", "Ver horário", "Encerrar"]
            }
          }
        ],
        "conditions": [
          {
            "id": "cond_1",
            "type": "R",
            "condition": ["Falar com atendente", "Ver horário", "Encerrar"],
            "action": 0,
            "nextStepId": "node_proximo_id"
          }
        ]
      },
      {
        "id": "node_proximo_id",
        "name": "Próxima etapa",
        "type": "node",
        "left": "500px",
        "top": "40px",
        "interactions": [
          {
            "id": "interaction_2",
            "type": "MessageField",
            "data": { "message": "Obrigado pela escolha." }
          }
        ],
        "conditions": []
      }
    ]
  }
}
```

## Estrutura da interação com botões

Dentro de `nodeList[].interactions[]`, para **botões clicáveis** use:

| Campo   | Tipo     | Obrigatório | Descrição |
|--------|----------|-------------|-----------|
| `type` | string   | Sim         | `"MessageOptionsField"` |
| `id`   | string   | Sim         | ID único da interação (ex.: UUID) |
| `data` | object   | Sim         | Ver abaixo |

### `data` (MessageOptionsField)

| Campo     | Tipo     | Obrigatório | Descrição |
|----------|----------|-------------|-----------|
| `message`| string   | Sim         | Texto exibido acima dos botões |
| `values` | string[] | Sim         | **Até 3** opções. Cada string vira um botão (texto do botão). |

- O backend gera internamente `buttonId` (ex.: `opt_0`, `opt_1`, `opt_2`) e envia no formato Baileys:  
  `{ buttonId, buttonText: { displayText }, type: 1 }`.
- Quando o usuário **clica** no botão, o WhatsApp envia `selectedButtonId` / `selectedDisplayText`. O adapter define `body` da mensagem recebida como o **texto do botão** (ou o id), para que as **Condições** com "Respostas" continuem funcionando (basta incluir os mesmos textos em `condition`).

## Validação no backend

- Se alguma etapa tiver `type === "MessageOptionsField"` e `data.values` com **mais de 3 itens**, a API retorna **400** com mensagem:  
  `ChatFlow: mensagem com botões permite no máximo 3 opções. Etapa "..." tem N.`

## Compatibilidade

- **Mensagens só texto**: `type: "MessageField"`, `data: { message: "..." }` — sem alteração.
- **Fallback**: Se o envio de botões falhar (dispositivo/canal não suportar), o backend reenvia a mesma mensagem em **texto + lista numerada** (1. Opção A, 2. Opção B, 3. Opção C), mantendo `ticketId` e `contactId` no fluxo.
