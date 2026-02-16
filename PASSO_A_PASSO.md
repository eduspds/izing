## Portas (front e back são em portas diferentes)

- **Backend (API + Baileys):** porta **3001** – onde rodam a API REST e o Socket.IO.
- **Frontend (Quasar):** porta **8080** (ou 3003, conforme o script).
- **Baileys/WhatsApp** roda só no backend; o frontend só abre a interface. **Não é preciso** front e back na mesma porta. O front chama o back em `http://localhost:3001` (variável `URL_API` no frontend).

Confirme que o backend está ouvindo em 3001. O frontend usa `src/config/apiUrl.js`: se você estiver em `localhost:8080` (ou 3003), a URL da API é forçada para `http://localhost:3001` mesmo que o build tenha ficado errado.

**Se ainda aparecer 404 em localhost:8080 ou “Socket timeout”:**
1. Backend rodando? Deve aparecer no terminal algo como `Web server listening at: http://0.0.0.0:3001/`.
2. No Chrome: F12 → Application → Storage → “Clear site data” para `localhost:8080` (limpa cache e service worker).
3. Ou use atalho: Ctrl+Shift+R (hard refresh) na página do front.
4. Reinicie o frontend (`npm run dev`), abra de novo `http://localhost:8080` e confira no console a linha `[Cognos] API base URL: http://localhost:3001`.

---

## Resumo rápido (desenvolvimento local)

```bash
# 1) Backend
cd backend
copy .env.example .env
# Editar .env (DB, Redis, PORT, etc.)
npm install
npm run build
npx sequelize db:migrate
npx sequelize db:seed:all
npm run dev:server

# 2) Em outro terminal – Frontend
cd frontend
# Criar .env com URL_API=http://localhost:3001 (já existe se você clonou o projeto)
npm install
npm run dev
# Se o dashboard mostrar só zeros e “N/A”, confira se o .env tem URL_API apontando para o backend (ex.: http://localhost:3001).
```

Com Docker (infra + API):

```bash
cd backend
copy .env.example .env
copy docker-compose.yml.template docker-compose.yml
# Ajustar .env e docker-compose (portas, volumes .baileys_auth)
docker-compose up -d
docker-compose exec api npx sequelize db:migrate
docker-compose exec api npx sequelize db:seed:all
```

---

## WhatsApp (Baileys) – se a conexão fechar logo ao iniciar

- **Sintoma:** `[DISCONNECT] Conexão fechada ... statusCode: indefinido` logo após `[INIT] Sessão Baileys iniciada`.
- **O que fazer:**
  1. **Limpar sessão e escanear de novo:** apague a pasta de autenticação e reinicie o backend:
     ```bash
     # No backend (PowerShell)
     Remove-Item -Recurse -Force .baileys_auth\session-wbot-1 -ErrorAction SilentlyContinue
     npm run dev:server
     ```
     Depois abra o front, Conectar WhatsApp e escaneie o novo QR Code.
  2. **Versão do Baileys:** o projeto está fixado em `6.6.0` no `package.json` para evitar falhas de conexão conhecidas em versões mais novas. Após alterar, rode `npm install` no backend.
  3. **Logs:** em caso de `statusCode: indefinido`, o backend agora grava no log o objeto `lastDisconnect` e a mensagem de erro; use isso para depurar.