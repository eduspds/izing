-- Script para limpar relacionamentos com departamentos (queues) que não existem mais
-- Execute este script se você tiver erros de foreign key constraint em UsersQueues ou UserManagerQueues

-- 1. Verificar relacionamentos inválidos em UsersQueues
SELECT 
    uq.id,
    uq.userId,
    uq.queueId,
    u.name AS userName
FROM "UsersQueues" uq
LEFT JOIN "Queues" q ON uq.queueId = q.id
LEFT JOIN "Users" u ON uq.userId = u.id
WHERE q.id IS NULL;

-- 2. Verificar relacionamentos inválidos em UserManagerQueues
SELECT 
    umq.id,
    umq.userId,
    umq.queueId,
    u.name AS userName
FROM "UserManagerQueues" umq
LEFT JOIN "Queues" q ON umq.queueId = q.id
LEFT JOIN "Users" u ON umq.userId = u.id
WHERE q.id IS NULL;

-- 3. Remover relacionamentos inválidos em UsersQueues (CUIDADO: só execute se tiver certeza)
-- DELETE FROM "UsersQueues" 
-- WHERE queueId NOT IN (SELECT id FROM "Queues");

-- 4. Remover relacionamentos inválidos em UserManagerQueues (CUIDADO: só execute se tiver certeza)
-- DELETE FROM "UserManagerQueues" 
-- WHERE queueId NOT IN (SELECT id FROM "Queues");

-- 5. Verificar se ficou algum relacionamento inválido após a limpeza
SELECT 
    'UsersQueues' AS tabela,
    COUNT(*) AS registros_invalidos
FROM "UsersQueues" uq
LEFT JOIN "Queues" q ON uq.queueId = q.id
WHERE q.id IS NULL

UNION ALL

SELECT 
    'UserManagerQueues' AS tabela,
    COUNT(*) AS registros_invalidos
FROM "UserManagerQueues" umq
LEFT JOIN "Queues" q ON umq.queueId = q.id
WHERE q.id IS NULL;

