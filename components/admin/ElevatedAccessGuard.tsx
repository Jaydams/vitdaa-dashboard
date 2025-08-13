"use client";

import { useState, useEffect } from "react";
import { useAdminSession } from "@/hooks/useAdminSession";
import AdminPINVerification from "./AdminPINVerification";

interface ElevatedAccessGuardProps {
  children: React.ReactNode;
  businessOwnerId: string;
  title?: string;
  description?: string;
  fallback?: React.ReactNode;
  onAccessGranted?: () => void;
  onAccessDenied?: () => void;
}

export default function ElevatedAccessGuard({
  children,
  businessOwnerId,
  title,
  description,
  fallback,
  onAccessGranted,
  onAccessDenied,
}: ElevatedAccessGuardProps) {
  const { isElevated, checkElevation } = useAdminSession();
  const [showVerification, setShowVerification] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const elevated = checkElevation();
    setHasAccess(elevated);

    if (elevated) {
      onAccessGranted?.();
    } else {
      onAccessDenied?.();
    }
  }, [isElevated, checkElevation, onAccessGranted, onAccessDenied]);

  const handleRequestAccess = () => {
    if (checkElevation()) {
      setHasAccess(true);
      onAccessGranted?.();
    } else {
      setShowVerification(true);
    }
  };

  const handleVerificationSuccess = (sessionToken: string) => {
    // Update the admin session hook with the new session
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
    (useAdminSession as any).setElevatedSession?.(sessionToken, expiresAt);

    setHasAccess(true);
    setShowVerification(false);
    onAccessGranted?.();
  };

  const handleVerificationClose = () => {
    setShowVerification(false);
    onAccessDenied?.();
  };

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <>
      {fallback || (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Elevated Access Required
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              This action requires admin privileges. Please verify your admin
              PIN to continue.
            </p>
            <button
              onClick={handleRequestAccess}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Verify Admin PIN
            </button>
          </div>
        </div>
      )}

      <AdminPINVerification
        isOpen={showVerification}
        onClose={handleVerificationClose}
        onSuccess={handleVerificationSuccess}
        businessOwnerId={businessOwnerId}
        title={title}
        description={description}
      />
    </>
  );
}
