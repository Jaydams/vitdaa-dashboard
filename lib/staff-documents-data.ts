import { createClient } from "@/lib/supabase/server";
import { StaffDocument, DocumentType } from "@/types/staff";

/**
 * Creates a new document record for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param uploadedBy - The business owner ID who uploaded the document
 * @param documentData - The document information
 * @returns The created document record or null if failed
 */
export async function createStaffDocument(
  staffId: string,
  businessId: string,
  uploadedBy: string,
  documentData: {
    document_type: DocumentType;
    document_name: string;
    file_url: string;
    file_size?: number;
    mime_type?: string;
    expiration_date?: string;
    is_required?: boolean;
  }
): Promise<StaffDocument | null> {
  try {
    const supabase = await createClient();

    const { data: document, error } = await supabase
      .from("staff_documents")
      .insert({
        staff_id: staffId,
        business_id: businessId,
        uploaded_by: uploadedBy,
        document_type: documentData.document_type,
        document_name: documentData.document_name,
        file_url: documentData.file_url,
        file_size: documentData.file_size,
        mime_type: documentData.mime_type,
        expiration_date: documentData.expiration_date,
        is_required: documentData.is_required || false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating staff document:", error);
      return null;
    }

    return document as StaffDocument;
  } catch (error) {
    console.error("Error creating staff document:", error);
    return null;
  }
}

/**
 * Gets all documents for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param documentType - Optional document type filter
 * @returns Array of documents
 */
export async function getStaffDocuments(
  staffId: string,
  businessId: string,
  documentType?: DocumentType
): Promise<StaffDocument[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("staff_documents")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (documentType) {
      query = query.eq("document_type", documentType);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error("Error getting staff documents:", error);
      return [];
    }

    return documents || [];
  } catch (error) {
    console.error("Error getting staff documents:", error);
    return [];
  }
}

/**
 * Gets a specific document by ID
 * @param documentId - The document ID
 * @param businessId - The business ID
 * @returns Document record or null if not found
 */
export async function getStaffDocument(
  documentId: string,
  businessId: string
): Promise<StaffDocument | null> {
  try {
    const supabase = await createClient();

    const { data: document, error } = await supabase
      .from("staff_documents")
      .select("*")
      .eq("id", documentId)
      .eq("business_id", businessId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Document not found
        return null;
      }
      console.error("Error getting staff document:", error);
      return null;
    }

    return document as StaffDocument;
  } catch (error) {
    console.error("Error getting staff document:", error);
    return null;
  }
}

/**
 * Updates a document record
 * @param documentId - The document ID
 * @param businessId - The business ID
 * @param updates - The fields to update
 * @returns Updated document record or null if failed
 */
export async function updateStaffDocument(
  documentId: string,
  businessId: string,
  updates: Partial<{
    document_name: string;
    file_url: string;
    file_size: number;
    mime_type: string;
    expiration_date: string;
    is_required: boolean;
  }>
): Promise<StaffDocument | null> {
  try {
    const supabase = await createClient();

    const { data: document, error } = await supabase
      .from("staff_documents")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) {
      console.error("Error updating staff document:", error);
      return null;
    }

    return document as StaffDocument;
  } catch (error) {
    console.error("Error updating staff document:", error);
    return null;
  }
}

/**
 * Deletes a document and its associated file
 * @param documentId - The document ID
 * @param businessId - The business ID
 * @returns True if successful, false otherwise
 */
export async function deleteStaffDocument(
  documentId: string,
  businessId: string
): Promise<boolean> {
  try {
    const supabase = await createClient();

    // First, get the document to retrieve the file path
    const { data: document, error: fetchError } = await supabase
      .from("staff_documents")
      .select("file_url")
      .eq("id", documentId)
      .eq("business_id", businessId)
      .single();

    if (fetchError || !document) {
      console.error("Error fetching document for deletion:", fetchError);
      return false;
    }

    // Delete the database record
    const { error: deleteError } = await supabase
      .from("staff_documents")
      .delete()
      .eq("id", documentId)
      .eq("business_id", businessId);

    if (deleteError) {
      console.error("Error deleting staff document:", deleteError);
      return false;
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from("staff-documents")
      .remove([document.file_url]);

    if (storageError) {
      console.error("Error deleting file from storage:", storageError);
      // Don't return false here as the database record is already deleted
      // Log the error but continue
    }

    return true;
  } catch (error) {
    console.error("Error deleting staff document:", error);
    return false;
  }
}

/**
 * Gets expired documents for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @returns Array of expired documents
 */
export async function getExpiredStaffDocuments(
  staffId: string,
  businessId: string
): Promise<StaffDocument[]> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data: documents, error } = await supabase
      .from("staff_documents")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .not("expiration_date", "is", null)
      .lt("expiration_date", today)
      .order("expiration_date", { ascending: true });

    if (error) {
      console.error("Error getting expired staff documents:", error);
      return [];
    }

    return documents || [];
  } catch (error) {
    console.error("Error getting expired staff documents:", error);
    return [];
  }
}

