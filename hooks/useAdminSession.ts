"use client";

import { useState, useEffect, useCallback } from "react";

interface AdminSession {
  sessionToken: string;
  expiresAt: string;
  isActive: boolean;
}

interface UseAdminSessionReturn {
  isElevated: boolean;
  sessionToken: string | null;
  timeRemaining: number;
  requestElevation: (businessOwnerId: string) => Promise<boolean>;
  clearElevation: () => void;
  checkElevation: () => boolean;
}

export function useAdminSession(): UseAdminSessionReturn {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Load session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("admin_session");
    if (stored) {
      try {
        const parsedSession = JSON.parse(stored) as AdminSession;
        const expiresAt = new Date(parsedSession.expiresAt);

        if (expiresAt > new Date()) {
          setSession(parsedSession);
          setTimeRemaining(
            Math.ceil((expiresAt.getTime() - Date.now()) / 1000)
          );
        } else {
          // Session expired, clear it
          localStorage.removeItem("admin_session");
        }
      } catch (error) {
        console.error("Error parsing admin session:", error);
        localStorage.removeItem("admin_session");
      }
    }
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (session && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Session expired
            setSession(null);
            localStorage.removeItem("admin_session");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [session, timeRemaining]);

  const requestElevation = useCallback(
    async (businessOwnerId: string): Promise<boolean> => {
      return new Promise((resolve) => {
        // This would typically trigger the AdminPINVerification modal
        // For now, we'll return false to indicate the modal should be shown
        resolve(false);
      });
    },
    []
  );

  const clearElevation = useCallback(() => {
    setSession(null);
    setTimeRemaining(0);
    localStorage.removeItem("admin_session");
  }, []);

  const checkElevation = useCallback(() => {
    if (!session) return false;

    const expiresAt = new Date(session.expiresAt);
    const isValid = expiresAt > new Date();

    if (!isValid) {
      clearElevation();
      return false;
    }

    return true;
  }, [session, clearElevation]);

  // Helper function to set session (used by AdminPINVerification component)
  const setElevatedSession = useCallback(
    (sessionToken: string, expiresAt: string) => {
      const newSession: AdminSession = {
        sessionToken,
        expiresAt,
        isActive: true,
      };

      setSession(newSession);
      setTimeRemaining(
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      localStorage.setItem("admin_session", JSON.stringify(newSession));
    },
    []
  );

  // Expose setElevatedSession for use by AdminPINVerification
  (useAdminSession as any).setElevatedSession = setElevatedSession;

  return {
    isElevated: session !== null && checkElevation(),
    sessionToken: session?.sessionToken || null,
    timeRemaining,
    requestElevation,
    clearElevation,
    checkElevation,
  };
}
