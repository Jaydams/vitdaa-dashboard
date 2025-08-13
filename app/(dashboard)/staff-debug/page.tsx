"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string | null;
  is_active: boolean;
  role: string;
  business_id: string;
}

export default function StaffDebugPage() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingPins, setResettingPins] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchStaffMembers() {
      try {
        const response = await fetch("/api/staff");
        if (!response.ok) {
          throw new Error("Failed to fetch staff members");
        }
        const data = await response.json();
        setStaffMembers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchStaffMembers();
  }, []);

  const resetPin = async (staffId: string) => {
    setResettingPins(prev => new Set(prev).add(staffId));
    
    try {
      const response = await fetch(`/api/staff/${staffId}/reset-pin`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to reset PIN");
      }
      
      const data = await response.json();
      toast.success(`PIN reset successfully! New PIN: ${data.pin}`);
    } catch (err) {
      toast.error("Failed to reset PIN");
    } finally {
      setResettingPins(prev => {
        const newSet = new Set(prev);
        newSet.delete(staffId);
        return newSet;
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading staff members...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Staff Members Debug</h1>
      <div className="grid gap-4">
        {staffMembers.map((staff) => (
          <Card key={staff.id}>
            <CardHeader>
              <CardTitle>
                {staff.first_name} {staff.last_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>ID:</strong> {staff.id}</p>
                <p><strong>Email:</strong> {staff.email || "No email"}</p>
                <p><strong>Username:</strong> {staff.username || "No username"}</p>
                <p><strong>Role:</strong> {staff.role}</p>
                <p><strong>Active:</strong> {staff.is_active ? "Yes" : "No"}</p>
                <p><strong>Business ID:</strong> {staff.business_id}</p>
                <Button 
                  onClick={() => resetPin(staff.id)}
                  disabled={resettingPins.has(staff.id)}
                  size="sm"
                >
                  {resettingPins.has(staff.id) ? "Resetting..." : "Reset PIN"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {staffMembers.length === 0 && (
        <p className="text-gray-500">No staff members found.</p>
      )}
    </div>
  );
} 