"use client";

import { useSearchParams } from "next/navigation";
import {
  useQuery,
  keepPreviousData,
  useQueryClient,
} from "@tanstack/react-query";
import { useState, useCallback } from "react";

// Components
import { MenuGridLayout } from "@/components/menu-grid/MenuGridLayout";
import { MenuGrid } from "@/components/menu-grid/MenuGrid";
import { OrderFormPanel } from "@/components/menu-grid/OrderFormPanel";
import { CreateOrderModal } from "@/components/menu-grid/CreateOrderModal";
import TableSkeleton from "@/components/shared/TableSkeleton";
import TableError from "@/components/shared/TableError";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Typography from "@/components/ui/typography";
import EditMenu from "./EditMenu";

// Hooks and utilities
import { useOrderState } from "@/hooks/use-order-state";
import { useBusinessSettings } from "@/hooks/use-business-settings";
import {
  addMenuItem,
  deleteMenuItem,
  fetchMenu,
  updateMenuItem,
} from "@/data/menu";
import { getPaginationButtons } from "@/helpers/getPaginationButtons";

// Types
import type { PaginationData } from "@/types/pagination";

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

type PaginationFields = Omit<PaginationData<MenuItem>, "data">;

interface MenuGridWithOrderProps {
  initialData: MenuItem[];
  initialPagination: PaginationFields;
  ownerId: string;
  perPage?: number;
}

export function MenuGridWithOrder({
  initialData,
  initialPagination,
  ownerId,
  perPage = 10,
}: MenuGridWithOrderProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const productsPage = searchParams.get("page");
  const search = searchParams.get("search");
  const page = Math.trunc(Number(productsPage)) || 1;

  // Order state management
  const {
    orderItems,
    isOrderPanelVisible,
    addItem,
    updateQuantity,
    removeItem,
    clearOrder,
    toggleOrderPanel,
    calculations,
  } = useOrderState();

  // Business settings for calculations
  const { settings: businessSettings } = useBusinessSettings();

  // Edit menu state
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(
    null
  );

  // Order completion modal state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Fetch menu data
  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["menuItems", page, ownerId, search],
    queryFn: async () =>
      fetchMenu({ page, perPage, ownerId, search: search || undefined }),
    placeholderData: keepPreviousData,
    initialData: { data: initialData, ...initialPagination },
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

  // Menu item click handler - adds to order
  const handleMenuItemClick = useCallback(
    (item: MenuItem) => {
      addItem(item);
    },
    [addItem]
  );

  // Edit menu handlers
  const handleOpenEditSheet = useCallback((item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsEditSheetOpen(true);
  }, []);

  const handleCloseEditSheet = useCallback(() => {
    setIsEditSheetOpen(false);
    setSelectedMenuItem(null);
  }, []);

  const handleSaveMenuItem = async (formData: FormData, id?: number) => {
    let result;
    if (typeof id === "number") {
      result = await updateMenuItem(id, formData);
    } else {
      result = await addMenuItem(formData);
    }

    if (result.success) {
      console.log("Menu item saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      handleCloseEditSheet();
    } else {
      console.error("Failed to save menu item:", result.error);
    }
  };

  const handleDeleteMenuItem = async (id: number) => {
    const result = await deleteMenuItem(id);
    if (result.success) {
      console.log("Menu item deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
    } else {
      console.error("Failed to delete menu item:", result.error);
    }
  };

  // Order completion handlers
  const handleCompleteOrder = useCallback(() => {
    setIsOrderModalOpen(true);
  }, []);

  const handleOrderSuccess = useCallback(() => {
    clearOrder();
    setIsOrderModalOpen(false);
  }, [clearOrder]);

  const handleOrderCancel = useCallback(() => {
    setIsOrderModalOpen(false);
  }, []);

  // Build pagination URLs with current search parameters
  const buildPaginationUrl = (pageNum: number | null) => {
    if (!pageNum) return "#";
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNum.toString());
    return `?${params.toString()}`;
  };

  // Display skeleton while loading
  if (isLoading) {
    return (
      <MenuGridLayout
        orderPanelVisible={isOrderPanelVisible}
        onToggleOrderPanel={toggleOrderPanel}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: perPage }).map((_, index) => (
            <div
              key={index}
              className="bg-gray-200 animate-pulse rounded-lg h-64"
            />
          ))}
        </div>
      </MenuGridLayout>
    );
  }

  // Display error message if data fetching failed
  if (isError || !products) {
    return (
      <TableError
        errorMessage="Something went wrong while trying to fetch menu items."
        refetch={refetch}
      />
    );
  }

  // Get pagination buttons
  const paginationButtons = products
    ? getPaginationButtons({
        totalPages: products.pages,
        currentPage: products.current,
      })
    : [];

  return (
    <>
      <MenuGridLayout
        orderPanelVisible={isOrderPanelVisible}
        onToggleOrderPanel={toggleOrderPanel}
        orderPanel={
          isOrderPanelVisible ? (
            <OrderFormPanel
              visible={isOrderPanelVisible}
              orderItems={orderItems}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onCompleteOrder={handleCompleteOrder}
              onClearOrder={clearOrder}
              onToggleVisibility={toggleOrderPanel}
              calculations={calculations}
            />
          ) : null
        }
      >
        <div className="space-y-4">
          <MenuGrid
            menuItems={products.data}
            onItemClick={handleMenuItemClick}
            onEditItem={handleOpenEditSheet}
            onDeleteItem={handleDeleteMenuItem}
            loading={isLoading}
          />

          {/* Pagination */}
          {products && products.pages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-3.5 p-4 bg-popover text-muted-foreground rounded-lg">
              <Typography className="text-sm flex-shrink-0 uppercase font-medium">
                Showing{" "}
                {Math.max(
                  ((products.current || 1) - 1) * (products.perPage || 10) + 1,
                  1
                )}{" "}
                to{" "}
                {Math.min(
                  (products.current || 1) * (products.perPage || 10),
                  products.items || 0
                )}{" "}
                of {products.items || 0}
              </Typography>

              <Pagination>
                <PaginationContent className="flex-wrap">
                  <PaginationItem>
                    <PaginationPrevious
                      href={buildPaginationUrl(products.prev)}
                      disabled={!products.prev}
                    />
                  </PaginationItem>

                  {paginationButtons.map((pageButton, index) => (
                    <PaginationItem key={`page-${index}`}>
                      {pageButton === "..." ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href={buildPaginationUrl(pageButton)}
                          isActive={pageButton === products.current}
                        >
                          {pageButton}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href={buildPaginationUrl(products.next)}
                      disabled={!products.next}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </MenuGridLayout>

      {/* Edit Menu Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent className="flex flex-col">
          <EditMenu
            initialData={selectedMenuItem}
            onClose={handleCloseEditSheet}
            onSave={handleSaveMenuItem}
            ownerId={ownerId}
          />
        </SheetContent>
      </Sheet>

      {/* Order Completion Modal */}
      <CreateOrderModal
        open={isOrderModalOpen}
        onOpenChange={(open) => !open && handleOrderCancel()}
        initialItems={orderItems}
        onSuccess={handleOrderSuccess}
      />
    </>
  );
}
