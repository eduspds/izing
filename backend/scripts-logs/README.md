# 🔍 Scripts de Monitoramento - Tickets

## ⚡ Uso Rápido

### Monitoramento em Tempo Real (PM2) ⭐ Recomendado
```bash
# Navegar até o backend
cd /home/deployzdg/cognos-antigo/cognosbot-backend-backup

# Monitorar logs do PM2 (tempo real)
./scripts-logs/monitor_tickets_pm2.sh VBG-Backend
```

### Monitoramento de Arquivo (Histórico)
```bash
# Navegar até o backend
cd /home/deployzdg/cognos-antigo/cognosbot-backend-backup

# Monitorar logs gravados em arquivo
./scripts-logs/monitor_tickets.sh logs/app.logg
```

**Diferença**:
- `monitor_tickets_pm2.sh` - Logs em tempo real do PM2 (últimas horas)
- `monitor_tickets.sh` - Logs gravados em arquivo (pode estar desatualizado)

## 📚 Documentação

- **`COMANDOS_RAPIDOS.txt`** - Referência rápida de comandos
- **`COMO_USAR.md`** - Guia detalhado de uso
- **`README_MULTIPLAS_INSTANCIAS.md`** - Guia para múltiplas instâncias

## ⚠️ IMPORTANTE

**Os logs usam extensão `.logg` (com dois 'g'), não `.log`**

## 🎯 Quando Usar

- ✅ Logo após deploy
- ✅ Primeiras 24h: a cada 2-4 horas
- ✅ Ao receber reclamação de ticket fantasma
- ✅ Durante testes de mensagens agendadas

## 📊 Resultado Esperado

```
✅ Tickets Reabertos por Clientes: X
✅ Tickets Mantidos Fechados (Sistema): Y
✅ Sistema funcionando corretamente!
```

## 🆘 Ajuda Rápida

```bash
# Ver comandos rápidos
cat COMANDOS_RAPIDOS.txt

# Ver guia completo
cat COMO_USAR.md

# Listar logs disponíveis
ls -lah ../logs/
```

---

**Dica**: Execute `cat COMANDOS_RAPIDOS.txt` para referência rápida no terminal!
