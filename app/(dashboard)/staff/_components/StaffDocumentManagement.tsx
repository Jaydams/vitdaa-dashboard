"use client";

import { Staff } from "@/types/staff";
import { DocumentManagement } from "@/components/staff/documents/DocumentManagement";

interface StaffDocumentManagementProps {
  staffId: string;
  staff: Staff;
}

export default function StaffDocumentManagement({
  staffId,
  staff,
}: StaffDocumentManagementProps) {
  const staffName = `${staff.first_name} ${staff.last_name}`;

  return (
    <DocumentManagement
      staffId={staffId}
      staffName={staffName}
      isReadOnly={false}
    />
  );
}
