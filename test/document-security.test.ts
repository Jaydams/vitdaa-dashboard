import { describe, it, expect } from "vitest";
import {
  validateFilePathOwnership,
  sanitizeFilename,
  generateSecureFilePath,
} from "@/lib/document-security";

describe("Document Security", () => {
  describe("validateFilePathOwnership", () => {
    it("should validate correct file paths", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const validPath = `staff-documents/${businessId}/staff_456_contract_1703123456789.pdf`;

      expect(validateFilePathOwnership(validPath, businessId)).toBe(true);
    });

    it("should reject file paths from different businesses", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const otherBusinessId = "987fcdeb-51a2-43d1-b789-123456789abc";
      const invalidPath = `staff-documents/${otherBusinessId}/staff_456_contract_1703123456789.pdf`;

      expect(validateFilePathOwnership(invalidPath, businessId)).toBe(false);
    });

    it("should reject malformed file paths", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";

      expect(validateFilePathOwnership("invalid/path", businessId)).toBe(false);
      expect(validateFilePathOwnership("staff-documents", businessId)).toBe(
        false
      );
      expect(validateFilePathOwnership("", businessId)).toBe(false);
    });

    it("should reject paths without staff-documents prefix", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const invalidPath = `documents/${businessId}/file.pdf`;

      expect(validateFilePathOwnership(invalidPath, businessId)).toBe(false);
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove path separators", () => {
      expect(sanitizeFilename("../../../etc/passwd")).toBe("etcpasswd");
      expect(sanitizeFilename("folder/file.pdf")).toBe("folderfile.pdf");
      expect(sanitizeFilename("folder\\file.pdf")).toBe("folderfile.pdf");
    });

    it("should remove dangerous characters", () => {
      expect(sanitizeFilename('file<>:"|?*.pdf')).toBe("file.pdf");
      expect(sanitizeFilename("file:name.pdf")).toBe("filename.pdf");
    });

    it("should remove parent directory references", () => {
      expect(sanitizeFilename("../file.pdf")).toBe("file.pdf");
      expect(sanitizeFilename("../../file.pdf")).toBe("file.pdf");
      expect(sanitizeFilename("file..name.pdf")).toBe("filename.pdf");
    });

    it("should trim whitespace", () => {
      expect(sanitizeFilename("  file.pdf  ")).toBe("file.pdf");
      expect(sanitizeFilename("\tfile.pdf\n")).toBe("file.pdf");
    });

    it("should handle normal filenames correctly", () => {
      expect(sanitizeFilename("document.pdf")).toBe("document.pdf");
      expect(sanitizeFilename("my-file_v2.docx")).toBe("my-file_v2.docx");
      expect(sanitizeFilename("image (1).jpg")).toBe("image (1).jpg");
    });
  });

  describe("generateSecureFilePath", () => {
    it("should generate secure file paths with correct structure", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const staffId = "staff_456";
      const documentType = "contract";
      const filename = "employment.pdf";

      const path = generateSecureFilePath(
        businessId,
        staffId,
        documentType,
        filename
      );

      expect(path).toMatch(
        /^staff-documents\/123e4567-e89b-12d3-a456-426614174000\/staff_456_contract_\d+\.pdf$/
      );
      expect(validateFilePathOwnership(path, businessId)).toBe(true);
    });

    it("should sanitize malicious filenames", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const staffId = "staff_456";
      const documentType = "contract";
      const maliciousFilename = "../../../etc/passwd";

      const path = generateSecureFilePath(
        businessId,
        staffId,
        documentType,
        maliciousFilename
      );

      expect(path).not.toContain("../");
      // The sanitized filename becomes "etcpasswd" which is safe
      expect(path).toMatch(/staff_456_contract_\d+\.etcpasswd$/);
      expect(validateFilePathOwnership(path, businessId)).toBe(true);
    });

    it("should handle files without extensions", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const staffId = "staff_456";
      const documentType = "contract";
      const filename = "document";

      const path = generateSecureFilePath(
        businessId,
        staffId,
        documentType,
        filename
      );

      expect(path).toMatch(
        /^staff-documents\/123e4567-e89b-12d3-a456-426614174000\/staff_456_contract_\d+\.document$/
      );
    });

    it("should create unique paths for same inputs", async () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const staffId = "staff_456";
      const documentType = "contract";
      const filename = "document.pdf";

      const path1 = generateSecureFilePath(
        businessId,
        staffId,
        documentType,
        filename
      );
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 1));
      const path2 = generateSecureFilePath(
        businessId,
        staffId,
        documentType,
        filename
      );

      expect(path1).not.toBe(path2);
    });
  });

  describe("Security Patterns", () => {
    it("should follow secure file naming conventions", () => {
      const securePattern =
        /^staff-documents\/[a-f0-9-]{36}\/[a-zA-Z0-9_]+_[a-zA-Z0-9_]+_\d+\.[a-zA-Z0-9]+$/;

      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const path = generateSecureFilePath(
        businessId,
        "staff_123",
        "contract",
        "document.pdf"
      );

      expect(path).toMatch(securePattern);
    });

    it("should prevent directory traversal in generated paths", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const maliciousInputs = [
        "../../../etc/passwd",
        "..\\..\\windows\\system32",
        "folder/../../../secret.txt",
        ".env",
        "config.json",
      ];

      maliciousInputs.forEach((input) => {
        const path = generateSecureFilePath(
          businessId,
          "staff_123",
          "contract",
          input
        );

        expect(path).not.toContain("../");
        expect(path).not.toContain("..\\");
        expect(path.startsWith(`staff-documents/${businessId}/`)).toBe(true);
        expect(validateFilePathOwnership(path, businessId)).toBe(true);
      });
    });
  });

  describe("File Extension Handling", () => {
    it("should preserve valid file extensions", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const testCases = [
        { filename: "document.pdf", expectedExt: "pdf" },
        { filename: "image.jpg", expectedExt: "jpg" },
        { filename: "file.docx", expectedExt: "docx" },
        { filename: "text.txt", expectedExt: "txt" },
      ];

      testCases.forEach(({ filename, expectedExt }) => {
        const path = generateSecureFilePath(
          businessId,
          "staff_123",
          "contract",
          filename
        );
        expect(path.endsWith(`.${expectedExt}`)).toBe(true);
      });
    });

    it("should handle multiple dots in filename", () => {
      const businessId = "123e4567-e89b-12d3-a456-426614174000";
      const filename = "my.document.v2.pdf";

      const path = generateSecureFilePath(
        businessId,
        "staff_123",
        "contract",
        filename
      );
      expect(path.endsWith(".pdf")).toBe(true);
    });
  });
});