/**
 * Gets documents expiring soon for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @param daysAhead - Number of days ahead to check (default: 30)
 * @returns Array of documents expiring soon
 */
export async function getDocumentsExpiringSoon(
  staffId: string,
  businessId: string,
  daysAhead: number = 30
): Promise<StaffDocument[]> {
  try {
    const supabase = await createClient();
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const todayStr = today.toISOString().split("T")[0];
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const { data: documents, error } = await supabase
      .from("staff_documents")
      .select("*")
      .eq("staff_id", staffId)
      .eq("business_id", businessId)
      .not("expiration_date", "is", null)
      .gte("expiration_date", todayStr)
      .lte("expiration_date", futureDateStr)
      .order("expiration_date", { ascending: true });

    if (error) {
      console.error("Error getting documents expiring soon:", error);
      return [];
    }

    return documents || [];
  } catch (error) {
    console.error("Error getting documents expiring soon:", error);
    return [];
  }
}

/**
 * Gets all documents for a business
 * @param businessId - The business ID
 * @param documentType - Optional document type filter
 * @param limit - Maximum number of documents to return (default: 100)
 * @returns Array of documents with staff information
 */
export async function getBusinessDocuments(
  businessId: string,
  documentType?: DocumentType,
  limit: number = 100
): Promise<
  (StaffDocument & {
    staff: { first_name: string; last_name: string; role: string };
    uploader: { first_name: string; last_name: string };
  })[]
> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("staff_documents")
      .select(
        `
        *,
        staff:staff_id (
          first_name,
          last_name,
          role
        ),
        uploader:uploaded_by (
          first_name,
          last_name
        )
      `
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (documentType) {
      query = query.eq("document_type", documentType);
    }

    const { data: documents, error } = await query;

    if (error) {
      console.error("Error getting business documents:", error);
      return [];
    }

    return documents || [];
  } catch (error) {
    console.error("Error getting business documents:", error);
    return [];
  }
}

/**
 * Gets compliance status for a staff member
 * @param staffId - The staff member's ID
 * @param businessId - The business ID
 * @returns Compliance status information
 */
export async function getStaffComplianceStatus(
  staffId: string,
  businessId: string
): Promise<{
  status: "compliant" | "needs_attention" | "non_compliant";
  total_documents: number;
  required_documents: number;
  expired_documents: number;
  expiring_soon_documents: number;
  missing_required_types: DocumentType[];
} | null> {
  try {
    const documents = await getStaffDocuments(staffId, businessId);
    const expiredDocuments = await getExpiredStaffDocuments(
      staffId,
      businessId
    );
    const expiringSoonDocuments = await getDocumentsExpiringSoon(
      staffId,
      businessId
    );

    const requiredDocuments = documents.filter((d) => d.is_required);
    const documentTypes = new Set(documents.map((d) => d.document_type));

    // Define required document types (this could be configurable per business)
    const allRequiredTypes: DocumentType[] = ["contract", "id_document"];
    const missingRequiredTypes = allRequiredTypes.filter(
      (type) => !documentTypes.has(type)
    );

    let status: "compliant" | "needs_attention" | "non_compliant";

    if (expiredDocuments.length > 0 || missingRequiredTypes.length > 0) {
      status = "non_compliant";
    } else if (expiringSoonDocuments.length > 0) {
      status = "needs_attention";
    } else {
      status = "compliant";
    }

    return {
      status,
      total_documents: documents.length,
      required_documents: requiredDocuments.length,
      expired_documents: expiredDocuments.length,
      expiring_soon_documents: expiringSoonDocuments.length,
      missing_required_types: missingRequiredTypes,
    };
  } catch (error) {
    console.error("Error getting staff compliance status:", error);
    return null;
  }
}

