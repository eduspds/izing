-- Script para verificar departamentos (queues) existentes no banco

-- 1. Listar todos os departamentos
SELECT 
    id,
    queue AS nome,
    "tenantId",
    color,
    "createdAt"
FROM "Queues"
ORDER BY id;

-- 2. Verificar se o departamento ID 3 existe
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM "Queues" WHERE id = 3) 
        THEN 'Departamento ID 3 EXISTE' 
        ELSE 'Departamento ID 3 NÃO EXISTE' 
    END AS resultado;

-- 3. Verificar relacionamentos com departamento inexistente (ID 3)
SELECT 
    'UsersQueues' AS tabela,
    COUNT(*) AS total_relacionamentos
FROM "UsersQueues"
WHERE queueId = 3

UNION ALL

SELECT 
    'UserManagerQueues' AS tabela,
    COUNT(*) AS total_relacionamentos
FROM "UserManagerQueues"
WHERE queueId = 3;

-- 4. Ver usuários e seus departamentos atuais
SELECT 
    u.id AS user_id,
    u.name AS user_name,
    u.profile,
    COALESCE(
        string_agg(DISTINCT q.queue, ', ' ORDER BY q.queue), 
        'Sem departamentos'
    ) AS departamentos
FROM "Users" u
LEFT JOIN "UsersQueues" uq ON u.id = uq.userId
LEFT JOIN "Queues" q ON uq.queueId = q.id
WHERE u."tenantId" = 1
GROUP BY u.id, u.name, u.profile
ORDER BY u.id;

