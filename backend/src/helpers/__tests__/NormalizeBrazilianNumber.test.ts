import { normalizeBrazilianNumber } from "../NormalizeBrazilianNumber";

describe("NormalizeBrazilianNumber", () => {
  describe("Números com 13 dígitos (DDI + DDD + 9 + número)", () => {
    it("deve remover o 9º dígito de 5575987878787", () => {
      expect(normalizeBrazilianNumber("5575987878787")).toBe("557587878787");
    });

    it("deve remover o 9º dígito de 5511999999999", () => {
      expect(normalizeBrazilianNumber("5511999999999")).toBe("5511999999999");
    });

    it("deve remover o 9º dígito de 5521988888888", () => {
      expect(normalizeBrazilianNumber("5521988888888")).toBe("5521988888888");
    });

    it("deve remover o 9º dígito com caracteres especiais (55) 75 98787-8787", () => {
      expect(normalizeBrazilianNumber("(55) 75 98787-8787")).toBe(
        "557587878787"
      );
    });
  });

  describe("Números com 11 dígitos (DDD + 9 + número)", () => {
    it("deve adicionar DDI e remover 9º dígito de 75987878787", () => {
      expect(normalizeBrazilianNumber("75987878787")).toBe("557587878787");
    });

    it("deve adicionar DDI e remover 9º dígito de 11999999999", () => {
      expect(normalizeBrazilianNumber("11999999999")).toBe("5511999999999");
    });

    it("deve adicionar DDI e remover 9º dígito de 21988888888", () => {
      expect(normalizeBrazilianNumber("21988888888")).toBe("5521988888888");
    });

    it("deve adicionar DDI e remover 9º dígito com caracteres (75) 98787-8787", () => {
      expect(normalizeBrazilianNumber("(75) 98787-8787")).toBe("557587878787");
    });
  });

  describe("Números com 10 dígitos (DDD + número sem 9)", () => {
    it("deve apenas adicionar DDI para 7587878787", () => {
      expect(normalizeBrazilianNumber("7587878787")).toBe("557587878787");
    });

    it("deve apenas adicionar DDI para 1199999999", () => {
      expect(normalizeBrazilianNumber("1199999999")).toBe("551199999999");
    });

    it("deve apenas adicionar DDI com caracteres (75) 8787-8787", () => {
      expect(normalizeBrazilianNumber("(75) 8787-8787")).toBe("557587878787");
    });
  });

  describe("Números já normalizados (12 dígitos)", () => {
    it("deve manter 557587878787 como está", () => {
      expect(normalizeBrazilianNumber("557587878787")).toBe("557587878787");
    });

    it("deve manter 5511999999999 como está", () => {
      expect(normalizeBrazilianNumber("5511999999999")).toBe("5511999999999");
    });
  });

  describe("Números com caracteres especiais", () => {
    it("deve normalizar +55 (75) 98787-8787", () => {
      expect(normalizeBrazilianNumber("+55 (75) 98787-8787")).toBe(
        "557587878787"
      );
    });

    it("deve normalizar +55 75 9 8787-8787", () => {
      expect(normalizeBrazilianNumber("+55 75 9 8787-8787")).toBe(
        "557587878787"
      );
    });

    it("deve normalizar (075) 98787-8787", () => {
      expect(normalizeBrazilianNumber("(075) 98787-8787")).toBe(
        "557587878787"
      );
    });
  });

  describe("Tipos de entrada", () => {
    it("deve aceitar string", () => {
      expect(normalizeBrazilianNumber("5575987878787")).toBe("557587878787");
    });

    it("deve aceitar number", () => {
      expect(normalizeBrazilianNumber(5575987878787)).toBe("557587878787");
    });
  });
});


















