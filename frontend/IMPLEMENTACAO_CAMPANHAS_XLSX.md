# Sistema de Campanhas com XLSX - Frontend

## 🎯 Resumo das Mudanças

O frontend agora permite criar campanhas completas (mensagens + contatos + variáveis) através da importação de um único arquivo XLSX, sem precisar ir na tela de contatos.

## ✅ O que foi Implementado

### 1. **Modal de Campanha Reformulada** (`ModalCampanha.vue`)

#### **Sistema de Mensagens Dinâmico**
- ✅ Começa com 1 mensagem
- ✅ Botão **"+ Adicionar Mensagem"** (até 3 máximo)
- ✅ Botão de remover mensagem individual
- ✅ Validação apenas na primeira mensagem (obrigatória)

#### **Importação de XLSX**
- ✅ Botão **"Importar XLSX (Contatos + Variáveis)"**
- ✅ Aceita arquivos: `.csv`, `.xls`, `.xlsx`
- ✅ Processa arquivo automaticamente
- ✅ Extrai contatos e variáveis em uma só etapa

#### **Menu de Variáveis**
- ✅ Botão com ícone de variável em cada mensagem
- ✅ Variável padrão: `{{name}}`
- ✅ Variáveis importadas do XLSX dinamicamente
- ✅ Clique insere no cursor da textarea

#### **Preview de Dados Importados**
- ✅ Modal com 3 abas:
  - **Contatos**: Lista com nome e número
  - **Variáveis**: Variáveis disponíveis
  - **Dados Completos**: Tabela com todos os dados do XLSX

#### **Exibição de Contatos Importados**
- ✅ Card lateral mostrando contatos importados
- ✅ Avatar com inicial do nome
- ✅ Limite de 50 contatos visíveis + contador

### 2. **Tela de Contatos da Campanha Atualizada** (`ContatosCampanha.vue`)

- ✅ Chips informativos quando campanha tem variáveis
- ✅ Indicador visual "Contatos importados via XLSX"
- ✅ Mostra quantidade de variáveis personalizadas
- ✅ Mantém funcionalidade de adicionar contatos manualmente

## 📋 Como Usar

### **Criar Campanha com XLSX:**

1. **Criar Campanha**
   - Nome, Data, Conexão, Delay

2. **Importar XLSX**
   - Clicar em "Importar XLSX (Contatos + Variáveis)"
   - Selecionar arquivo
   - Sistema mostra preview dos dados

3. **Confirmar Importação**
   - Visualizar contatos na aba "Contatos"
   - Visualizar variáveis na aba "Variáveis"
   - Confirmar importação

4. **Escrever Mensagem**
   - Digitar mensagem na textarea
   - Clicar no botão de variáveis
   - Selecionar variável para inserir (ex: `{{cidade}}`)
   - Adicionar mais mensagens se quiser (botão +)

5. **Salvar**
   - Sistema cria campanha + contatos em uma única operação!

### **Fluxo Legado (mantido):**

1. Criar campanha sem importar XLSX
2. Salvar campanha
3. Ir em "Contatos" da campanha
4. Adicionar contatos manualmente
5. Iniciar campanha

## 📊 Formato do XLSX

### **Exemplo de Planilha:**

```
| nome  | numero      | cidade     | idade | produto  |
|-------|-------------|------------|-------|----------|
| João  | 11999999999 | São Paulo  | 30    | Premium  |
| Maria | 21988888888 | Rio de Jan | 25    | Basic    |
| Pedro | 31977777777 | Belo Horiz | 35    | Premium  |
```

### **Colunas Obrigatórias:**
- **nome** ou **name** - Nome do contato
- **numero**, **telefone**, **number** ou **phone** - Telefone

### **Colunas Opcionais:**
- Qualquer outra coluna vira uma variável!
- Exemplos: cidade, idade, produto, empresa, cpf, etc.

## 🎨 Recursos Visuais

### **Chips Informativos:**
- 🟢 Verde: "X variáveis importadas"
- 🔵 Azul: "X contatos importados"
- 🟠 Laranja: "Contatos importados via XLSX"

### **Preview de Mensagem:**
- Simulação em tempo real
- Moldura de celular
- Alterna entre as mensagens criadas

### **Modal de Preview:**
- Navegação por abas
- Tabelas responsivas
- Paginação automática

## 🔧 Estrutura de Dados

### **Dados Enviados ao Backend:**

