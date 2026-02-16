import * as XLSX from 'xlsx';
import { logger } from '../utils/logger';

export interface ImportedContact {
  nome: string;
  numero: string;
}

/**
 * Processa arquivo XLSX e extrai os contatos
 */
export const processXLSXFile = (fileBuffer: Buffer): ImportedContact[] => {
  try {
    logger.info('[ImportXLSXService] Iniciando processamento do arquivo XLSX');
    
    // Lê o arquivo XLSX
    const workbook = XLSX.read(fileBuffer);
    
    // Pega a primeira planilha
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Arquivo XLSX não contém planilhas');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Converte para JSON
    const contacts = XLSX.utils.sheet_to_json(worksheet, {
      header: ['nome', 'numero'], // Define os cabeçalhos esperados
      range: 1 // Pula a primeira linha (cabeçalho)
    }) as ImportedContact[];
    
    // Filtra contatos válidos
    const validContacts = contacts.filter(contact => {
      return contact.nome && contact.numero && 
             typeof contact.nome === 'string' && 
             typeof contact.numero === 'string';
    });
    
    logger.info(`[ImportXLSXService] Processados ${validContacts.length} contatos válidos de ${contacts.length} linhas`);
    
    return validContacts;
    
  } catch (error) {
    logger.error('[ImportXLSXService] Erro ao processar arquivo XLSX:', error);
    throw new Error('Erro ao processar arquivo XLSX. Verifique se o arquivo está no formato correto.');
  }
};

/**
 * Valida se o arquivo é um XLSX válido
 */
export const validateXLSXFile = (fileBuffer: Buffer): boolean => {
  try {
    const workbook = XLSX.read(fileBuffer);
    return workbook.SheetNames && workbook.SheetNames.length > 0;
  } catch (error) {
    return false;
  }
};

export default {
  processXLSXFile,
  validateXLSXFile
};











