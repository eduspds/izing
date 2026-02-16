# Implementação: Fluxo de Avaliação de Atendimento

## Resumo

Esta implementação adiciona um sistema de mensagens de avaliação para os tickets. Quando um atendimento é finalizado e há um fluxo de avaliação configurado, o sistema não fecha o ticket imediatamente, mas envia uma mensagem de avaliação ao cliente. O ticket só é fechado após o cliente responder ou quando o tempo de espera expira.

## O que foi implementado

### 1. Banco de Dados

#### Migrations criadas:

- **`20251010000001-add-evaluationChatFlowId-to-whatsapps.ts`**
  - Adiciona campo `evaluationChatFlowId` na tabela `Whatsapps`
  - Referencia um ChatFlow que será usado como fluxo de avaliação

- **`20251010000002-add-evaluation-fields-to-tickets.ts`**
  - Adiciona `isEvaluationFlow` (boolean) - indica se o ticket está em fluxo de avaliação
  - Adiciona `evaluationStartedAt` (bigint) - timestamp de quando a avaliação iniciou

#### Seed criado:

- **`20251010000001-add-evaluation-timeout-setting.ts`**
  - Adiciona configuração `evaluationTimeoutMinutes` com valor padrão de 60 minutos
  - Esta configuração define quanto tempo o sistema aguarda a resposta do cliente

### 2. Modelos Atualizados

#### `Whatsapp.ts`
```typescript
@ForeignKey(() => ChatFlow)
@Default(null)
@AllowNull
@Column
evaluationChatFlowId: number;

@BelongsTo(() => ChatFlow, "evaluationChatFlowId")
evaluationChatFlow: ChatFlow;
```

#### `Ticket.ts`
```typescript
@Default(false)
@Column
isEvaluationFlow: boolean;

@Default(null)
@AllowNull
@Column(DataType.BIGINT)
evaluationStartedAt: number;
```

### 3. Novo Status de Ticket

O sistema agora suporta o status **`pending_evaluation`** para tickets que estão aguardando resposta de avaliação.

### 4. Serviços Criados

#### `StartEvaluationFlowService.ts`
Responsável por iniciar o fluxo de avaliação:
- Verifica se a conexão tem um fluxo de avaliação configurado
- Atualiza o ticket para status `pending_evaluation`
- Define `isEvaluationFlow = true` e registra `evaluationStartedAt`
- Envia as mensagens do primeiro passo do fluxo
- Cria log de tipo `evaluationStarted`

#### `CheckExpiredEvaluationsService.ts`
Serviço executado periodicamente (a cada 5 minutos) para:
- Buscar tickets com status `pending_evaluation`
- Verificar se o tempo de espera configurado foi excedido
- Fechar automaticamente tickets com avaliação expirada
- Criar log de tipo `evaluationExpired`

### 5. Serviços Modificados

#### `UpdateTicketService.ts`
Modificado para interceptar tentativas de fechamento de ticket:
```typescript
// Quando tentar fechar um ticket (status = "closed")
// E o ticket NÃO está em fluxo de avaliação
if (statusData === "closed" && !ticket.isEvaluationFlow) {
  // Tenta iniciar fluxo de avaliação
  const evaluationStarted = await StartEvaluationFlowService({
    ticket,
    userId: userIdRequest
  });

  // Se iniciou avaliação, retorna sem fechar o ticket
  if (evaluationStarted) {
    return { ticket, oldStatus, oldUserId };
  }
}
```

#### `VerifyStepsChatFlowTicket.ts`
Modificado para suportar fluxo de avaliação:
- Aceita tickets com status `pending_evaluation`
- Quando o cliente responde uma etapa do fluxo de avaliação
- Verifica se é o último passo do fluxo
- Se for o último passo ou uma ação de encerramento, fecha o ticket definitivamente
- Cria log de tipo `evaluationCompleted`

### 6. Job Agendado

#### `CheckExpiredEvaluations.ts`
Job que executa a cada 5 minutos para verificar e fechar tickets com avaliação expirada.

Foi registrado em:
- `src/jobs/Index.ts` - export do job
- `src/app/bull.ts` - inicialização do job

## Como Funciona o Fluxo

### Cenário 1: Cliente responde a avaliação

