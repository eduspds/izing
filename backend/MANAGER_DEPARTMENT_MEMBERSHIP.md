# Gerenciamento de Departamentos - Gerentes

## Problema Identificado

No sistema anterior, quando um usuário era promovido a gerente de um departamento, ele era adicionado apenas à tabela `UserManagerQueues` (gerencia o departamento), mas **não** à tabela `UsersQueues` (é membro do departamento).

Isso causava inconsistências onde um gerente poderia gerenciar um departamento mas não ter acesso a ele como membro.

## Solução Implementada

### 1. Novos Usuários (a partir de agora)

**Arquivos modificados:**
- `src/services/UserServices/CreateUserService.ts`
- `src/services/UserServices/UpdateUserService.ts`

**Comportamento:**
Quando um usuário vira gerente de um departamento:
1. É adicionado ao `UserManagerQueues` (gerencia o departamento)
2. **Automaticamente** é adicionado ao `UsersQueues` (é membro do departamento)
3. Se já for membro, não duplica o registro

### 2. Usuários Existentes (correção automática)

**Arquivo criado:**
- `src/services/UserServices/FixManagerDepartmentMembership.ts`

**Comportamento:**
- Executa **automaticamente** toda vez que o backend inicia
- Verifica todos os gerentes em `UserManagerQueues`
- Para cada gerente, verifica se é membro em `UsersQueues`
- Se não for membro, adiciona automaticamente
- Não lança erro se falhar (não impede o backend de iniciar)

**Logs gerados:**
```
Verificando consistência de gerentes e departamentos...
Encontrados 5 relacionamentos de gerentes com departamentos
Gerente 10 já é membro do departamento 1
Adicionando gerente 15 como membro do departamento 2
Adicionando gerente 15 como membro do departamento 3
Verificação concluída: 2 gerentes adicionados, 3 já eram membros
```

## Cenários Suportados

### Cenário 1: Usuário vira gerente de um departamento que não é membro
- ✅ Adicionado ao `UserManagerQueues`
- ✅ Adicionado automaticamente ao `UsersQueues`

### Cenário 2: Usuário já é membro e vira gerente
- ✅ Adicionado ao `UserManagerQueues`
- ✅ Já existe no `UsersQueues` (não duplica)

### Cenário 3: Usuário para de ser gerente
- ✅ Removido do `UserManagerQueues`
- ✅ **Continua** no `UsersQueues` (ainda é membro)

### Cenário 4: Usuário é membro de um departamento e gerente de outro
- ✅ `UsersQueues`: departamento A (membro)
- ✅ `UsersQueues`: departamento B (membro)
- ✅ `UserManagerQueues`: departamento B (gerente)

## Integração

A verificação é executada no processo de inicialização do backend:

**Arquivo:** `src/app/boot.ts`

```typescript
export default async function bootstrap(app: Application): Promise<void> {
  await waitForPostgresConnection();
  await express(app);
  await database(app);

  // Verificar e corrigir consistência de gerentes e departamentos
  await FixManagerDepartmentMembership();

  await modules(app);
  await bullMQ(app);
}
```

## Vantagens

1. ✅ **Automático**: Não requer migração manual do banco de dados
2. ✅ **Seguro**: Verifica antes de inserir, não duplica registros
3. ✅ **Transparente**: Logs detalhados do que está sendo feito
4. ✅ **Resiliente**: Não impede o backend de iniciar se houver erro
5. ✅ **Idempotente**: Pode ser executado múltiplas vezes sem problemas
6. ✅ **Auto-corretivo**: Corrige inconsistências existentes automaticamente

## Testes Recomendados

1. Criar um novo gerente e verificar se foi adicionado às duas tabelas
2. Promover um usuário existente a gerente e verificar se foi adicionado às duas tabelas
3. Rebaixar um gerente e verificar se continua como membro
4. Reiniciar o backend e verificar os logs de verificação
5. Verificar usuário que é membro de um departamento e gerente de outro

## Monitoramento

Para verificar a consistência, execute:

```sql
-- Gerentes que NÃO são membros dos departamentos que gerenciam (deve retornar 0)
SELECT umq.userId, umq.queueId 
FROM UserManagerQueues umq
LEFT JOIN UsersQueues uq ON umq.userId = uq.userId AND umq.queueId = uq.queueId
WHERE uq.id IS NULL;
```

