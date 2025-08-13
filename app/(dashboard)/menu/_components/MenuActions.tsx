"use client";

import { Upload, Download, PenSquare, Trash2, Plus } from "lucide-react";
// Assuming correct alias paths
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { useState } from "react";
import EditMenu from "./EditMenu"; // Import EditMenu for the 'Add' functionality
import { useOwnerId } from "./menus-table/useOwnerId";
import { useBusinessOwnerId } from "@/hooks/useBusinessOwnerId";
import { useQueryClient } from "@tanstack/react-query"; // To invalidate cache after adding
import { addMenuItem } from "@/data/menu";

// --- Type Definitions (for clarity) ---
// Note: MenuItemFormValues is defined in lib/actions/menu.ts, but re-declared here
// for local type checking if this file were standalone. In a Next.js project,
// you'd typically import shared types.
interface MenuItemFormValues {
  name: string;
  description: string;
  price: number;
  image_url: string; // The URL after upload
  status: "available" | "unavailable"; // UI status
}

export default function MenuActions() {
  const staffOwnerId = useOwnerId();
  const businessOwnerId = useBusinessOwnerId();
  const ownerId = staffOwnerId || businessOwnerId;
  const queryClient = useQueryClient();
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false); // State to control 'Add Menu Item' sheet

  /**
   * Handles saving a new menu item.
   * This is triggered by the EditMenu component when in 'add' mode.
   * @param {FormData} formData - The FormData object from the EditMenu form.
   */
  const handleSaveNewItem = async (formData: FormData) => {
    const result = await addMenuItem(formData); // Call the server action to add item
    if (result.success) {
      console.log("New menu item added successfully!");
      setIsAddSheetOpen(false); // Close the sheet on successful addition
      queryClient.invalidateQueries(["menuItems"]); // Invalidate the menu items query to refetch table data
    } else {
      console.error("Failed to add new menu item:", result.error);
      // TODO: Implement user-facing error message display for adding failure
    }
  };

  /**
   * Placeholder for bulk delete functionality.
   * In a real app, you'd get selected item IDs from the table (e.g., from a shared state)
   * and pass them to a server action for batch deletion.
   */
  const handleBulkDelete = () => {
    alert(
      "Bulk delete functionality is not yet implemented. Please select items and implement the batch deletion logic."
    );
  };

  return (
    <Card className="mb-5">
      <div className="flex flex-col xl:flex-row xl:justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            <Upload className="mr-2 size-4" /> Export
          </Button>

          <Button variant="outline">
            <Download className="mr-2 size-4" /> Import
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="secondary"
            size="lg"
            className="sm:flex-grow xl:flex-grow-0"
          >
            <PenSquare className="mr-2 size-4" /> Bulk Action
          </Button>

          <Button
            variant="destructive"
            size="lg"
            className="sm:flex-grow xl:flex-grow-0"
            onClick={handleBulkDelete}
          >
            <Trash2 className="mr-2 size-4" /> Delete (Bulk)
          </Button>

          {/* Sheet for adding a new menu item */}
          <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="default"
                size="lg"
                className="sm:flex-grow xl:flex-grow-0"
                onClick={() => setIsAddSheetOpen(true)} // Open the sheet when 'Add Menu Item' is clicked
              >
                <Plus className="mr-2 size-4" /> Add Menu Item
              </Button>
            </SheetTrigger>

            {/* Render EditMenu inside SheetContent only when open */}
            {isAddSheetOpen && (
              <SheetContent className="flex flex-col">
                {ownerId ? (
                  <EditMenu
                    initialData={null}
                    onClose={() => setIsAddSheetOpen(false)}
                    onSave={handleSaveNewItem}
                    ownerId={ownerId}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <p className="text-lg font-semibold mb-2">
                      Unable to add menu item
                    </p>
                    <p className="text-muted-foreground mb-4">
                      You must be signed in as a staff member or business owner
                      to add menu items. Please sign in and try again.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => setIsAddSheetOpen(false)}
                    >
                      Close
                    </Button>
                  </div>
                )}
              </SheetContent>
            )}
          </Sheet>
        </div>
      </div>
    </Card>
  );
}
