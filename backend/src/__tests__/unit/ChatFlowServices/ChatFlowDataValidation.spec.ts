import {
  validateDate,
  validateEmail,
  validateNumber,
  validateText,
  validateInput,
  ValidationType
} from "../../../services/ChatFlowServices/ChatFlowDataValidation";

describe("ChatFlowDataValidation", () => {
  describe("validateDate", () => {
    it("deve aceitar DD/MM/AAAA e formatar para ISO (YYYY-MM-DD)", () => {
      const result = validateDate("20/10/1995");
      expect(result.valid).toBe(true);
      expect(result.value).toBe("1995-10-20");
    });

    it("deve aceitar datas com um dígito no dia e mês", () => {
      expect(validateDate("5/3/2000")).toEqual({
        valid: true,
        value: "2000-03-05"
      });
      expect(validateDate("01/01/2025")).toEqual({
        valid: true,
        value: "2025-01-01"
      });
    });

    it("deve aceitar DD/MM (usa ano atual)", () => {
      const result = validateDate("25/12");
      expect(result.valid).toBe(true);
      const year = new Date().getFullYear();
      expect(result.value).toBe(`${year}-12-25`);
    });

    it("deve rejeitar texto aleatório", () => {
      const result = validateDate("texto aleatório");
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("deve rejeitar datas impossíveis: mês 13", () => {
      const result = validateDate("20/13/2026");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Mês inválido/i);
    });

    it("deve rejeitar datas impossíveis: dia 32 em janeiro", () => {
      const result = validateDate("32/01/2026");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Dia inválido/i);
    });

    it("deve rejeitar 31/02", () => {
      const result = validateDate("31/02/2026");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Dia inválido/i);
    });

    it("deve rejeitar entrada vazia", () => {
      expect(validateDate("").valid).toBe(false);
      expect(validateDate("   ").valid).toBe(false);
    });

    it("deve rejeitar respostas de recusa amigáveis", () => {
      expect(validateDate("não quero dizer").valid).toBe(false);
      expect(validateDate("não sei").valid).toBe(false);
      expect(validateDate("prefiro não").valid).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("deve aceitar e-mail válido", () => {
      const result = validateEmail("usuario@exemplo.com");
      expect(result.valid).toBe(true);
      expect(result.value).toBe("usuario@exemplo.com");
    });

    it("deve rejeitar e-mail sem @", () => {
      expect(validateEmail("usuarioexemplo.com").valid).toBe(false);
    });

    it("deve rejeitar e-mail vazio", () => {
      expect(validateEmail("").valid).toBe(false);
    });
  });

  describe("validateNumber", () => {
    it("deve aceitar número inteiro", () => {
      const result = validateNumber("42");
      expect(result.valid).toBe(true);
      expect(result.value).toBe("42");
    });

    it("deve aceitar número decimal com vírgula", () => {
      const result = validateNumber("3,14");
      expect(result.valid).toBe(true);
      expect(result.value).toBe("3.14");
    });

    it("deve rejeitar texto não numérico", () => {
      expect(validateNumber("abc").valid).toBe(false);
    });
  });

  describe("validateText", () => {
    it("deve aceitar qualquer texto não vazio", () => {
      expect(validateText("João Silva").valid).toBe(true);
      expect(validateText("  texto  ").value).toBe("texto");
    });

    it("deve rejeitar string vazia ou só espaços", () => {
      expect(validateText("").valid).toBe(false);
      expect(validateText("   ").valid).toBe(false);
    });
  });

  describe("validateInput (genérico)", () => {
    it("deve delegar para validateDate quando type é date", () => {
      expect(validateInput("20/10/1995", "date")).toEqual({
        valid: true,
        value: "1995-10-20"
      });
      expect(validateInput("invalido", "date").valid).toBe(false);
    });

    it("deve delegar para validateEmail quando type é email", () => {
      expect(validateInput("a@b.com", "email").valid).toBe(true);
    });

    it("deve delegar para validateNumber quando type é number", () => {
      expect(validateInput("123", "number").valid).toBe(true);
    });

    it("deve delegar para validateText quando type é text", () => {
      expect(validateInput("qualquer coisa", "text").valid).toBe(true);
    });
  });
});
