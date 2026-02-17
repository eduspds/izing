# Como testar os botões do ChatFlow

## Pré-requisitos

- Backend rodando (ex.: `npm run dev:server` no `backend`).
- Frontend rodando (ex.: `npm run dev` no `frontend`).
- Uma conexão WhatsApp ativa (sessão conectada no sistema).
- Usuário admin para acessar fluxos e configurações.

---

## 1. Criar um fluxo com botões no frontend

1. Acesse o frontend (ex.: `http://localhost:8080`).
2. Vá em **ChatFlow** (menu) e abra o **construtor** de um fluxo existente ou crie um novo.
3. No canvas, selecione a etapa após o **Início** (ou crie uma nova etapa).
4. No painel à direita (**Configuração Fluxo**):
   - **Nome**: ex. `Escolha uma opção`.
   - Na aba **Interações**, clique no botão **"Enviar Mensagem (Botões | Listas)"** (ícone de lista).
   - Preencha:
     - **Mensagem**: ex. `Como podemos ajudar?`
     - **Opções**: adicione até **3** opções (ex.: `Falar com atendente`, `Ver horário`, `Encerrar`).
5. Abra a aba **Condições**:
   - Clique em **Nova condição**.
   - **Se**: "Respostas".
   - **Respostas**: use os **mesmos textos** das opções (ex.: `Falar com atendente`, `Ver horário`, `Encerrar`) ou números `1`, `2`, `3`.
   - **Rotear para**: Etapa → escolha a próxima etapa (ou crie uma e conecte).
6. Clique em **SALVAR** no topo do painel.

---

## 2. Vincular o fluxo ao canal (WhatsApp)

1. Vá em **Configurações** (ou no cadastro da **Conexão WhatsApp**).
2. Em **ChatFlow** (ou “Fluxo do bot”), selecione o fluxo que você acabou de salvar.
3. Salve a configuração.

Assim, quando um contato mandar mensagem nessa conexão, o bot usará esse fluxo e enviará a etapa com botões.

---

## 3. Testar no WhatsApp

1. No seu celular, envie uma mensagem para o número conectado ao sistema (ou use o número de teste do fluxo, se configurado).
2. O bot deve:
   - Enviar a mensagem de boas-vindas (etapa inicial).
   - Em seguida enviar a pergunta **com os botões clicáveis** (ex.: “Como podemos ajudar?” com 3 botões).
3. **Clique em um dos botões** no WhatsApp.
4. O sistema deve:
   - Registrar a resposta na mesma conversa (ticket).
   - Avançar para a próxima etapa configurada nas Condições.

**Se os botões não aparecerem** (alguns clientes/versões não suportam): o bot envia a mesma pergunta em **texto + lista numerada** (1. …, 2. …, 3. …). Digite o número ou o texto da opção; o fluxo deve avançar do mesmo jeito.

---

## 4. Testar a validação (máximo 3 botões)

1. No construtor, na mesma etapa com “Botões | Listas”, adicione **4 ou mais opções**.
2. Clique em **SALVAR**.
3. O backend deve retornar **erro 400** com mensagem do tipo:  
   `ChatFlow: mensagem com botões permite no máximo 3 opções. Etapa "..." tem N.`
4. Remova opções até ficar com no máximo 3 e salve de novo.

---

## 5. Testar via API (opcional)

Se quiser testar o payload direto na API:

```bash
# Obter o token de autenticação (login no front e pegar do localStorage ou da aba Network)
# Substitua TOKEN e ajuste o JSON conforme seu fluxo

curl -X POST http://localhost:3001/chat-flow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Teste Botões",
    "isActive": true,
    "flow": {
      "name": "Teste Botões",
      "lineList": [],
      "nodeList": [
        {
          "id": "start_1",
          "name": "Início",
          "type": "start",
          "left": "100px",
          "top": "40px"
        },
        {
          "id": "node_1",
          "name": "Pergunta",
          "type": "node",
          "left": "300px",
          "top": "40px",
          "interactions": [
            {
              "id": "int_1",
              "type": "MessageOptionsField",
              "data": {
                "message": "Escolha:",
                "values": ["Opção A", "Opção B", "Opção C"]
              }
            }
          ],
          "conditions": [
            {
              "id": "c1",
              "type": "R",
              "condition": ["Opção A", "Opção B", "Opção C"],
              "action": 0,
              "nextStepId": null
            }
          ]
        }
      ]
    }
  }'
```

- **Sucesso**: retorno 200 com o fluxo criado.
- **Mais de 3 opções em `values`**: retorno 400 com a mensagem de validação.

---

## Resumo rápido

| Onde           | O que fazer |
|----------------|-------------|
| **Frontend**   | ChatFlow → Construtor → Etapa → Interações → “Botões \| Listas” → até 3 opções → Condições (Respostas + Rotear para) → SALVAR |
| **Configurações** | Vincular o fluxo ao canal WhatsApp |
| **WhatsApp**  | Enviar mensagem para o número → clicar no botão (ou digitar número/texto) → conferir próxima etapa |
| **Validação** | Tentar salvar com 4+ opções → deve dar erro 400 |

Se algo não funcionar, confira: backend e front no ar, WhatsApp conectado, fluxo ativo e selecionado nas configurações do canal.
