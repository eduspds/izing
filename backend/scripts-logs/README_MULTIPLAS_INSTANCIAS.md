# 🔄 Monitoramento em Ambiente com Múltiplas Instâncias

## 📌 Visão Geral

Este diretório contém o script de monitoramento `monitor_tickets.sh` que deve ser **específico para cada instância** do backend. Cada instância monitora seus próprios logs.

## 🏗️ Estrutura Recomendada

```
/home/deployzdg/cognos-antigo/
├── cognosbot-backend-instancia1/
│   ├── scripts-logs/
│   │   └── monitor_tickets.sh
│   └── logs/
│       └── app.log
├── cognosbot-backend-instancia2/
│   ├── scripts-logs/
│   │   └── monitor_tickets.sh
│   └── logs/
│       └── app.log
└── cognosbot-backend-instancia3/
    ├── scripts-logs/
    │   └── monitor_tickets.sh
    └── logs/
        └── app.log
```

## 🚀 Como Usar

### 1️⃣ Para Uma Instância Específica

```bash
# Navegar até a instância
cd /home/deployzdg/cognos-antigo/cognosbot-backend-backup

# Executar monitoramento desta instância
./scripts-logs/monitor_tickets.sh logs/app.log

# Ou com caminho absoluto do log
./scripts-logs/monitor_tickets.sh /var/log/cognos/backend1/app.log
```

### 2️⃣ Para Todas as Instâncias (Script Agregado)

Crie um script mestre para monitorar todas as instâncias:

```bash
#!/bin/bash
# /home/deployzdg/cognos-antigo/monitor_todas_instancias.sh

echo "=========================================="
echo "  Monitoramento de Todas as Instâncias"
echo "=========================================="
echo ""

# Instância 1
echo "🔵 Backend Instância 1:"
cd /home/deployzdg/cognos-antigo/cognosbot-backend-instancia1
./scripts-logs/monitor_tickets.sh logs/app.log
echo ""
echo "----------------------------------------"
echo ""

# Instância 2
echo "🔵 Backend Instância 2:"
cd /home/deployzdg/cognos-antigo/cognosbot-backend-instancia2
./scripts-logs/monitor_tickets.sh logs/app.log
echo ""
echo "----------------------------------------"
echo ""

# Instância 3
echo "🔵 Backend Instância 3:"
cd /home/deployzdg/cognos-antigo/cognosbot-backend-instancia3
./scripts-logs/monitor_tickets.sh logs/app.log
echo ""
echo "=========================================="
```

**Tornar executável:**
```bash
chmod +x /home/deployzdg/cognos-antigo/monitor_todas_instancias.sh
```

**Usar:**
```bash
/home/deployzdg/cognos-antigo/monitor_todas_instancias.sh
```

### 3️⃣ Monitoramento Automático com Cron

Configure um cron job **para cada instância**:

```bash
crontab -e
```

Adicione (ajustar caminhos conforme suas instâncias):

```bash
# Backend Instância 1 - A cada 2 horas
0 */2 * * * /home/deployzdg/cognos-antigo/cognosbot-backend-instancia1/scripts-logs/monitor_tickets.sh /var/log/cognos/backend1/app.log > /tmp/monitor_backend1_$(date +\%Y\%m\%d_\%H).log 2>&1

# Backend Instância 2 - A cada 2 horas
0 */2 * * * /home/deployzdg/cognos-antigo/cognosbot-backend-instancia2/scripts-logs/monitor_tickets.sh /var/log/cognos/backend2/app.log > /tmp/monitor_backend2_$(date +\%Y\%m\%d_\%H).log 2>&1

# Backend Instância 3 - A cada 2 horas
0 */2 * * * /home/deployzdg/cognos-antigo/cognosbot-backend-instancia3/scripts-logs/monitor_tickets.sh /var/log/cognos/backend3/app.log > /tmp/monitor_backend3_$(date +\%Y\%m\%d_\%H).log 2>&1

# Monitoramento agregado (todas as instâncias) - A cada 4 horas
0 */4 * * * /home/deployzdg/cognos-antigo/monitor_todas_instancias.sh > /tmp/monitor_todas_$(date +\%Y\%m\%d_\%H).log 2>&1
```

## 📊 Identificação de Instâncias

### Adicionar Identificação no Output

Você pode modificar cada script para identificar a instância:

```bash
# No início do monitor_tickets.sh de cada instância, adicionar:
INSTANCE_NAME="Backend-1"  # Mudar para Backend-2, Backend-3, etc.

# E alterar a linha do título:
echo -e "${BLUE}  Monitoramento de Tickets [$INSTANCE_NAME] - $(date)${NC}"
```

## 🎯 Casos de Uso por Instância

### Cenário 1: Problema em Uma Instância Específica

```bash
# Usuário reporta problema em tickets da instância 2
cd /home/deployzdg/cognos-antigo/cognosbot-backend-instancia2
./scripts-logs/monitor_tickets.sh logs/app.log

# Se encontrar problema, ver logs detalhados
tail -500 logs/app.log | grep "reused ticket"
```

### Cenário 2: Comparar Comportamento Entre Instâncias

```bash
# Monitorar instância 1
cd /home/deployzdg/cognos-antigo/cognosbot-backend-instancia1
./scripts-logs/monitor_tickets.sh logs/app.log > /tmp/inst1.log

# Monitorar instância 2
cd /home/deployzdg/cognos-antigo/cognosbot-backend-instancia2
./scripts-logs/monitor_tickets.sh logs/app.log > /tmp/inst2.log

# Comparar
echo "=== Instância 1 ==="
grep "Total:" /tmp/inst1.log
echo ""
echo "=== Instância 2 ==="
grep "Total:" /tmp/inst2.log
```

