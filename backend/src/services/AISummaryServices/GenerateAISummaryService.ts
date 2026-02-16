import { GoogleGenerativeAI } from '@google/generative-ai';
import AISummary from '../../models/AISummary';
import AppError from '../../errors/AppError';

interface Request {
  ticketId: number;
  messages: any[];
  tenantId: number;
}

const GenerateAISummaryService = async ({
  ticketId,
  messages,
  tenantId
}: Request): Promise<AISummary> => {
  // Verificar se já existe um resumo para este ticket
  const existingSummary = await AISummary.findOne({
    where: { ticketId, tenantId }
  });

  // Se existe resumo, deletar para forçar regeneração (temporário para debug)
  if (existingSummary) {
    console.log('📝 Resumo existente encontrado, deletando para regenerar:', existingSummary.id);
    await existingSummary.destroy();
  }

  // Verificar se a API key está configurada
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  console.log('🤖 Configuração do Gemini:', { apiKey: apiKey ? 'Configurada' : 'Não configurada', model });

  if (!apiKey) {
    throw new AppError("GEMINI_API_KEY não configurada", 500);
  }

  try {
    // Inicializar o cliente do Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelInstance = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash', // Modelo correto
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048, // Aumentado para permitir resumos maiores
      },
      systemInstruction: "Você é um assistente especializado em resumir conversas de atendimento ao cliente. Sempre responda em português brasileiro de forma clara, objetiva e concisa."
    });

    // Preparar as mensagens para o prompt
    console.log('📝 Mensagens recebidas:', messages.length);
    console.log('📝 Primeira mensagem:', messages[0]);
    
    if (!messages || messages.length === 0) {
      throw new AppError("Nenhuma mensagem encontrada para gerar resumo", 400);
    }

    const messagesText = messages
      .slice(0, 100) // Primeiras 100 mensagens
      .map((msg, index) => {
        try {
          const timestamp = msg.timestamp ?
            new Date(msg.timestamp).toLocaleString('pt-BR') :
            new Date().toLocaleString('pt-BR');

          // Identificar claramente se é Cliente ou Atendente
          const sender = msg.fromMe ? 'ATENDENTE' : 'CLIENTE';
          const senderName = msg.fromMe ? 
            (msg.user?.name || 'Atendente') : 
            (msg.contact?.name || msg.name || 'Cliente');
          
          const content = msg.body || msg.message || msg.text || '[Mensagem sem conteúdo]';

          return `[${timestamp}] ${sender} (${senderName}): ${content}`;
        } catch (error) {
          console.error(`Erro ao processar mensagem ${index}:`, error);
          return `[Erro] Mensagem ${index + 1}: [Não foi possível processar]`;
        }
      })
      .join('\n');

    // Prompt otimizado para o Gemini
    const prompt = `Analise a conversa de atendimento a seguir e gere um resumo conciso em português do Brasil (máximo de 100 palavras).

    ${messagesText}
    
    O resumo deve abordar os principais assuntos discutidos e o desfecho do atendimento. Ao final, classifique a satisfação do cliente em uma das três categorias: Satisfeito, Neutro ou Insatisfeito.
    
    Exemplo de resposta:
    "O cliente entrou em contato para resolver [problema principal]. Após [principais pontos da conversa], o problema foi [resolvido/não resolvido/parcialmente resolvido].
    Satisfação do Cliente: [Satisfeito/Neutro/Insatisfeito]"`;

    // Gerar resumo com IA
    console.log('🤖 Enviando prompt para Gemini...');
    const result = await modelInstance.generateContent(prompt);
    const response = await result.response;
    
    // Verificar se há bloqueios de segurança
    console.log('🔍 Candidatos de resposta:', result.response.candidates?.length || 0);
    console.log('🔍 Status da resposta:', result.response.candidates?.[0]?.finishReason);
    
    const summaryText = response.text();
    
    console.log('📝 Texto do resumo gerado:', summaryText ? `${summaryText.substring(0, 100)}...` : 'VAZIO!');
    console.log('📝 Tamanho do texto:', summaryText?.length || 0);
    
    if (!summaryText || summaryText.trim().length === 0) {
      throw new AppError("O modelo não gerou um resumo válido. Verifique se as mensagens contêm conteúdo apropriado.", 500);
    }

    // Salvar no banco de dados
    const summary = await AISummary.create({
      ticketId,
      tenantId,
      text: summaryText,
      messageCount: messages.length,
      model: model
    });
    
    console.log('💾 Resumo salvo no banco com ID:', summary.id);
    console.log('💾 Texto salvo (primeiros 100 chars):', summary.text ? `${summary.text.substring(0, 100)}...` : 'VAZIO!');

    console.log(`✅ Resumo de IA gerado para ticket ${ticketId}:`, {
      summaryId: summary.id,
      messageCount: messages.length,
      model: model
    });

    return summary;
  } catch (error) {
    console.error('❌ Erro ao gerar resumo com IA:', error);
    
    if (error.message.includes('API key')) {
      throw new AppError("Erro de autenticação com a API do Gemini", 401);
    }
    
    if (error.message.includes('quota')) {
      throw new AppError("Limite de uso da API do Gemini excedido", 429);
    }
    
    throw new AppError(`Erro ao gerar resumo: ${error.message}`, 500);
  }
};

export default GenerateAISummaryService;
