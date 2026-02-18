# Agenda de aniversariantes (futuro)

Este documento descreve o uso do campo **Data de aniversário** do contato e a base para a futura tela de agenda e automação de parabéns.

## Campo fixo no contato

- **Onde:** Tela **Contatos** → Editar/Adicionar contato → seção **Dados Contato**.
- **Campo:** **Data de aniversário** (campo fixo, não é "informação adicional").
- **Banco:** Tabela `Contacts`, coluna `birthDate` (tipo DATEONLY, formato YYYY-MM-DD).
- **ChatFlow:** No fluxo de pré-cadastro, uma etapa **"Aguardar Entrada de Dados"** com **Campo alvo = Data de Nascimento** grava direto em `contact.birthDate`. Assim, quando o contato informa a data no chat, ela já fica salva no mesmo campo que aparece na tela de contato.

## Por que um campo fixo

- Permite **uma única fonte de verdade** para aniversário (tela de contato + ChatFlow + futura agenda).
- Facilita **listar aniversariantes do dia/mês** e **automações** (mensagem ou card de parabéns) sem depender de informações adicionais com nomes variados.

## Próximos passos (quando for implementar)

1. **Tela de agenda geral**
   - Listar contatos cujo `birthDate` (ignorando ano) coincide com:
     - **Hoje** (aniversariantes do dia).
     - **Mês atual** (aniversariantes do mês), opcionalmente filtro por dia.
   - Backend: endpoint ou serviço que consulta `Contacts` com `WHERE` em `birthDate` (extrair mês/dia ou usar função do banco, ex.: `EXTRACT(MONTH FROM "birthDate")`, `EXTRACT(DAY FROM "birthDate")`).

2. **Automação de parabéns**
   - Job agendado (ex.: todo dia às 08:00) que:
     - Busca contatos com aniversário no dia (mesmo dia e mês de `birthDate`).
     - Para cada um, dispara mensagem e/ou card de parabéns pelo canal configurado (WhatsApp, etc.).
   - Pode usar a mesma base de envio de mensagens já existente (ticket, fila, etc.).

3. **Contatos sem data**
   - Se no pré-cadastro a data não foi coletada (ex.: contato saiu antes da etapa ou deu erro), o campo fica vazio. O usuário pode:
     - Preencher manualmente na tela **Editar Contato** → **Data de aniversário**.
     - Ou rodar novamente um fluxo que pergunte a data (a etapa só pergunta se `birthDate` estiver vazio).

## Referências no código

- **Modelo:** `backend/src/models/Contact.ts` → `birthDate`.
- **Migration:** `backend/src/database/migrations/20260215120000-add-birthDate-to-contacts.ts`.
- **ChatFlow (gravar):** `backend/src/services/ChatFlowServices/VerifyStepsChatFlowTicket.ts` → etapa com `targetField === "birthDate"` e `contactData: { birthDate: value }`.
- **Tela de contato:** `frontend/src/pages/contatos/ContatoModal.vue` → campo "Data de aniversário" (input tipo date).
- **API:** `ContactController` (store/update) e `UpdateContactService` / `CreateContactService` aceitam e persistem `birthDate`.
