# Sistema de Variáveis em Campanhas - Implementação

## 📋 Resumo

O backend agora suporta **criação de campanhas com upload de XLSX** contendo contatos e variáveis personalizadas em uma única etapa. O sistema mantém **100% compatível** com o fluxo atual (seleção manual de contatos).

## ✅ O que foi implementado no Backend

### 1. Banco de Dados

**Migration:** `20251010000003-add-variables-to-campaign.ts`
- Adiciona `customVariables` (JSONB) - Array com variáveis disponíveis
- Adiciona `variablesData` (JSONB) - Array com dados de cada contato

### 2. Modelo Campaign Atualizado

```typescript
@Column(DataType.JSONB)
customVariables: any[];  // [{label: "Cidade", value: "{{cidade}}"}]

@Column(DataType.JSONB)
variablesData: any[];    // [{nome: "João", cidade: "SP", numero: "123"}]
```

### 3. CreateCampaignService

**Novos parâmetros aceitos:**
- `customVariables` (string JSON)
- `variablesData` (string JSON)
- `contactsData` (string JSON) - **NOVO**: Cria contatos automaticamente

**Comportamento:**
- Se `contactsData` for enviado, cria/busca contatos e adiciona à campanha automaticamente
- Se não for enviado, mantém fluxo atual (adicionar contatos depois)
- Contatos duplicados são ignorados (`ignoreDuplicates: true`)

### 4. UpdateCampaignService

**Suporta os mesmos parâmetros** de variáveis e contatos
- Atualiza variáveis existentes
- **Adiciona** novos contatos aos já existentes (não substitui)

### 5. Helper SetPersonalMessage

**Substitui variáveis na mensagem:**

```typescript
// Entrada:
message: "Olá {{name}}, você mora em {{cidade}}?"
customVariables: [{label: "Cidade", value: "{{cidade}}"}]
variablesData: [{nome: "João", cidade: "SP", numero: "11999999999"}]

// Saída para o contato 11999999999:
"Olá João, você mora em SP?"
```

**Como funciona:**
1. Substitui `{{name}}` pelo nome do contato
2. Busca os dados do contato pelo número de telefone
3. Para cada variável customizada, substitui o valor correspondente
4. Trata acentuação automaticamente

### 6. StartCampaignService Atualizado

**Lógica inteligente:**
- **Se tiver** `customVariables` → Usa `SetPersonalMessage()` (personalização)
- **Se não tiver** → Usa sistema legado (3 mensagens aleatórias)

## 📊 Formato do XLSX Esperado

### Estrutura da Planilha

```
| nome  | numero      | cidade | idade | empresa |
|-------|-------------|--------|-------|---------|
| João  | 11999999999 | SP     | 30    | ABC     |
| Maria | 21988888888 | RJ     | 25    | XYZ     |
| Pedro | 31977777777 | MG     | 35    | 123     |
```

**Colunas obrigatórias:**
- `nome` ou `name` - Nome do contato
- `numero`, `telefone`, `number` ou `phone` - Telefone do contato

**Colunas opcionais:**
- Qualquer outra coluna vira uma variável utilizável!

### Como o Sistema Processa

**1. Headers viram variáveis:**
```javascript
customVariables = [
  {label: "Nome", value: "{{nome}}"},
  {label: "Cidade", value: "{{cidade}}"},
  {label: "Idade", value: "{{idade}}"},
  {label: "Empresa", value: "{{empresa}}"}
]
```

**2. Cada linha vira um objeto de dados:**
```javascript
variablesData = [
  {nome: "João", numero: "11999999999", cidade: "SP", idade: "30", empresa: "ABC"},
  {nome: "Maria", numero: "21988888888", cidade: "RJ", idade: "25", empresa: "XYZ"}
]
```

**3. Contatos são criados automaticamente:**
```javascript
contactsData = [
  {name: "João", number: "11999999999"},
  {name: "Maria", number: "21988888888"}
]
```

## 🔄 Fluxo de Dados

### Fluxo NOVO (com XLSX):

```
1. Frontend lê arquivo XLSX
2. Extrai headers → customVariables
3. Extrai linhas → variablesData + contactsData
4. Envia tudo junto no POST /campaigns
5. Backend:
   - Cria campanha com customVariables e variablesData
   - Cria/busca contatos automaticamente
   - Adiciona contatos à campanha
6. Pronto! Campanha criada com contatos
```

