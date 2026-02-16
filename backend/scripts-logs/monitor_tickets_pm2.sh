#!/bin/bash

###############################################################################
# Script de Monitoramento - Tickets via PM2
# Uso: ./monitor_tickets_pm2.sh [nome_processo_pm2]
#
# Este script monitora os logs do PM2 em tempo real (ainda não gravados em arquivo)
###############################################################################

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Nome do processo PM2 (padrão: VBG-Backend)
PM2_PROCESS="${1:-VBG-Backend}"

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 não encontrado. Instale com: npm install -g pm2${NC}"
    exit 1
fi

# Verificar se o processo existe
if ! pm2 list | grep -q "$PM2_PROCESS"; then
    echo -e "${RED}❌ Processo PM2 '$PM2_PROCESS' não encontrado${NC}"
    echo ""
    echo "Processos disponíveis:"
    pm2 list
    exit 1
fi

echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Monitoramento de Tickets via PM2 - $(date +"%d/%m %H:%M")    ║${NC}"
echo -e "${CYAN}║  Processo: $PM2_PROCESS${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Obter últimas 5000 linhas dos logs do PM2
echo -e "${BLUE}Analisando logs do PM2...${NC}"
TEMP_LOG=$(mktemp)
pm2 logs "$PM2_PROCESS" --lines 5000 --nostream > "$TEMP_LOG" 2>/dev/null

# 1. Tickets reabertos por mensagens de clientes
echo -e "${GREEN}✅ Tickets Reabertos por Clientes:${NC}"
CLIENT_REOPENED=$(grep -c "message from client" "$TEMP_LOG" 2>/dev/null || echo "0")
echo "   Total: $CLIENT_REOPENED tickets"
if [ "$CLIENT_REOPENED" -gt 0 ]; then
    echo "   Últimos 3:"
    grep "message from client" "$TEMP_LOG" | tail -3 | sed 's/^/   /'
fi
echo ""

# 2. Tickets que NÃO foram reabertos (mensagens do sistema)
echo -e "${GREEN}✅ Tickets Mantidos Fechados (Sistema):${NC}"
NOT_REOPENED=$(grep -c "reused ticket without reopening" "$TEMP_LOG" 2>/dev/null || echo "0")
echo "   Total: $NOT_REOPENED tickets"
if [ "$NOT_REOPENED" -gt 0 ]; then
    echo "   Últimos 3:"
    grep "reused ticket without reopening" "$TEMP_LOG" | tail -3 | sed 's/^/   /'
fi
echo ""

# 3. Mensagens agendadas
echo -e "${BLUE}📅 Mensagens Agendadas:${NC}"
SCHEDULED=$(grep -c "Message Schendule SendMessage" "$TEMP_LOG" 2>/dev/null || echo "0")
echo "   Total: $SCHEDULED mensagens"
if [ "$SCHEDULED" -gt 0 ]; then
    echo "   Últimos 3:"
    grep "Message Schendule SendMessage" "$TEMP_LOG" | tail -3 | sed 's/^/   /'
fi
echo ""

# 4. Ecos de mensagens agendadas
echo -e "${BLUE}🔄 Ecos de Mensagens Agendadas:${NC}"
ECHOES=$(grep -c "echo linked to scheduled message" "$TEMP_LOG" 2>/dev/null || echo "0")
echo "   Total: $ECHOES ecos"
if [ "$ECHOES" -gt 0 ]; then
    echo "   Últimos 3 (com status do ticket):"
    grep "echo linked to scheduled message" "$TEMP_LOG" | tail -3 | sed 's/^/   /'
fi
echo ""

# 5. Mensagens de campanha
echo -e "${BLUE}📢 Mensagens de Campanha:${NC}"
CAMPAIGN=$(grep -c "isCampaignMessage" "$TEMP_LOG" 2>/dev/null || echo "0")
echo "   Total: $CAMPAIGN mensagens"
echo ""

# 6. Verificar problemas
echo -e "${YELLOW}🔍 Verificação de Problemas:${NC}"
WRONG_REOPEN=$(grep "reused ticket set to pending" "$TEMP_LOG" | grep -c "fromMe=true" 2>/dev/null || echo "0")
if [ "$WRONG_REOPEN" -gt 0 ]; then
    echo -e "   ${RED}❌ PROBLEMA: $WRONG_REOPEN tickets reabertos incorretamente (fromMe=true)${NC}"
    grep "reused ticket set to pending" "$TEMP_LOG" | grep "fromMe=true" | tail -5 | sed 's/^/      /'
else
    echo -e "   ${GREEN}✅ Nenhum ticket reaberto incorretamente${NC}"
fi
echo ""

# 7. Análise de tickets fechados que receberam mensagens agendadas
if [ "$ECHOES" -gt 0 ]; then
    echo -e "${CYAN}📊 Análise de Mensagens Agendadas em Tickets Fechados:${NC}"
    CLOSED_TICKETS=$(grep "echo linked to scheduled message" "$TEMP_LOG" | grep -c "status=closed" 2>/dev/null || echo "0")
    OPEN_TICKETS=$(grep "echo linked to scheduled message" "$TEMP_LOG" | grep -c "status=open" 2>/dev/null || echo "0")
    
    echo "   Tickets fechados que receberam mensagem agendada: $CLOSED_TICKETS"
    echo "   Tickets abertos que receberam mensagem agendada:  $OPEN_TICKETS"
    
    if [ "$CLOSED_TICKETS" -gt 0 ]; then
        echo ""
        echo -e "   ${GREEN}✓${NC} Tickets fechados permaneceram fechados após mensagem agendada (correto!)"
    fi
    echo ""
fi

# 8. Resumo
echo -e "${CYAN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    RESUMO                          ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════╝${NC}"
echo "   Tickets reabertos (cliente):        $CLIENT_REOPENED  ← Cliente enviou mensagem"
echo "   Tickets mantidos fechados (sistema): $NOT_REOPENED  ← Mensagens do sistema não reabriram"
echo "   Mensagens agendadas enviadas:        $SCHEDULED  ← Total enviado"
echo "   Ecos recebidos:                      $ECHOES  ← Confirmações de envio"
echo "   Mensagens de campanha:               $CAMPAIGN  ← Total enviado"
echo ""

if [ "$CLOSED_TICKETS" -gt 0 ]; then
    echo -e "${GREEN}✅ Tickets fechados receberam $CLOSED_TICKETS mensagem(ns) agendada(s) e permaneceram fechados!${NC}"
    echo ""
fi

if [ "$WRONG_REOPEN" -eq 0 ]; then
    echo -e "${GREEN}✅ Sistema funcionando corretamente via PM2!${NC}"
else
    echo -e "${RED}⚠️  Foram encontrados problemas! Verifique acima.${NC}"
fi

# Limpar arquivo temporário
rm -f "$TEMP_LOG"

echo ""
echo -e "${CYAN}Monitoramento PM2 concluído em $(date +"%H:%M:%S")${NC}"
echo ""
echo -e "${YELLOW}💡 Dica: Para monitorar logs já gravados em arquivo, use:${NC}"
echo "   ./monitor_tickets.sh logs/app.logg"
