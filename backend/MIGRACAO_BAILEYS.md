# Varredura pós-migração: WhatsApp (Baileys)

Resumo da varredura feita após a migração de **whatsapp-web.js** para **@whiskeysockets/baileys** e ajustes aplicados.

## O que foi verificado

1. **Referências antigas** – Não restam usos de `whatsapp-web.js`, Puppeteer ou `Client` do WWebJS no código de produção (apenas comentários e tipos de compatibilidade).
2. **Fluxo de conexão** – `wbot.ts` usa `makeWASocket`, `useMultiFileAuthState`, `fetchLatestBaileysVersion` (ou versão fixa via env). O evento `connection.update` trata `open`, `close`, `connecting` e QR.
3. **Desconexão imediata** – Vários usuários relatam conexão fechando logo após iniciar, com `statusCode: undefined`. Causas comuns: versão do Baileys incompatível, auth antiga/corrompida, ou mesmo 405/outros códigos em versões mais novas.

## Ajustes aplicados no backend

### 1. `src/libs/wbot.ts`

- **Versão fixa do Baileys:** dependência fixada em **6.6.0** no `package.json` (versão em que o problema de “connection closed” é menos frequente).
- **Versão via env:** suporte a `BAILEYS_USE_VERSION` (ex.: `6.6.0`) para usar uma versão específica em vez de `fetchLatestBaileysVersion`.
- **msgRetryCounterCache:** cache de retry de mensagens (Map com interface CacheStore) para evitar loop de descriptografia, conforme recomendado pelo Baileys.
- **syncFullHistory:** `syncFullHistory: false` para não forçar sincronização completa de histórico na conexão.
- **Logs de desconexão:** quando `statusCode` é `undefined`, o log passa a incluir o objeto `lastDisconnect` e a mensagem de erro bruta para facilitar diagnóstico.

### 2. Documentação

- **PASSO_A_PASSO.md:** seção “WhatsApp (Baileys) – se a conexão fechar logo ao iniciar” com passos para limpar sessão, usar versão fixa e interpretar logs.
- **Este arquivo:** registro da varredura e dos pontos tocados na migração.

## Erro "crypto is not defined"

Se o log mostrar `[DISCONNECT] Erro bruto: crypto is not defined`, a causa é o Baileys usar a **Web Crypto API** (`crypto.subtle`) que em alguns contextos (ex.: ts-node-dev) não está disponível em `globalThis.crypto`. Foi adicionado o arquivo **`src/patch-crypto.ts`**, importado como primeiro passo em `server.ts`, que define `globalThis.crypto` a partir do `crypto.webcrypto` do Node. Não é necessário remover a pasta `.baileys_auth` por causa desse erro.

## O que fazer se ainda der erro

1. **Reinstalar dependências** (para garantir Baileys 6.6.0):
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   ```
2. **Limpar auth e reconectar:** apagar `.baileys_auth/session-wbot-<id>` e gerar novo QR Code.
3. **Conferir logs:** procurar por `[DISCONNECT] lastDisconnect (debug)` e `[DISCONNECT] Erro bruto:` no terminal do backend.
4. **Não usar o mesmo número em outro lugar** (WhatsApp Web, outro app, etc.) enquanto testa.

## Referências

- [Baileys – Connection closed / 405](https://github.com/WhiskeySockets/Baileys/issues/807) – workaround com versão 6.6.0.
- Exemplo oficial: [Example/example.ts](https://github.com/WhiskeySockets/Baileys/blob/master/Example/example.ts) – uso de `msgRetryCounterCache`, `lastDisconnect` e Boom.
