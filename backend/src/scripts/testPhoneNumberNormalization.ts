import { 
  calculatePhoneNumberSimilarity, 
  arePhoneNumbersSimilar, 
  findMostSimilarNumber,
  normalizeForComparison
} from "../utils/phoneNumberSimilarity";
import { normalizePhoneNumber } from "../utils/phoneNumberNormalizer";

/**
 * Script de teste para demonstrar a funcionalidade de normalização
 * Nova lógica: remove o 9 e adiciona o 55 quando necessário
 */
const testPhoneNumberNormalization = () => {
  console.log("=== TESTE DE NORMALIZAÇÃO DE NÚMEROS DE TELEFONE ===\n");
  console.log("NOVA LÓGICA: Remove o 9 e adiciona o 55 quando necessário\n");

  // Teste 1: Números com e sem 9
  console.log("1. Teste: Números com e sem 9");
  const numero1 = "557588776655";
  const numero2 = "5575988776655";
  const similarity1 = calculatePhoneNumberSimilarity(numero1, numero2);
  console.log(`   ${numero1} vs ${numero2}: ${similarity1.toFixed(1)}% similar`);
  console.log(`   São similares? ${arePhoneNumbersSimilar(numero1, numero2) ? 'SIM' : 'NÃO'}\n`);

  // Teste 2: Números com erro de digitação (não deve ser similar)
  console.log("2. Teste: Números com erro de digitação (não deve ser similar)");
  const numero3 = "557588776655";
  const numero4 = "557588776656"; // Último dígito diferente
  const similarity2 = calculatePhoneNumberSimilarity(numero3, numero4);
  console.log(`   ${numero3} vs ${numero4}: ${similarity2.toFixed(1)}% similar`);
  console.log(`   São similares? ${arePhoneNumbersSimilar(numero3, numero4) ? 'SIM' : 'NÃO'}\n`);

  // Teste 3: Números com DDDs diferentes (não deve ser similar)
  console.log("3. Teste: Números com DDDs diferentes (não deve ser similar)");
  const numero5 = "557588776655";
  const numero6 = "551188776655"; // DDD diferente
  const similarity3 = calculatePhoneNumberSimilarity(numero5, numero6);
  console.log(`   ${numero5} vs ${numero6}: ${similarity3.toFixed(1)}% similar`);
  console.log(`   São similares? ${arePhoneNumbersSimilar(numero5, numero6) ? 'SIM' : 'NÃO'}\n`);

  // Teste 4: Números idênticos
  console.log("4. Teste: Números idênticos");
  const numero7 = "557588776655";
  const numero8 = "557588776655";
  const similarity4 = calculatePhoneNumberSimilarity(numero7, numero8);
  console.log(`   ${numero7} vs ${numero8}: ${similarity4.toFixed(1)}% similar`);
  console.log(`   São similares? ${arePhoneNumbersSimilar(numero7, numero8) ? 'SIM' : 'NÃO'}\n`);

  // Teste 5: Normalização de números
  console.log("5. Teste: Normalização de números");
  console.log("   Números com 9:");
  console.log(`   ${normalizeForComparison("5575988776655")} ← 5575988776655`);
  console.log(`   ${normalizeForComparison("75988776655")} ← 75988776655`);
  console.log(`   ${normalizeForComparison("988776655")} ← 988776655`);
  console.log("\n   Números sem 9:");
  console.log(`   ${normalizeForComparison("557588776655")} ← 557588776655`);
  console.log(`   ${normalizeForComparison("7588776655")} ← 7588776655`);
  console.log(`   ${normalizeForComparison("88776655")} ← 88776655\n`);

  // Teste 6: Normalização com utilitário completo
  console.log("6. Teste: Normalização completa");
  const testNumbers = [
    "5575988776655",
    "75988776655", 
    "988776655",
    "557588776655",
    "7588776655",
    "88776655"
  ];

  testNumbers.forEach(num => {
    const normalized = normalizePhoneNumber(num);
    console.log(`   ${num} → ${normalized.normalized} (mudou: ${normalized.hasChanges})`);
  });

  // Teste 7: Exemplos do usuário
  console.log("\n7. Teste: Exemplos do usuário");
  const userExamples = [
    "5575998989898",  // 5575'9'98989898
    "55759767676",    // 55759767676
    "75987878787",    // 75987878787
    "987878787"       // 987878787
  ];

  userExamples.forEach(num => {
    const normalized = normalizePhoneNumber(num);
    console.log(`   ${num} → ${normalized.normalized} (mudou: ${normalized.hasChanges})`);
  });

  console.log("\n=== TESTE CONCLUÍDO ===");
};

// Executa o teste se o arquivo for executado diretamente
if (require.main === module) {
  testPhoneNumberNormalization();
}

export default testPhoneNumberNormalization;