### Fluxo LEGADO (compatibilidade mantida):

```
1. POST /campaigns (sem contactsData)
2. Backend cria campanha
3. Frontend vai em /contatos
4. Seleciona contatos
5. POST /campaigns/:id/contacts
6. Inicia campanha
```

## 🎯 Exemplo de Uso

### Request para criar campanha com XLSX:

```javascript
POST /campaigns

FormData:
{
  name: "Promoção Outubro",
  start: "2025-10-15T10:00:00",
  message1: "Olá {{nome}}! Você de {{cidade}} tem desconto especial!",
  sessionId: 1,
  delay: 20,
  customVariables: '[{"label":"Nome","value":"{{nome}}"},{"label":"Cidade","value":"{{cidade}}"}]',
  variablesData: '[{"nome":"João","numero":"11999999999","cidade":"SP"},{"nome":"Maria","numero":"21988888888","cidade":"RJ"}]',
  contactsData: '[{"name":"João","number":"11999999999"},{"name":"Maria","number":"21988888888"}]'
}
```

### Resultado:

**Campanha criada com:**
- ✅ 2 contatos adicionados automaticamente
- ✅ Variáveis configuradas
- ✅ Pronta para iniciar

**Mensagens enviadas:**
- Para João (11999999999): "Olá João! Você de SP tem desconto especial!"
- Para Maria (21988888888): "Olá Maria! Você de RJ tem desconto especial!"

## 🔧 API Endpoints Atualizados

### POST /campaigns
**Novos campos opcionais:**
- `customVariables` (string JSON)
- `variablesData` (string JSON)
- `contactsData` (string JSON)

### PUT /campaigns/:id
**Mesmos campos opcionais**
- Adiciona novos contatos aos existentes
- Atualiza variáveis

## 🎨 Variáveis Suportadas

### Variável Padrão (sempre disponível):
- `{{name}}` - Nome do contato

### Variáveis Customizadas (via XLSX):
- `{{qualquerColuna}}` - Qualquer header da planilha
- Exemplos: `{{cidade}}`, `{{idade}}`, `{{empresa}}`, `{{cpf}}`, etc.

### Tratamento de Dados:
- ✅ Remove acentos automaticamente se necessário
- ✅ Converte valores para string
- ✅ Se variável não encontrada, substitui por string vazia
- ✅ Case insensitive na busca de colunas

## 📝 Logs

O sistema registra:
- Quantos contatos foram adicionados à campanha
- Erros de parsing de JSON
- Avisos quando dados de variáveis não são encontrados

## ⚠️ Importante

### Compatibilidade:
- ✅ Sistema atual **continua funcionando** normalmente
- ✅ Campanhas sem variáveis usam mensagens aleatórias (legado)
- ✅ Campanhas com variáveis usam personalização

### Busca de Contatos:
- Sistema busca contato pelo número no `variablesData`
- Se número não for encontrado, variáveis não serão substituídas
- Recomenda-se sempre incluir coluna `numero` ou `number` no XLSX

## 🚀 Executar Migration

```bash
cd cognosbot-backend-backup
npm run typeorm migration:run
npm run build
pm2 restart 2
```

## 📌 Próximos Passos (Frontend)

O frontend precisa implementar:

1. **Upload de arquivo XLSX**
   - Botão "Importar XLSX" na tela de campanha
   - Ler arquivo com biblioteca XLSX
   - Extrair headers e linhas

2. **Processar dados**
   - Headers → `customVariables`
   - Linhas → `variablesData` + `contactsData`
   - Validar colunas obrigatórias (nome, numero)

3. **Preview**
   - Mostrar variáveis disponíveis
   - Permitir inserir variáveis na mensagem
   - Preview da mensagem personalizada

4. **Enviar tudo junto**
   - Append ao FormData: `customVariables`, `variablesData`, `contactsData`
   - Não precisa mais ir na tela de contatos!

## 🎯 Benefícios

- ✅ Processo unificado (campanha + contatos em 1 etapa)
- ✅ Mensagens personalizadas ilimitadas
- ✅ Compatibilidade com sistema atual
- ✅ Menos passos para criar campanha
- ✅ Importação em massa facilitada

