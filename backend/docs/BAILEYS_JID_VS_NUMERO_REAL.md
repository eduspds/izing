# Baileys: JID vs número real do usuário

## O que é JID

**JID** (Jabber ID) é o identificador que o protocolo WhatsApp usa para endereçar mensagens. Exemplos:

- **Contato individual (PN – Phone Number):** `5575912345678@s.whatsapp.net`
- **Com sufixo de dispositivo:** `5575912345678:2@s.whatsapp.net` (o `:2` indica um dispositivo vinculado, ex.: WhatsApp Web)
- **Grupo:** `120363012345678@g.us`
- **LID (identificador interno):** `164879499583679@lid` (usado em vez do número em alguns fluxos)

O sistema **nunca** deve gravar o JID bruto no campo de telefone do contato. O atendente precisa ver apenas o número discável (DDI + DDD + número).

---

## Como o Baileys 7.x trata JID e número real

1. **MessageKey (chave da mensagem)**  
   Em `messages.upsert`, cada mensagem traz `m.key` com:
   - `remoteJid`: JID do chat (pode ser PN ou LID).
   - `participant`: em grupos, JID de quem enviou (pode ter `:1`, `:2`).
   - **Baileys 6.8+ / 7.x:** `remoteJidAlt` e `participantAlt` trazem o JID em formato PN quando o servidor envia; use esses campos quando existirem para obter o número real.

2. **PushName**  
   O nome de perfil do usuário vem em `m.pushName` (raiz da mensagem). Deve ser usado quando o contato for novo e não tiver nome no banco: salvar como nome do contato e o número extraído (apenas dígitos) no campo de telefone.

3. **Acesso seguro na tipagem (7.x)**  
   Em TypeScript, use optional chaining para evitar erros quando algum campo não existir:
   - `m?.key?.remoteJid`
   - `(m as any)?.pushName` (pushName pode não estar nos tipos antigos)

4. **LID → número real (Baileys 7.x)**  
   Quando o JID for LID (`@lid`), o Baileys 7 expõe `sock.signalRepository.lidMapping.getPNForLID(lidJid)`. Se retornar um JID PN, use-o para obter o número real; caso contrário, use apenas os dígitos do LID (sem sufixo) e priorize sempre `remoteJidAlt`/`participantAlt` quando a key trouxer esses campos.

---

## O que o sistema faz (regras de negócio)

- **Helper `sanitizeJidToPhone(jid)`:** extrai apenas os dígitos que precedem `@` ou `:`. Ex.: `5575912345678:2@s.whatsapp.net` → `5575912345678`.
- **Campo `number` no banco:** apenas dígitos (DDI + DDD + número). Nunca gravar `@s.whatsapp.net`, `@g.us`, `@lid` ou sufixo `:1`, `:2`.
- **Prioridade:** número real (PN) quando disponível; em 7.x usar `remoteJidAlt`/`participantAlt` e `getPNForLID` quando o JID for LID.
- **PushName:** em `messages.upsert` e no adapter, capturar `pushName` e, para contato novo sem nome, salvar como nome do contato.

---

## Referências

- Migração Baileys 7: [Migrate to v7.x.x](https://baileys.wiki/docs/migration/to-v7.0.0/)
- Número LID no sistema: `backend/docs/NUMERO_LID_RISCOS_E_CONVERSAO.md`
- Helper de sanitização: `backend/src/types/baileysAdapter.ts` (`sanitizeJidToPhone`)
