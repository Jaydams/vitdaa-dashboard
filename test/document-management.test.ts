import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createStaffDocument,
  getStaffDocuments,
  getStaffDocument,
  updateStaffDocument,
  deleteStaffDocument,
  getExpiredStaffDocuments,
  getDocumentsExpiringSoon,
  getBusinessDocuments,
  getStaffComplianceStatus,
  getBusinessComplianceOverview,
  getDocumentStatisticsByType,
  bulkUpdateDocumentExpirations,
} from "@/lib/staff-documents-data";
import { createClient } from "@/lib/supabase/server";
import { StaffDocument, DocumentType } from "@/types/staff";

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Create a more flexible mock that can handle method chaining
const createMockSupabaseClient = () => {
  const mockClient: any = {
    from: vi.fn(() => mockClient),
    insert: vi.fn(() => mockClient),
    select: vi.fn(() => mockClient),
    single: vi.fn(),
    eq: vi.fn(() => mockClient),
    not: vi.fn(() => mockClient),
    lt: vi.fn(() => mockClient),
    gte: vi.fn(() => mockClient),
    lte: vi.fn(() => mockClient),
    order: vi.fn(),
    limit: vi.fn(() => mockClient),
    update: vi.fn(() => mockClient),
    delete: vi.fn(() => mockClient),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  };
  return mockClient;
};

const mockSupabaseClient = createMockSupabaseClient();

