import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";

const execAsync = promisify(exec);

/**
 * Converte áudio para formato Opus/OGG compatível com WhatsApp mobile
 * WhatsApp mobile requer: Opus codec, OGG container, 16-48 kbps
 */
const ConvertAudioToOpus = async (inputPath: string): Promise<string> => {
  try {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const basename = path.basename(inputPath, ext);
    const outputPath = path.join(dir, `${basename}.ogg`);

    // Se já for .ogg, não converter
    if (ext.toLowerCase() === ".ogg") {
      logger.info(`Audio already in OGG format: ${inputPath}`);
      return inputPath;
    }

    // Verificar se o arquivo de entrada existe
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input audio file not found: ${inputPath}`);
    }

    // Converter para Opus/OGG com configurações otimizadas para WhatsApp
    // -c:a libopus: codec Opus
    // -b:a 24k: bitrate 24kbps (WhatsApp usa 16-32kbps)
    // -vbr on: variable bitrate para melhor qualidade
    // -compression_level 10: máxima compressão
    // -ac 1: mono (WhatsApp voice messages são mono)
    // -ar 16000: sample rate 16kHz (WhatsApp usa 16kHz para voice)
    const command = `ffmpeg -i "${inputPath}" -c:a libopus -b:a 24k -vbr on -compression_level 10 -ac 1 -ar 16000 "${outputPath}" -y`;

    logger.info(`Converting audio to Opus/OGG: ${inputPath} -> ${outputPath}`);
    
    await execAsync(command);

    // Verificar se a conversão foi bem-sucedida
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Converted audio file not created: ${outputPath}`);
    }

    logger.info(`Audio converted successfully: ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    logger.error(`Error converting audio to Opus: ${error}`);
    // Em caso de erro, retornar o caminho original
    return inputPath;
  }
};

export default ConvertAudioToOpus;