/**
 * Gets business-wide compliance overview
 * @param businessId - The business ID
 * @returns Business compliance overview
 */
export async function getBusinessComplianceOverview(
  businessId: string
): Promise<{
  total_staff: number;
  compliant_staff: number;
  needs_attention_staff: number;
  non_compliant_staff: number;
  total_expired_documents: number;
  total_expiring_soon_documents: number;
  compliance_percentage: number;
} | null> {
  try {
    const supabase = await createClient();

    // Get all active staff for the business
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id")
      .eq("business_id", businessId)
      .eq("is_active", true);

    if (staffError || !staff) {
      console.error("Error getting staff for compliance overview:", staffError);
      return null;
    }

    let compliantStaff = 0;
    let needsAttentionStaff = 0;
    let nonCompliantStaff = 0;
    let totalExpiredDocuments = 0;
    let totalExpiringSoonDocuments = 0;

    for (const staffMember of staff) {
      const complianceStatus = await getStaffComplianceStatus(
        staffMember.id,
        businessId
      );

      if (complianceStatus) {
        switch (complianceStatus.status) {
          case "compliant":
            compliantStaff++;
            break;
          case "needs_attention":
            needsAttentionStaff++;
            break;
          case "non_compliant":
            nonCompliantStaff++;
            break;
        }

        totalExpiredDocuments += complianceStatus.expired_documents;
        totalExpiringSoonDocuments += complianceStatus.expiring_soon_documents;
      }
    }

    const totalStaff = staff.length;
    const compliancePercentage =
      totalStaff > 0 ? (compliantStaff / totalStaff) * 100 : 100;

    return {
      total_staff: totalStaff,
      compliant_staff: compliantStaff,
      needs_attention_staff: needsAttentionStaff,
      non_compliant_staff: nonCompliantStaff,
      total_expired_documents: totalExpiredDocuments,
      total_expiring_soon_documents: totalExpiringSoonDocuments,
      compliance_percentage: Math.round(compliancePercentage * 100) / 100,
    };
  } catch (error) {
    console.error("Error getting business compliance overview:", error);
    return null;
  }
}

/**
 * Gets document statistics by type for a business
 * @param businessId - The business ID
 * @returns Document statistics by type
 */
export async function getDocumentStatisticsByType(
  businessId: string
): Promise<Record<
  DocumentType,
  {
    total: number;
    expired: number;
    expiring_soon: number;
  }
> | null> {
  try {
    const documents = await getBusinessDocuments(businessId);
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 30);

    const todayStr = today.toISOString().split("T")[0];
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const statistics: Record<
      DocumentType,
      {
        total: number;
        expired: number;
        expiring_soon: number;
      }
    > = {
      contract: { total: 0, expired: 0, expiring_soon: 0 },
      id_document: { total: 0, expired: 0, expiring_soon: 0 },
      tax_form: { total: 0, expired: 0, expiring_soon: 0 },
      certification: { total: 0, expired: 0, expiring_soon: 0 },
      training_record: { total: 0, expired: 0, expiring_soon: 0 },
      other: { total: 0, expired: 0, expiring_soon: 0 },
    };

    for (const document of documents) {
      statistics[document.document_type].total++;

      if (document.expiration_date) {
        if (document.expiration_date < todayStr) {
          statistics[document.document_type].expired++;
        } else if (document.expiration_date <= futureDateStr) {
          statistics[document.document_type].expiring_soon++;
        }
      }
    }

    return statistics;
  } catch (error) {
    console.error("Error getting document statistics by type:", error);
    return null;
  }
}

/**
 * Bulk updates document expiration dates
 * @param businessId - The business ID
 * @param updates - Array of document ID and new expiration date pairs
 * @returns Number of documents updated successfully
 */
export async function bulkUpdateDocumentExpirations(
  businessId: string,
  updates: Array<{ documentId: string; expirationDate: string }>
): Promise<number> {
  try {
    let successCount = 0;

    for (const update of updates) {
      const result = await updateStaffDocument(update.documentId, businessId, {
        expiration_date: update.expirationDate,
      });

      if (result) {
        successCount++;
      }
    }

    return successCount;
  } catch (error) {
    console.error("Error bulk updating document expirations:", error);
    return 0;
  }
}