### Cenário 3: Deploy Gradual (Uma Instância por Vez)

```bash
# 1. Deploy na instância 1
# 2. Monitorar por 1 hora
cd /home/deployzdg/cognos-antigo/cognosbot-backend-instancia1
watch -n 600 './scripts-logs/monitor_tickets.sh logs/app.log'

# 3. Se OK, deploy na instância 2
# 4. Monitorar ambas
/home/deployzdg/cognos-antigo/monitor_todas_instancias.sh

# 5. Se OK, deploy na instância 3
```

## 🔍 Logs Separados por Instância

### Estrutura Recomendada de Logs

```bash
/var/log/cognos/
├── backend1/
│   ├── app.log
│   ├── error.log
│   └── access.log
├── backend2/
│   ├── app.log
│   ├── error.log
│   └── access.log
└── backend3/
    ├── app.log
    ├── error.log
    └── access.log
```

### Configuração de Rotação de Logs

Crie `/etc/logrotate.d/cognos-backends`:

```bash
/var/log/cognos/*/app.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 cognos cognos
    sharedscripts
    postrotate
        # Notificar aplicação sobre rotação (se necessário)
    endscript
}
```

## 📈 Dashboard Consolidado (Opcional)

### Script de Resumo Geral

Crie `/home/deployzdg/cognos-antigo/dashboard_geral.sh`:

```bash
#!/bin/bash

echo "╔════════════════════════════════════════════════════╗"
echo "║      Dashboard Geral - Todas as Instâncias        ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

TOTAL_REOPENED=0
TOTAL_MAINTAINED=0
TOTAL_PROBLEMS=0

for instance in instancia1 instancia2 instancia3; do
    LOG_FILE="/home/deployzdg/cognos-antigo/cognosbot-backend-${instance}/logs/app.log"
    
    if [ -f "$LOG_FILE" ]; then
        REOPENED=$(grep -c "message from client" "$LOG_FILE" 2>/dev/null || echo "0")
        MAINTAINED=$(grep -c "reused ticket without reopening" "$LOG_FILE" 2>/dev/null || echo "0")
        PROBLEMS=$(grep "reused ticket set to pending" "$LOG_FILE" | grep -c "fromMe=true" 2>/dev/null || echo "0")
        
        echo "📊 $instance:"
        echo "   ✅ Reabertos (cliente): $REOPENED"
        echo "   ✅ Mantidos fechados:    $MAINTAINED"
        echo "   ⚠️  Problemas:           $PROBLEMS"
        echo ""
        
        TOTAL_REOPENED=$((TOTAL_REOPENED + REOPENED))
        TOTAL_MAINTAINED=$((TOTAL_MAINTAINED + MAINTAINED))
        TOTAL_PROBLEMS=$((TOTAL_PROBLEMS + PROBLEMS))
    else
        echo "⚠️  $instance: Log não encontrado"
        echo ""
    fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TOTAIS:"
echo "   Tickets reabertos (cliente):    $TOTAL_REOPENED"
echo "   Tickets mantidos fechados:      $TOTAL_MAINTAINED"
echo "   PROBLEMAS detectados:           $TOTAL_PROBLEMS"
echo ""

if [ "$TOTAL_PROBLEMS" -eq 0 ]; then
    echo "✅ Todas as instâncias funcionando corretamente!"
else
    echo "❌ ATENÇÃO: Problemas detectados em uma ou mais instâncias!"
fi
```

**Tornar executável:**
```bash
chmod +x /home/deployzdg/cognos-antigo/dashboard_geral.sh
```

## ⚡ Comandos Rápidos

### Monitorar Instância Atual
```bash
./scripts-logs/monitor_tickets.sh logs/app.log
```

### Monitorar Todas as Instâncias
```bash
/home/deployzdg/cognos-antigo/monitor_todas_instancias.sh
```

### Ver Dashboard Geral
```bash
/home/deployzdg/cognos-antigo/dashboard_geral.sh
```

### Verificar Última Execução Automática
```bash
# Ver últimos resultados do cron
ls -lt /tmp/monitor_* | head -10
cat /tmp/monitor_backend1_$(date +%Y%m%d_%H).log
```

## 🎯 Checklist por Instância

Após deploy em cada instância:

### Instância 1
- [ ] Script copiado para `scripts-logs/`
- [ ] Permissão de execução configurada
- [ ] Teste manual executado
- [ ] Cron configurado
- [ ] Logs sendo gerados

### Instância 2
- [ ] Script copiado para `scripts-logs/`
- [ ] Permissão de execução configurada
- [ ] Teste manual executado
- [ ] Cron configurado
- [ ] Logs sendo gerados

### Instância 3
- [ ] Script copiado para `scripts-logs/`
- [ ] Permissão de execução configurada
- [ ] Teste manual executado
- [ ] Cron configurado
- [ ] Logs sendo gerados

## 📞 Troubleshooting

### Problema: Script não encontra logs

```bash
# Verificar caminho do log
ls -la logs/app.log

# Executar com caminho absoluto
./scripts-logs/monitor_tickets.sh /caminho/completo/para/logs/app.log
```

### Problema: Permissão negada

```bash
chmod +x scripts-logs/monitor_tickets.sh
```

### Problema: Logs vazios em uma instância

```bash
# Verificar se backend está rodando
pm2 list | grep backend

# Verificar configuração de logs do backend
cat .env | grep LOG
```

---

**Última Atualização**: 2026-02-03  
**Documentação Principal**: `/home/deployzdg/cognos-antigo/README_CORRECOES.md`
