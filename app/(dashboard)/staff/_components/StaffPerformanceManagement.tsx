"use client";

import { Staff } from "@/types/staff";
import { PerformanceManagement } from "@/components/staff/performance/PerformanceManagement";

interface StaffPerformanceManagementProps {
  staffId: string;
  staff: Staff;
}

export default function StaffPerformanceManagement({
  staffId,
  staff,
}: StaffPerformanceManagementProps) {
  return (
    <PerformanceManagement
      staff={staff}
      businessId={staff.business_id}
      reviewerId={staff.business_id} // Assuming business owner is the reviewer
      canEdit={true}
    />
  );
}
