#!/bin/bash

###############################################################################
# Script de Monitoramento - Tickets Fantasma
# Uso: ./monitor_tickets.sh [caminho_para_logs]
###############################################################################

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Caminho padrão dos logs (ajustar conforme necessário)
LOG_PATH="${1:-/var/log/app.log}"

if [ ! -f "$LOG_PATH" ]; then
    echo -e "${RED}❌ Arquivo de log não encontrado: $LOG_PATH${NC}"
    echo "Uso: ./monitor_tickets.sh [caminho_para_logs]"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Monitoramento de Tickets - $(date)${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Tickets reabertos por mensagens de clientes (comportamento esperado)
echo -e "${GREEN}✅ Tickets Reabertos por Clientes:${NC}"
CLIENT_REOPENED=$(grep -c "message from client" "$LOG_PATH" 2>/dev/null || echo "0")
echo "   Total: $CLIENT_REOPENED tickets"
if [ "$CLIENT_REOPENED" -gt 0 ]; then
    echo "   Últimos 5:"
    grep "message from client" "$LOG_PATH" | tail -5 | sed 's/^/   /'
fi
echo ""

# 2. Tickets que NÃO foram reabertos (mensagens do sistema)
echo -e "${GREEN}✅ Tickets Mantidos Fechados (Sistema):${NC}"
NOT_REOPENED=$(grep -c "reused ticket without reopening" "$LOG_PATH" 2>/dev/null || echo "0")
echo "   Total: $NOT_REOPENED tickets"
if [ "$NOT_REOPENED" -gt 0 ]; then
    echo "   Últimos 5:"
    grep "reused ticket without reopening" "$LOG_PATH" | tail -5 | sed 's/^/   /'
fi
echo ""

# 3. Tickets processados por inatividade
echo -e "${YELLOW}⏰ Tickets Processados por Inatividade:${NC}"
INACTIVE=$(grep -c "Processing inactive ticket" "$LOG_PATH" 2>/dev/null || echo "0")
echo "   Total: $INACTIVE tickets"
if [ "$INACTIVE" -gt 0 ]; then
    echo "   Últimos 3:"
    grep "Processing inactive ticket" "$LOG_PATH" | tail -3 | sed 's/^/   /'
fi
echo ""

# 4. Mensagens de campanha
echo -e "${BLUE}📢 Mensagens de Campanha:${NC}"
CAMPAIGN=$(grep -c "isCampaignMessage" "$LOG_PATH" 2>/dev/null || echo "0")
echo "   Total: $CAMPAIGN mensagens"
echo ""

# 5. Mensagens agendadas
echo -e "${BLUE}📅 Mensagens Agendadas:${NC}"
# Buscar por múltiplos padrões que indicam mensagem agendada
SCHEDULED=$(grep -E "Message Schendule SendMessage|echo linked to scheduled message" "$LOG_PATH" 2>/dev/null | grep -c "Message Schendule SendMessage" || echo "0")
echo "   Total: $SCHEDULED mensagens"
if [ "$SCHEDULED" -gt 0 ]; then
    echo "   Últimos 3:"
    grep "Message Schendule SendMessage" "$LOG_PATH" | tail -3 | sed 's/^/   /'
fi
echo ""

# 6. Verificar possíveis problemas
echo -e "${YELLOW}🔍 Verificação de Problemas:${NC}"
PROBLEM_COUNT=0

# Verificar se há reaberturas com fromMe=true (problema!)
WRONG_REOPEN=$(grep "reused ticket set to pending" "$LOG_PATH" | grep -c "fromMe=true" 2>/dev/null || echo "0")
if [ "$WRONG_REOPEN" -gt 0 ]; then
    echo -e "   ${RED}❌ PROBLEMA: $WRONG_REOPEN tickets reabertos incorretamente (fromMe=true)${NC}"
    grep "reused ticket set to pending" "$LOG_PATH" | grep "fromMe=true" | tail -5 | sed 's/^/      /'
    PROBLEM_COUNT=$((PROBLEM_COUNT + 1))
else
    echo -e "   ${GREEN}✅ Nenhum ticket reaberto incorretamente${NC}"
fi
echo ""

# 7. Resumo geral
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Resumo:${NC}"
echo -e "${BLUE}========================================${NC}"
echo "   Tickets reabertos (cliente):        $CLIENT_REOPENED  ← Cliente enviou mensagem (OK)"
echo "   Tickets mantidos fechados (sistema): $NOT_REOPENED  ← Mensagens do sistema não reabriram (OK)"
echo "   Tickets inativos processados:        $INACTIVE  ← Transferidos por timeout"
echo "   Mensagens de campanha enviadas:      $CAMPAIGN  ← Total de campanhas enviadas"
echo "   Mensagens agendadas enviadas:        $SCHEDULED  ← Total de schedules enviadas"
echo ""
echo -e "${YELLOW}📌 IMPORTANTE:${NC}"
echo "   • 'Mensagens agendadas' = quantidade ENVIADA (não é quantidade de reaberturas)"
echo "   • 'Tickets mantidos fechados' = tickets que NÃO reabriram (comportamento correto)"
echo ""

if [ "$PROBLEM_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ Sistema funcionando corretamente!${NC}"
    
    # Mostrar análise de correlação
    if [ "$SCHEDULED" -gt 0 ] || [ "$CAMPAIGN" -gt 0 ]; then
        echo ""
        echo -e "${CYAN}📊 Análise de Comportamento:${NC}"
        if [ "$NOT_REOPENED" -gt 0 ]; then
            echo -e "   ${GREEN}✓${NC} Mensagens do sistema enviadas sem reabrir tickets (correto!)"
        fi
        if [ "$SCHEDULED" -gt 0 ]; then
            echo -e "   ${GREEN}✓${NC} $SCHEDULED mensagem(ns) agendada(s) processada(s)"
        fi
        if [ "$CAMPAIGN" -gt 0 ]; then
            echo -e "   ${GREEN}✓${NC} $CAMPAIGN mensagem(ns) de campanha processada(s)"
        fi
    fi
else
    echo -e "${RED}⚠️  Foram encontrados $PROBLEM_COUNT problema(s)${NC}"
    echo -e "${YELLOW}Verifique a documentação em CORRECAO_TICKETS_FANTASMA.md${NC}"
fi
echo ""

# 8. Estatísticas por hora (últimas 24h)
echo -e "${BLUE}📊 Tickets Reabertos por Hora (últimas 24h):${NC}"
grep "message from client" "$LOG_PATH" | \
  grep -oP '\d{4}-\d{2}-\d{2}T\d{2}' | \
  sort | uniq -c | tail -24 | \
  awk '{printf "   %s: %d tickets\n", $2, $1}'
echo ""

echo -e "${GREEN}Monitoramento concluído em $(date)${NC}"
