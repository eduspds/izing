# Baileys: tratativa de DDD (outros estados) e DDI (outros países)

Este documento resume o que a documentação e o código-fonte da biblioteca **@whiskeysockets/baileys** definem sobre contatos com números de outros DDDs e outros DDIs, e como o BaseCognos aplica isso.

---

## 1. O que a documentação do Baileys diz

### 1.1 Formato do JID (ID do contato)

- **README oficial** ([Baileys README](https://github.com/WhiskeySockets/Baileys)):
  - O ID do contato (jid) deve estar no formato **`[código do país][número]@s.whatsapp.net`**.
  - Exemplo citado: **`+19999999999@s.whatsapp.net`** (na prática o `+` não entra no JID; só dígitos).
  - Ou seja: **qualquer país** é suportado desde que o número tenha **código do país + número**, só dígitos (ex.: Brasil `55`, EUA `1`, Portugal `351`).

- **Pairing Code**:  
  *"The phone number can't have `+` or `()` or `-`, **only numbers**, you **must provide country code**"*  
  → Reforça: número limpo (só dígitos) **com** código do país.

- Não há na documentação regras específicas por DDD (Brasil) ou por país; o formato único é **número completo com DDI + @s.whatsapp.net**.

### 1.2 Dois tipos de JID para contatos individuais

No código-fonte do Baileys (`lib/WABinary/jid-utils`):

- **`@s.whatsapp.net`** – JID “clássico” (número com DDI, ex.: `5511999999999@s.whatsapp.net`).
- **`@lid`** – **Linked ID**: usado em certos contextos pelo WhatsApp (ex.: contas vinculadas, alguns números internacionais ou de negócios).

Tipos de servidor: `'c.us' | 'g.us' | 'broadcast' | 's.whatsapp.net' | 'call' | 'lid' | 'newsletter'`.

- Em **messages-send.js** o Baileys monta o destino assim:
  - `destinationJid = jidEncode(user, isLid ? 'lid' : isGroup ? 'g.us' : 's.whatsapp.net')`
  - Ou seja: se o JID que **nós** passarmos for `número@lid`, a biblioteca usa `@lid`; caso contrário usa `@s.whatsapp.net` (para contatos individuais).

- A documentação não explica exatamente **quando** usar `@lid` vs `@s.whatsapp.net`; isso vem do comportamento observado (ex.: erro *"no lid for user"* quando se usa só `@s.whatsapp.net` para alguns números).

### 1.3 Configuração de país (Socket)

- Em **Defaults** do Baileys: `countryCode: 'US'` (uso em conexão/validação, não no formato do número do contato).
- O JID do **contato** continua sendo apenas `[código do país][número]@s.whatsapp.net` (ou `@lid`), independente do `countryCode` da sessão.

---

## 2. Resumo: DDD e DDI na prática

| Cenário | Formato do número (só dígitos) | JID Baileys | Observação |
|--------|--------------------------------|-------------|------------|
| Brasil, outro DDD | 55 + DDD + número (ex.: 5521988776655) | `5521988776655@s.whatsapp.net` | Mesmo DDI 55; só muda o DDD. |
| Outro país (DDI diferente) | DDI + número (ex.: 12025551234, 351912345678) | `12025551234@s.whatsapp.net` ou `351912345678@s.whatsapp.net` | Um único formato para todos os países. |
| Números longos / “LID” | 15+ dígitos (ex.: alguns internacionais) | `número@lid` | Usado quando o WhatsApp espera Linked ID; evita erro *"no lid for user"* em parte dos casos. |

- **DDD (Brasil)**: não exige tratamento especial no JID; apenas garantir número normalizado com `55` + DDD + número (com ou sem 9 conforme regras do Brasil).
- **DDI (outros países)**: mesmo critério: número completo com código do país, sem `+`, `()`, `-`; Baileys não distingue país no formato do JID, só exige o número completo.

---

## 3. O que o BaseCognos faz hoje

### 3.1 Função `toBaileysJid` (`backend/src/types/baileysAdapter.ts`)

- Remove não dígitos: `number.replace(/\D/g, "")`.
- Grupo → `número@g.us`.
- Contato individual → `número@s.whatsapp.net`.

Não diferencia DDD nem DDI; qualquer número “limpo” (com DDI) é aceito. Para números com **15 ou mais dígitos**, o projeto passou a usar **`@lid`** (veja abaixo) para alinhar com o Baileys e reduzir erro *"no lid for user"*.

### 3.2 Uso de `@lid` (números longos / internacionais)

- **SendWhatsAppMedia** já usava:
  - `contactNumber.length >= 15` → JID `número@lid`.
  - Caso contrário → `toBaileysJid(contactNumber, ticket.isGroup)`.
  - Se der *"no lid for user"* e o JID não for `@lid`, tentar de novo com `número@lid`.

A mesma regra (15+ dígitos → `@lid`) foi centralizada em **`toBaileysJid`** e usada em todos os pontos que enviam mensagem (SendWhatsAppMessage, SendMessage, SendMessagesSystemWbot, CheckIsValidContact, GetProfilePicUrl, etc.), para manter um único critério para **outros DDDs e outros DDIs**:

- Número com **menos de 15 dígitos** (após `replace(/\D/g, "")`) → `número@s.whatsapp.net`.
- Número com **15 ou mais dígitos** → `número@lid`.

Assim, contatos de outros DDDs (Brasil) e outros DDIs (outros países) são tratados de forma uniforme, com uso de `@lid` quando o número é longo (típico de vários internacionais).

---

## 4. Referências no código Baileys

- `lib/WABinary/jid-utils.js` (e `.d.ts`): `jidEncode`, `jidDecode`, `isLidUser`, `S_WHATSAPP_NET`, `JidServer` com `'lid'` e `'s.whatsapp.net'`.
- `lib/Socket/messages-send.js`: uso de `server === 'lid'` para montar `destinationJid` e dispositivos.
- `lib/Socket/messages-recv.js`: uso de `attrs.from.includes('lid')` e `authState.creds.me.lid`.
- README: seção *"Whatsapp IDs Explain"* e *"Pairing Code"*.

---

## 5. Recomendações

1. **Normalizar sempre** o número com código do país (ex.: libphonenumber ou `normalizePhoneNumberToE164`) antes de chamar `toBaileysJid`.
2. **Manter** a regra de 15+ dígitos → `@lid` centralizada em `toBaileysJid` e usá-la em todos os fluxos de envio/consulta.
3. **Opcional**: em fluxos que já tratam erro *"no lid for user"* (ex.: SendWhatsAppMedia), manter fallback: tentar o outro formato (@s.whatsapp.net ↔ @lid) em caso de falha, para cobrir edge cases do WhatsApp.