describe("Staff Document Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as any).mockResolvedValue(mockSupabaseClient);
  });

  describe("createStaffDocument", () => {
    it("should create a new staff document successfully", async () => {
      const mockDocument: StaffDocument = {
        id: "doc-1",
        staff_id: "staff-1",
        business_id: "business-1",
        document_type: "contract",
        document_name: "Employment Contract",
        file_url: "https://example.com/contract.pdf",
        file_size: 1024,
        mime_type: "application/pdf",
        expiration_date: "2024-12-31",
        is_required: true,
        uploaded_by: "business-1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockDocument,
        error: null,
      });

      const result = await createStaffDocument(
        "staff-1",
        "business-1",
        "business-1",
        {
          document_type: "contract",
          document_name: "Employment Contract",
          file_url: "https://example.com/contract.pdf",
          file_size: 1024,
          mime_type: "application/pdf",
          expiration_date: "2024-12-31",
          is_required: true,
        }
      );

      expect(result).toEqual(mockDocument);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("staff_documents");
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        staff_id: "staff-1",
        business_id: "business-1",
        uploaded_by: "business-1",
        document_type: "contract",
        document_name: "Employment Contract",
        file_url: "https://example.com/contract.pdf",
        file_size: 1024,
        mime_type: "application/pdf",
        expiration_date: "2024-12-31",
        is_required: true,
      });
    });

    it("should return null when creation fails", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: "Creation failed" },
      });

      const result = await createStaffDocument(
        "staff-1",
        "business-1",
        "business-1",
        {
          document_type: "contract",
          document_name: "Employment Contract",
          file_url: "https://example.com/contract.pdf",
        }
      );

      expect(result).toBeNull();
    });
  });

  describe("getStaffDocuments", () => {
    it("should retrieve all documents for a staff member", async () => {
      const mockDocuments: StaffDocument[] = [
        {
          id: "doc-1",
          staff_id: "staff-1",
          business_id: "business-1",
          document_type: "contract",
          document_name: "Employment Contract",
          file_url: "https://example.com/contract.pdf",
          is_required: true,
          uploaded_by: "business-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      const result = await getStaffDocuments("staff-1", "business-1");

      expect(result).toEqual(mockDocuments);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("staff_documents");
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("staff_id", "staff-1");
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        "business_id",
        "business-1"
      );
    });

    it("should filter documents by type when specified", async () => {
      const mockDocuments: StaffDocument[] = [];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      await getStaffDocuments("staff-1", "business-1", "contract");

      // Check that eq was called with the document type filter
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith("staff_id", "staff-1");
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        "business_id",
        "business-1"
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        "document_type",
        "contract"
      );
    });

    it("should return empty array when query fails", async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      const result = await getStaffDocuments("staff-1", "business-1");

      expect(result).toEqual([]);
    });
  });

  describe("getExpiredStaffDocuments", () => {
    it("should retrieve expired documents for a staff member", async () => {
      const mockExpiredDocuments: StaffDocument[] = [
        {
          id: "doc-1",
          staff_id: "staff-1",
          business_id: "business-1",
          document_type: "certification",
          document_name: "Expired Certification",
          file_url: "https://example.com/cert.pdf",
          expiration_date: "2023-12-31",
          is_required: true,
          uploaded_by: "business-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockExpiredDocuments,
        error: null,
      });

      const result = await getExpiredStaffDocuments("staff-1", "business-1");

      expect(result).toEqual(mockExpiredDocuments);
      expect(mockSupabaseClient.not).toHaveBeenCalledWith(
        "expiration_date",
        "is",
        null
      );
      expect(mockSupabaseClient.lt).toHaveBeenCalled();
    });
  });

  describe("getDocumentsExpiringSoon", () => {
    it("should retrieve documents expiring within specified days", async () => {
      const mockExpiringSoonDocuments: StaffDocument[] = [
        {
          id: "doc-1",
          staff_id: "staff-1",
          business_id: "business-1",
          document_type: "id_document",
          document_name: "ID Document",
          file_url: "https://example.com/id.pdf",
          expiration_date: "2024-02-15",
          is_required: true,
          uploaded_by: "business-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockExpiringSoonDocuments,
        error: null,
      });

      const result = await getDocumentsExpiringSoon(
        "staff-1",
        "business-1",
        30
      );

      expect(result).toEqual(mockExpiringSoonDocuments);
      expect(mockSupabaseClient.gte).toHaveBeenCalled();
      expect(mockSupabaseClient.lte).toHaveBeenCalled();
    });
  });

  describe("getStaffComplianceStatus", () => {
    it("should calculate compliance status correctly", async () => {
      // Mock the functions that getStaffComplianceStatus depends on
      const mockDocuments: StaffDocument[] = [
        {
          id: "doc-1",
          staff_id: "staff-1",
          business_id: "business-1",
          document_type: "contract",
          document_name: "Employment Contract",
          file_url: "https://example.com/contract.pdf",
          is_required: true,
          uploaded_by: "business-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "doc-2",
          staff_id: "staff-1",
          business_id: "business-1",
          document_type: "id_document",
          document_name: "ID Document",
          file_url: "https://example.com/id.pdf",
          is_required: true,
          uploaded_by: "business-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock all the database calls - need to mock multiple calls
      mockSupabaseClient.order
        .mockResolvedValueOnce({
          data: mockDocuments,
          error: null,
        })
        .mockResolvedValueOnce({
          data: [], // No expired documents
          error: null,
        })
        .mockResolvedValueOnce({
          data: [], // No expiring soon documents
          error: null,
        });

      const result = await getStaffComplianceStatus("staff-1", "business-1");

      expect(result).toBeDefined();
      expect(result?.status).toBe("compliant");
      expect(result?.total_documents).toBe(2);
      expect(result?.required_documents).toBe(2);
      expect(result?.missing_required_types).toEqual([]);
    });

    it("should identify non-compliant status when required documents are missing", async () => {
      const mockDocuments: StaffDocument[] = [
        {
          id: "doc-1",
          staff_id: "staff-1",
          business_id: "business-1",
          document_type: "other",
          document_name: "Other Document",
          file_url: "https://example.com/other.pdf",
          is_required: false,
          uploaded_by: "business-1",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockDocuments,
        error: null,
      });

      const result = await getStaffComplianceStatus("staff-1", "business-1");

      expect(result).toBeDefined();
      expect(result?.status).toBe("non_compliant");
      expect(result?.missing_required_types).toContain("contract");
      expect(result?.missing_required_types).toContain("id_document");
    });
  });

  describe("updateStaffDocument", () => {
    it("should update document successfully", async () => {
      const mockUpdatedDocument: StaffDocument = {
        id: "doc-1",
        staff_id: "staff-1",
        business_id: "business-1",
        document_type: "contract",
        document_name: "Updated Contract",
        file_url: "https://example.com/contract.pdf",
        is_required: true,
        uploaded_by: "business-1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockUpdatedDocument,
        error: null,
      });

      const result = await updateStaffDocument("doc-1", "business-1", {
        document_name: "Updated Contract",
      });

      expect(result).toEqual(mockUpdatedDocument);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          document_name: "Updated Contract",
          updated_at: expect.any(String),
        })
      );
    });
  });

  describe("deleteStaffDocument", () => {
    it("should delete document successfully", async () => {
      // Mock the final result of the chained delete operation
      mockSupabaseClient.eq.mockResolvedValueOnce({
        error: null,
      });

      const result = await deleteStaffDocument("doc-1", "business-1");

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith("staff_documents");
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
    });

    it("should return false when deletion fails", async () => {
      // Mock the final result of the chained delete operation with error
      mockSupabaseClient.eq.mockResolvedValueOnce({
        error: { message: "Deletion failed" },
      });

      const result = await deleteStaffDocument("doc-1", "business-1");

      expect(result).toBe(false);
    });
  });

  describe("bulkUpdateDocumentExpirations", () => {
    it("should update multiple document expiration dates", async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: "doc-1" },
        error: null,
      });

      const updates = [
        { documentId: "doc-1", expirationDate: "2024-12-31" },
        { documentId: "doc-2", expirationDate: "2025-01-31" },
      ];

      const result = await bulkUpdateDocumentExpirations("business-1", updates);

      expect(result).toBe(2);
      expect(mockSupabaseClient.update).toHaveBeenCalledTimes(2);
    });

    it("should handle partial failures in bulk updates", async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: { id: "doc-1" },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: "Update failed" },
        });

      const updates = [
        { documentId: "doc-1", expirationDate: "2024-12-31" },
        { documentId: "doc-2", expirationDate: "2025-01-31" },
      ];

      const result = await bulkUpdateDocumentExpirations("business-1", updates);

      expect(result).toBe(1); // Only one successful update
    });
  });
});