1. Atendente tenta fechar o ticket
2. Sistema verifica se há fluxo de avaliação configurado na conexão
3. Se houver, em vez de fechar:
   - Muda status para `pending_evaluation`
   - Marca `isEvaluationFlow = true`
   - Registra timestamp em `evaluationStartedAt`
   - Envia primeira mensagem do fluxo de avaliação
4. Cliente responde às perguntas do fluxo
5. Quando chega no final do fluxo, o ticket é fechado automaticamente
6. Log criado: `evaluationCompleted`

### Cenário 2: Cliente não responde

1. Mesmo processo inicial do Cenário 1
2. Cliente não responde às mensagens
3. Job `CheckExpiredEvaluations` executa a cada 5 minutos
4. Verifica tickets em `pending_evaluation` há mais tempo que o configurado
5. Fecha automaticamente o ticket
6. Log criado: `evaluationExpired`

### Cenário 3: Sem fluxo de avaliação configurado

1. Atendente tenta fechar o ticket
2. Sistema verifica e não encontra fluxo de avaliação
3. Ticket é fechado normalmente (comportamento original)

## Tipos de Logs Criados

Novos tipos de log adicionados ao sistema:
- `evaluationStarted` - quando o fluxo de avaliação é iniciado
- `evaluationCompleted` - quando o cliente completa o fluxo
- `evaluationExpired` - quando o tempo de espera expira

## Configurações

### Na Conexão (Whatsapp)
Adicionar campo no frontend para selecionar o **ChatFlow de Avaliação** (campo `evaluationChatFlowId`).

### Nas Settings
- Chave: `evaluationTimeoutMinutes`
- Valor padrão: 60 (minutos)
- Pode ser configurado por tenant

## Próximos Passos (Frontend)

Para completar a implementação, o frontend precisa:

1. **Tela de Configuração de Conexão**
   - Adicionar campo para selecionar o ChatFlow de Avaliação
   - Similar ao campo que já existe para o ChatFlow principal

2. **Tela de Settings**
   - Permitir configurar o tempo de espera (`evaluationTimeoutMinutes`)

3. **Tela de Tickets**
   - Exibir o novo status `pending_evaluation`
   - Mostrar visualmente quando um ticket está em avaliação

4. **Logs de Ticket**
   - Traduzir os novos tipos de log:
     - `evaluationStarted` → "Avaliação iniciada"
     - `evaluationCompleted` → "Avaliação concluída"
     - `evaluationExpired` → "Avaliação expirou (sem resposta)"

## Executar Migrations

Para aplicar as mudanças no banco de dados:

```bash
# No diretório cognosbot-backend-backup
npm run typeorm migration:run

# Executar o seed de configuração
npm run seed:run
```

## Observações Importantes

1. O fluxo de avaliação funciona exatamente como um ChatFlow normal, com as mesmas opções e configurações

2. Um ticket só pode estar em um fluxo de avaliação por vez

3. Se o ticket já estiver em fluxo de avaliação (`isEvaluationFlow = true`), uma nova tentativa de fechamento não iniciará outro fluxo

4. O campo `answered` do ticket permanece `true` durante a avaliação, para não aparecer como "não respondido"

5. O sistema limpa os campos de avaliação ao fechar definitivamente o ticket

## Estrutura de Arquivos Criados/Modificados

### Criados:
```
src/
├── database/
│   ├── migrations/
│   │   ├── 20251010000001-add-evaluationChatFlowId-to-whatsapps.ts
│   │   └── 20251010000002-add-evaluation-fields-to-tickets.ts
│   └── seeds/
│       └── 20251010000001-add-evaluation-timeout-setting.ts
├── services/
│   └── ChatFlowServices/
│       ├── StartEvaluationFlowService.ts
│       └── CheckExpiredEvaluationsService.ts
└── jobs/
    └── CheckExpiredEvaluations.ts
```

### Modificados:
```
src/
├── models/
│   ├── Whatsapp.ts (+ evaluationChatFlowId)
│   └── Ticket.ts (+ isEvaluationFlow, evaluationStartedAt)
├── services/
│   ├── TicketServices/
│   │   └── UpdateTicketService.ts (intercepta fechamento)
│   └── ChatFlowServices/
│       └── VerifyStepsChatFlowTicket.ts (suporta avaliação)
├── jobs/
│   └── Index.ts (export novo job)
└── app/
    └── bull.ts (inicializa job)
```

## Suporte

Para dúvidas ou problemas, verifique os logs do sistema. O serviço de verificação de avaliações expiradas registra informações detalhadas a cada execução.