```javascript
FormData {
  name: "Campanha Outubro",
  start: "2025-10-15T10:00:00",
  sessionId: 1,
  delay: 20,
  message1: "Olá {{nome}}, você de {{cidade}} ganhou desconto!",
  message2: "", // opcional
  message3: "", // opcional
  
  // Novos campos:
  customVariables: '[{"label":"Cidade","value":"{{cidade}}"},{"label":"Idade","value":"{{idade}}"}]',
  variablesData: '[{"nome":"João","numero":"11999999999","cidade":"SP","idade":"30"}]',
  contactsData: '[{"name":"João","number":"11999999999"}]',
  
  medias: File // opcional
}
```

## 🚀 Fluxo Completo

```
1. Usuário abre modal de criar campanha
2. Preenche nome, data, conexão
3. Clica "Importar XLSX"
4. Seleciona arquivo
   ↓
5. Sistema processa:
   - Headers → Variáveis
   - Linhas → Dados + Contatos
   ↓
6. Modal de preview abre
7. Usuário confirma
   ↓
8. Variáveis aparecem no menu
9. Contatos listados no card lateral
   ↓
10. Usuário escreve mensagem:
    "Olá {{nome}}, você de {{cidade}}..."
    ↓
11. Adiciona mais mensagens se quiser (+)
    ↓
12. Salvar
    ↓
13. Backend:
    - Cria campanha
    - Cria/busca contatos
    - Adiciona à campanha
    - Tudo em 1 request!
    ↓
14. ✅ Campanha pronta para iniciar!
```

## 💡 Vantagens

| Antes | Agora |
|-------|-------|
| 1. Criar campanha | 1. Upload XLSX |
| 2. Ir em contatos | 2. Escrever mensagem |
| 3. Aplicar filtros | 3. Salvar |
| 4. Selecionar 1 por 1 | ✅ Pronto! |
| 5. Adicionar à campanha | |
| 6. Voltar para campanhas | |
| 7. Iniciar | |
| Mensagem genérica | Mensagem personalizada! |

## 🎯 Exemplos de Uso

### **Exemplo 1: Promoção Regional**

**XLSX:**
```
nome  | numero      | cidade | desconto
João  | 11999999999 | SP     | 20%
Maria | 21988888888 | RJ     | 15%
```

**Mensagem:**
```
Olá {{nome}}! 

Você de {{cidade}} ganhou {{desconto}} de desconto especial!

Aproveite! 🎉
```

**Resultado:**
- João recebe: "Olá João! Você de SP ganhou 20% de desconto especial!"
- Maria recebe: "Olá Maria! Você de RJ ganhou 15% de desconto especial!"

### **Exemplo 2: Cobrança Personalizada**

**XLSX:**
```
nome  | numero      | valor  | vencimento
Carlos| 11888888888 | R$ 150 | 15/10/2025
Ana   | 21777777777 | R$ 200 | 20/10/2025
```

**Mensagem:**
```
Olá {{nome}},

Seu boleto de {{valor}} vence em {{vencimento}}.

Pague em dia e evite juros! 💰
```

## 🔄 Compatibilidade

✅ **Sistema legado funciona normalmente:**
- Criar campanha sem XLSX
- Adicionar contatos manualmente
- Mensagens aleatórias (1, 2 ou 3)

✅ **Novo sistema convive com o antigo:**
- Campanhas antigas continuam funcionando
- Possível misturar: XLSX + adicionar contatos manuais depois

## 📦 Dependências

- ✅ `xlsx`: ^0.16.9 (já instalado)
- ✅ `v-emoji-picker`: ^2.3.3 (já instalado)
- ✅ Quasar components (já disponíveis)

## 🚨 Observações Importantes

1. **Primeira mensagem é obrigatória**, as outras opcionais
2. **Se tiver variáveis**, sistema usa personalização (não aleatório)
3. **Se não tiver variáveis**, sistema usa as 3 mensagens aleatórias (legado)
4. **Contatos duplicados** são ignorados automaticamente
5. **Variáveis não encontradas** são substituídas por string vazia

## 📝 Próximos Passos

1. Executar migration no backend:
```bash
cd cognosbot-backend-backup
npm run typeorm migration:run
npm run build
pm2 restart 2
```

2. Frontend já está pronto para usar!

3. Testar o fluxo completo:
   - Criar XLSX de teste
   - Importar na campanha
   - Verificar preview
   - Salvar e iniciar

## 🎉 Resultado Final

Agora criar campanhas personalizadas é:
- ⚡ **Mais rápido** (1 etapa vs 6 etapas)
- 🎨 **Mais flexível** (variáveis ilimitadas)
- 👥 **Mais escalável** (centenas de contatos em segundos)
- 💪 **Mais poderoso** (mensagens ultra personalizadas)