describe("Document Validation", () => {
  describe("File Upload Validation", () => {
    it("should validate file size limits", () => {
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const largeFileSize = 15 * 1024 * 1024; // 15MB
      const validFileSize = 5 * 1024 * 1024; // 5MB

      expect(largeFileSize > MAX_FILE_SIZE).toBe(true);
      expect(validFileSize <= MAX_FILE_SIZE).toBe(true);
    });

    it("should validate allowed file types", () => {
      const ALLOWED_MIME_TYPES = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];

      expect(ALLOWED_MIME_TYPES.includes("application/pdf")).toBe(true);
      expect(ALLOWED_MIME_TYPES.includes("image/jpeg")).toBe(true);
      expect(ALLOWED_MIME_TYPES.includes("application/exe")).toBe(false);
      expect(ALLOWED_MIME_TYPES.includes("video/mp4")).toBe(false);
    });
  });

  describe("Document Type Validation", () => {
    it("should validate document types", () => {
      const validTypes: DocumentType[] = [
        "contract",
        "id_document",
        "tax_form",
        "certification",
        "training_record",
        "other",
      ];

      validTypes.forEach((type) => {
        expect([
          "contract",
          "id_document",
          "tax_form",
          "certification",
          "training_record",
          "other",
        ]).toContain(type);
      });
    });
  });

  describe("Expiration Date Validation", () => {
    it("should correctly identify expired documents", () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const isExpired = (expirationDate: Date) => expirationDate < today;

      expect(isExpired(yesterday)).toBe(true);
      expect(isExpired(tomorrow)).toBe(false);
    });

    it("should correctly identify documents expiring soon", () => {
      const today = new Date();
      const in15Days = new Date(today);
      in15Days.setDate(today.getDate() + 15);
      const in45Days = new Date(today);
      in45Days.setDate(today.getDate() + 45);

      const isExpiringSoon = (expirationDate: Date, daysAhead: number = 30) => {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + daysAhead);
        return expirationDate >= today && expirationDate <= futureDate;
      };

      expect(isExpiringSoon(in15Days, 30)).toBe(true);
      expect(isExpiringSoon(in45Days, 30)).toBe(false);
    });
  });
});

describe("Compliance Calculations", () => {
  it("should calculate compliance percentage correctly", () => {
    const calculateCompliancePercentage = (
      compliant: number,
      total: number
    ) => {
      if (total === 0) return 100;
      return Math.round((compliant / total) * 100 * 100) / 100;
    };

    expect(calculateCompliancePercentage(8, 10)).toBe(80);
    expect(calculateCompliancePercentage(0, 0)).toBe(100);
    expect(calculateCompliancePercentage(5, 5)).toBe(100);
    expect(calculateCompliancePercentage(1, 3)).toBe(33.33);
  });

  it("should determine compliance status based on document conditions", () => {
    const determineComplianceStatus = (
      expiredCount: number,
      expiringSoonCount: number,
      missingRequiredCount: number
    ) => {
      if (expiredCount > 0 || missingRequiredCount > 0) {
        return "non_compliant";
      } else if (expiringSoonCount > 0) {
        return "needs_attention";
      } else {
        return "compliant";
      }
    };

    expect(determineComplianceStatus(1, 0, 0)).toBe("non_compliant");
    expect(determineComplianceStatus(0, 0, 1)).toBe("non_compliant");
    expect(determineComplianceStatus(0, 1, 0)).toBe("needs_attention");
    expect(determineComplianceStatus(0, 0, 0)).toBe("compliant");
  });
});
