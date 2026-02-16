# 📖 Guia Rápido - Monitor de Tickets

## 🎯 Localização do Script

```
/home/deployzdg/cognos-antigo/cognosbot-backend-backup/scripts-logs/monitor_tickets.sh
```

**Nota**: Cada instância do backend tem seu próprio script neste mesmo caminho relativo.

## ⚡ Uso Rápido

### Monitorar Esta Instância

```bash
# Navegar até o backend
cd /home/deployzdg/cognos-antigo/cognosbot-backend-backup

# Executar monitoramento (os logs usam extensão .logg)
./scripts-logs/monitor_tickets.sh logs/app.logg
```

### Com Caminho Absoluto do Log

```bash
./scripts-logs/monitor_tickets.sh /var/log/cognos/app.logg
```

### Sem Parâmetro (usa padrão /var/log/app.log - ajuste conforme necessário)

```bash
# Nota: Se seus logs usam extensão .logg, sempre passe o caminho completo
./scripts-logs/monitor_tickets.sh logs/app.logg
```

## 📊 O Que o Script Mostra

1. **✅ Tickets Reabertos por Clientes** - Comportamento normal, esperado
2. **✅ Tickets Mantidos Fechados** - Mensagens do sistema que não reabriram tickets
3. **⏰ Tickets por Inatividade** - Tickets transferidos por timeout do bot
4. **📢 Mensagens de Campanha** - Total de campanhas enviadas
5. **📅 Mensagens Agendadas** - Total de mensagens schedule
6. **🔍 Verificação de Problemas** - Detecta reaberturas incorretas

## 🚦 Interpretando Resultados

### ✅ Tudo OK
```
✅ Tickets Reabertos por Clientes: 25
✅ Tickets Mantidos Fechados (Sistema): 150
✅ Nenhum ticket reaberto incorretamente
✅ Sistema funcionando corretamente!
```

### ❌ Problema Detectado
```
❌ PROBLEMA: 15 tickets reabertos incorretamente (fromMe=true)
⚠️  Foram encontrados 1 problema(s)
```

**Ação**: Verificar logs detalhados e reportar o problema.

## 🔄 Múltiplas Instâncias

### Monitorar Todas as Instâncias

Use o script agregado:

```bash
cd /home/deployzdg/cognos-antigo
./monitor_todas_instancias.sh
```

**Nota**: Edite o script e configure suas instâncias no array `INSTANCES[]`.

## ⏰ Quando Executar

### 1. Logo Após Deploy (CRÍTICO)
```bash
./scripts-logs/monitor_tickets.sh logs/app.log
```

### 2. Primeiras 24 Horas (a cada 2-4 horas)
Configure cron ou execute manualmente.

### 3. Primeira Semana (1-2x ao dia)
```bash
# Manhã
./scripts-logs/monitor_tickets.sh logs/app.log > /tmp/monitor_manha.log

# Tarde
./scripts-logs/monitor_tickets.sh logs/app.log > /tmp/monitor_tarde.log
```

### 4. Ao Receber Reclamação
Execute imediatamente para coletar evidências.

## 🤖 Automação com Cron

### Para Esta Instância

```bash
crontab -e
```

Adicione:
```bash
# Monitorar a cada 2 horas
0 */2 * * * /home/deployzdg/cognos-antigo/cognosbot-backend-backup/scripts-logs/monitor_tickets.sh /var/log/cognos/app.log > /tmp/monitor_$(date +\%Y\%m\%d_\%H).log 2>&1
```

### Para Todas as Instâncias

```bash
# Monitorar todas a cada 4 horas
0 */4 * * * /home/deployzdg/cognos-antigo/monitor_todas_instancias.sh > /tmp/monitor_todas_$(date +\%Y\%m\%d_\%H).log 2>&1
```

## 📝 Exemplos Práticos

### Exemplo 1: Teste Após Deploy

```bash
# 1. Deploy do backend
pm2 restart cognosbot-backend

# 2. Aguardar 5 minutos

# 3. Executar monitoramento
cd /home/deployzdg/cognos-antigo/cognosbot-backend-backup
./scripts-logs/monitor_tickets.sh logs/app.logg

# 4. Verificar se apareceu "✅ Sistema funcionando corretamente!"
```

### Exemplo 2: Investigar Problema Reportado

```bash
# 1. Executar monitoramento
./scripts-logs/monitor_tickets.sh logs/app.logg > /tmp/investigacao.log

# 2. Ver resultado
cat /tmp/investigacao.log

# 3. Se houver problema, ver logs detalhados
tail -200 logs/app.logg | grep "reused ticket"

# 4. Procurar por ticket específico
grep "ticketId=123" logs/app.logg
```

### Exemplo 3: Comparar Antes e Depois de Mudança

```bash
# Antes da mudança
./scripts-logs/monitor_tickets.sh logs/app.logg > /tmp/antes.log

# (Fazer mudança no sistema)

# Após 30 minutos
./scripts-logs/monitor_tickets.sh logs/app.logg > /tmp/depois.log

# Comparar
diff /tmp/antes.log /tmp/depois.log
```

## 🔧 Troubleshooting

### Erro: "Arquivo de log não encontrado"

```bash
# Verificar se o log existe (nota: extensão .logg com dois 'g')
ls -la logs/app.logg

# Usar caminho correto
./scripts-logs/monitor_tickets.sh logs/app.logg

# Ou caminho absoluto
./scripts-logs/monitor_tickets.sh /caminho/completo/logs/app.logg
```

### Erro: "Permission denied"

```bash
chmod +x scripts-logs/monitor_tickets.sh
```

### Nenhum Resultado Aparece

```bash
# Verificar se há logs recentes
tail -50 logs/app.logg

# Verificar quais logs existem
ls -lah logs/

# Verificar se backend está rodando
pm2 list
# ou
ps aux | grep node
```

## 📚 Documentação Completa

- **Este diretório**: `/home/deployzdg/cognos-antigo/cognosbot-backend-backup/scripts-logs/`
  - `README_MULTIPLAS_INSTANCIAS.md` - Guia para múltiplas instâncias
  - `COMO_USAR.md` - Este arquivo

- **Diretório raiz**: `/home/deployzdg/cognos-antigo/`
  - `README_CORRECOES.md` - Índice geral
  - `CORRECAO_TICKETS_FANTASMA.md` - Documentação técnica completa
  - `RESUMO_CORRECOES.md` - Resumo executivo
  - `INSTRUCOES_DEPLOY.md` - Guia de deploy

## 🆘 Precisa de Ajuda?

1. Leia `README_MULTIPLAS_INSTANCIAS.md` neste diretório
2. Consulte a documentação completa em `/home/deployzdg/cognos-antigo/`
3. Execute o script e verifique a seção "Verificação de Problemas"
4. Capture logs detalhados antes de reportar

---

**Última Atualização**: 2026-02-03  
**Versão**: 1.0
