"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { addMenu } from "@/data/categories";
import { Plus } from "lucide-react";

export default function CategoryActions({ ownerId }: { ownerId: string }) {
  const [open, setOpen] = useState(false);
  const [menuName, setMenuName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData();
    formData.append("menu_name", menuName);
    formData.append("owner_id", ownerId);
    const result = await addMenu(formData);
    if (result.success) {
      setMenuName("");
      setOpen(false);
    } else {
      setError(result.error || "Failed to add menu");
    }
    setLoading(false);
  };

  return (
    <Card className="mb-5">
      <div className="flex flex-row justify-end gap-4 p-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="default" size="lg">
              <Plus className="mr-2 size-4" /> Add Menu
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add New Menu</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleAddMenu} className="flex flex-col gap-4 mt-4">
              <Input
                placeholder="Menu Name"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                required
              />
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <SheetFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Adding..." : "Add Menu"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </div>
    </Card>
  );
}
