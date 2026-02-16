# Teste de MIME Type para Áudio

## Problema
O navegador não consegue reproduzir o áudio gravado, mostrando erro de formato MPEG.

## Possíveis causas

### 1. MIME Type incorreto no servidor
O servidor pode estar servindo o arquivo `.mp3` com Content-Type errado.

**Para verificar:**
```bash
# Substitua pela URL real do seu áudio
curl -I http://localhost:8103/public/1234567890.mp3
```

**Resposta esperada:**
```
Content-Type: audio/mpeg
```

**Se vier diferente:**
```
Content-Type: application/octet-stream  ❌ ERRADO
Content-Type: audio/mp3                 ✅ FUNCIONA (mas não é padrão)
Content-Type: audio/mpeg                ✅ CORRETO
```

### 2. Arquivo corrompido
O `mic-recorder-to-mp3` pode estar gerando arquivos inválidos.

**Para verificar:**
```bash
# Baixe um áudio e tente reproduzir localmente
wget http://localhost:8103/public/1234567890.mp3
file 1234567890.mp3
# Deve mostrar: Audio file with ID3 version...

# Tente reproduzir
ffplay 1234567890.mp3
# ou
mpg123 1234567890.mp3
```

### 3. Codecs não suportados
O navegador pode não ter os codecs necessários.

**Navegadores que suportam MP3:**
- ✅ Chrome/Edge (todos os sistemas)
- ✅ Firefox (todos os sistemas)
- ✅ Safari (todos os sistemas)
- ⚠️ Alguns navegadores em Linux podem não ter codec MP3

## Soluções

### Solução 1: Verificar configuração do Express
Certifique-se que o Express está servindo arquivos estáticos com MIME types corretos.

**Arquivo:** `src/app/modules.ts`
```typescript
app.use("/public", expressInstance.static(uploadConfig.directory));
```

### Solução 2: Forçar Content-Type correto
Adicione middleware para forçar MIME type correto:

```typescript
app.use("/public", (req, res, next) => {
  if (req.path.endsWith('.mp3')) {
    res.setHeader('Content-Type', 'audio/mpeg');
  }
  next();
}, expressInstance.static(uploadConfig.directory));
```

### Solução 3: Converter para formato mais compatível
Converter MP3 para OGG ou WEBM no backend antes de servir.

### Solução 4: Usar formato WebM nativamente
Modificar o frontend para gravar em WebM ao invés de MP3:

```javascript
// InputMensagem.vue
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm;codecs=opus'
});
```

## Teste rápido no Console do Navegador

Abra o Console (F12) e execute:

```javascript
// Teste 1: Verificar se o navegador suporta MP3
const audio = new Audio();
console.log('Suporta MP3:', audio.canPlayType('audio/mpeg'));
console.log('Suporta OGG:', audio.canPlayType('audio/ogg'));
console.log('Suporta WebM:', audio.canPlayType('audio/webm'));

// Teste 2: Tentar carregar o áudio manualmente
const testAudio = new Audio('URL_DO_SEU_AUDIO_AQUI');
testAudio.addEventListener('error', (e) => {
  console.error('Erro ao carregar áudio:', e);
  console.error('Código do erro:', testAudio.error.code);
  console.error('Mensagem:', testAudio.error.message);
});
testAudio.addEventListener('loadeddata', () => {
  console.log('Áudio carregado com sucesso!');
  console.log('Duração:', testAudio.duration, 'segundos');
});
testAudio.load();
```

## Códigos de erro

| Código | Significado |
|--------|-------------|
| 1 | MEDIA_ERR_ABORTED - Download abortado |
| 2 | MEDIA_ERR_NETWORK - Erro de rede |
| 3 | MEDIA_ERR_DECODE - Erro ao decodificar (formato inválido) |
| 4 | MEDIA_ERR_SRC_NOT_SUPPORTED - Formato não suportado |

## Próximos Passos

1. Execute o teste no console do navegador
2. Verifique o Content-Type retornado pelo servidor
3. Se necessário, adicione o middleware para forçar MIME type
4. Considere mudar para WebM se o problema persistir

