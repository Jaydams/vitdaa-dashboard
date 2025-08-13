"use client";

import { useSearchParams } from "next/navigation";
import {
  useQuery,
  keepPreviousData,
  useQueryClient,
} from "@tanstack/react-query";

// Assuming correct alias paths
import MenuTable from "./Table";
import TableSkeleton from "@/components/shared/TableSkeleton";
import TableError from "@/components/shared/TableError";
import { MenuColumns, skeletonColumns } from "./columns"; // Renamed from 'columns' to 'MenuColumns'
// import {
// Local MenuItem type (copied from data/menu.ts)
interface MenuItem {
  id: number;
  menu_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  created_at?: string;
  profile_image_url?: string;
  status?: "available" | "unavailable";
}
//   fetchMenu,
//   addMenuItem,
//   updateMenuItem,
//   deleteMenuItem,
// } from "@data/menu.ts"; // Import server actions
import { useState, useCallback } from "react"; // Added useCallback
import EditMenu from "../EditMenu"; // Import EditMenu component
import { Sheet, SheetContent } from "@/components/ui/sheet"; // Assuming Sheet components are imported
import {
  addMenuItem,
  deleteMenuItem,
  fetchMenu,
  updateMenuItem,
} from "@/data/menu";

import type { PaginationData } from "@/types/pagination";

type PaginationFields = Omit<PaginationData<MenuItem>, "data">;

type AllMenuProps = {
  initialData: MenuItem[];
  initialPagination: PaginationFields;
  ownerId: string;
  perPage?: number;
};

export default function AllMenu({
  initialData,
  initialPagination,
  ownerId,
  perPage = 10,
}: AllMenuProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const productsPage = searchParams.get("page");
  const page = Math.trunc(Number(productsPage)) || 1; // Current page from URL params

  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false); // State for controlling the edit/add sheet
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null
  ); // State to hold item being edited

  // useQuery will fetch data. It uses initialData for the first render
  // and then fetches new data (e.g., for different pages) or re-fetches
  // when invalidated.
  const {
    data: products,
    isLoading,
    isError,
    refetch, // refetch function from react-query
  } = useQuery({
    queryKey: ["menuItems", page, ownerId], // Add ownerId to query key
    queryFn: async () => fetchMenu({ page, perPage, ownerId }), // Always use prop
    placeholderData: keepPreviousData, // Keeps previous data while fetching new
    initialData: { data: initialData, ...initialPagination }, // Provide initial data from server
    select: (queryData) => {
      const { data, pages, items, first, last, next, prev } = queryData;
      return {
        data,
        pages,
        items,
        first,
        last,
        next,
        prev,
        current: page < 1 ? 1 : Math.min(page, pages),
        perPage,
      };
    },
  });

  // Callback to open the edit sheet with a specific menu item
  const handleOpenEditSheet = useCallback((item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsEditSheetOpen(true);
  }, []);

  // Callback to close the edit/add sheet and clear selected item
  const handleCloseEditSheet = useCallback(() => {
    setIsEditSheetOpen(false);
    setSelectedMenuItem(null);
  }, []);

  /**
   * Handles saving (adding or updating) a menu item.
   * Calls the appropriate server action and invalidates the query cache.
   * @param {FormData} formData - The FormData object containing item details and image.
   * @param {number} [id] - The ID of the item if updating, undefined if adding.
   */
  const handleSaveMenuItem = async (formData: FormData, id?: number) => {
    let result;
    if (typeof id === "number") {
      result = await updateMenuItem(id, formData); // Call update server action
    } else {
      result = await addMenuItem(formData); // Call add server action
    }

    if (result.success) {
      console.log("Menu item saved successfully!");
      // revalidatePath is handled inside the server actions
      queryClient.invalidateQueries({ queryKey: ["menuItems"] }); // TanStack Query v5+ API
      handleCloseEditSheet(); // Close the sheet on success
    } else {
      console.error("Failed to save menu item:", result.error);
      // TODO: Implement user-facing error message display (e.g., a toast notification)
    }
  };

  /**
   * Handles deleting a menu item.
   * Calls the delete server action and invalidates the query cache.
   * @param {number} id - The ID of the item to delete.
   */
  const handleDeleteMenuItem = async (id: number) => {
    const result = await deleteMenuItem(id); // Call delete server action
    if (result.success) {
      console.log("Menu item deleted successfully!");
      // revalidatePath is handled inside the server action
      queryClient.invalidateQueries({ queryKey: ["menuItems"] }); // TanStack Query v5+ API
    } else {
      console.error("Failed to delete menu item:", result.error);
      // TODO: Implement user-facing error message display
    }
  };

  // Display skeleton while loading
  if (isLoading)
    return <TableSkeleton perPage={perPage} columns={skeletonColumns} />;

  // Display error message if data fetching failed
  if (isError || !products)
    return (
      <TableError
        errorMessage="Something went wrong while trying to fetch menu items."
        refetch={refetch} // Provide refetch function for retry
      />
    );

  return (
    <>
      {/* MenuTable component displays the data */}
      <MenuTable
        columns={MenuColumns}
        data={products.data}
        pagination={products} // Pass the full products object as pagination
        tableOptions={{
          meta: {
            // Pass functions to be used within the columns' cell renderers
            openEditSheet: handleOpenEditSheet,
            handleDelete: handleDeleteMenuItem,
          },
        }}
      />

      {/* Sheet for Add/Edit operations. Controlled by state in this component */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="flex flex-col">
          <EditMenu
            initialData={selectedMenuItem} // Pass selected item for editing, or null for adding
            onClose={handleCloseEditSheet} // Callback to close the sheet
            onSave={handleSaveMenuItem} // Callback to save data
            ownerId={ownerId || undefined}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
