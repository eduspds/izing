# Configuração do Resumo com IA

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Configurações do Gemini AI
GEMINI_API_KEY=sua_chave_api_do_gemini_aqui
GEMINI_MODEL=gemini-1.5-flash
```

## Como Obter a Chave da API do Gemini

1. Acesse o [Google AI Studio](https://aistudio.google.com/)
2. Faça login com sua conta Google
3. Clique em "Get API Key"
4. Crie uma nova chave de API
5. Copie a chave e adicione ao arquivo `.env`

## Funcionalidades Implementadas

### Frontend
- ✅ Componente `AISummary.vue` na sidebar do atendimento
- ✅ Service `aiSummary.js` para comunicação com o backend
- ✅ Integração na página de atendimento (`Index.vue`)

### Backend
- ✅ Controller `AISummaryController.ts`
- ✅ Services: `GenerateAISummaryService.ts` e `GetAISummaryService.ts`
- ✅ Modelo `AISummary.ts`
- ✅ Migration para criar tabela `ai_summaries`
- ✅ Rotas configuradas em `aiSummaryRoutes.ts`

## Como Usar

1. **Configurar variáveis de ambiente** (veja acima)
2. **Reiniciar o backend** para carregar as novas variáveis
3. **Acessar um ticket** na interface de atendimento
4. **Na sidebar**, você verá a seção "Resumo com IA"
5. **Clicar no botão** para gerar o resumo das primeiras 100 mensagens

## Recursos

- **Resumo Inteligente**: Analisa as primeiras 100 mensagens do ticket
- **Cache**: Resumos são salvos no banco para evitar regeneração desnecessária
- **Regenerar**: Possibilidade de regenerar o resumo a qualquer momento
- **Copiar**: Botão para copiar o resumo para a área de transferência
- **Responsivo**: Interface adaptada para diferentes tamanhos de tela

## Estrutura do Banco

A tabela `ai_summaries` armazena:
- `id`: Identificador único
- `ticket_id`: ID do ticket
- `tenant_id`: ID do tenant
- `text`: Texto do resumo gerado
- `message_count`: Quantidade de mensagens analisadas
- `model`: Modelo de IA utilizado
- `created_at`: Data de criação
- `updated_at`: Data de atualização


