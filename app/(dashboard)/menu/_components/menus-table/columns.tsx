import Image from "next/image"; // Next.js Image component
import { PenSquare, Trash2 } from "lucide-react"; // Icons
import { ColumnDef } from "@tanstack/react-table"; // Tanstack Table column definition type

// Assuming correct alias paths for UI components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import Typography from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Type Definitions (Re-declared for clarity within this file) ---
// Matches the structure of your 'menu_items' table and UI requirements
interface MenuItem {
  id: number;
  menu_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string; // URL of the uploaded image in Supabase Storage
  created_at?: string;
  profile_image_url?: string;
  status?: "available" | "unavailable"; // UI status for the dashboard
  menu_name?: string; // Add menu_name for joined menu
}

// Type for skeleton columns (for loading states)
interface SkeletonColumn {
  header: React.ReactNode;
  cell: React.ReactNode;
}

// Placeholder function for switch change (if 'published' was a DB field)

// Map UI status to badge variants (assuming ProductBadgeVariants from your constants)
const MenuItemBadgeVariants: Record<
  "available" | "unavailable",
  "default" | "destructive"
> = {
  available: "default",
  unavailable: "destructive",
};

export const MenuColumns: ColumnDef<MenuItem>[] = [
  {
    // Checkbox for row selection
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate") // "indeterminate" for partially selected
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    header: "Menu",
    accessorKey: "menu_name",
    cell: ({ row }) => (
      <Typography className="block truncate">
        {row.original.menu_name || "N/A"}
      </Typography>
    ),
  },

  {
    // Menu Item Name column, including image and truncated text
    header: "Menu Item Name",
    accessorKey: "name", // Directly use accessorKey for simpler data access
    cell: ({ row }) => (
      <div className="flex gap-2 items-center">
        {row.original.image_url ? ( // Check if image_url exists
          <Image
            src={row.original.image_url}
            alt={row.original.name}
            width={32}
            height={32}
            className="size-8 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.src =
                "https://placehold.co/32x32/E0E0E0/808080?text=No+Img";
            }} // Fallback image on error
          />
        ) : (
          // Placeholder if no image_url is provided
          <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
            No Img
          </div>
        )}

        <Typography className="capitalize block truncate">
          {row.original.name}
        </Typography>
      </div>
    ),
  },
  {
    // Description column, with truncation for long descriptions
    header: "Description",
    accessorKey: "description",
    cell: ({ row }) => (
      <Typography className="block max-w-52 truncate">
        {row.original.description || "N/A"}{" "}
        {/* Display 'N/A' if description is empty */}
      </Typography>
    ),
  },
  {
    // Price column, formatted as currency
    header: "Price",
    accessorKey: "price",
    cell: ({ row }) => {
      // Format price as NGN currency
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "NGN",
      }).format(row.original.price);
    },
  },
  {
    // Status column, using Badge component for visual indication
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => {
      // Default to 'unavailable' if status is not explicitly set
      const status = row.original.status || "available";

      return (
        <Badge
          variant={MenuItemBadgeVariants[status]}
          className="flex-shrink-0 text-xs"
        >
          {status === "available" ? "Available" : "Unavailable"}
        </Badge>
      );
    },
  },
  {
    // Actions column (Edit and Delete buttons)
    header: "Actions",
    id: "actions", // Unique ID for this column
    cell: ({ row, table }) => {
      // Access openEditSheet and handleDelete functions passed via table meta
      const meta = table.options.meta as {
        openEditSheet: (item: MenuItem) => void;
        handleDelete: (id: number) => void;
      };
      const openEditSheet = meta?.openEditSheet;
      const handleDelete = meta?.handleDelete;

      return (
        <div className="flex items-center gap-1">
          {/* Edit Button */}
          <Sheet>
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground"
                    onClick={() => openEditSheet && openEditSheet(row.original)} // Call openEditSheet with the current row's data
                  >
                    <PenSquare className="size-5" />
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>

              <TooltipContent>
                <p>Edit Menu Item</p>
              </TooltipContent>
            </Tooltip>
          </Sheet>

          {/* Delete Button (with AlertDialog confirmation) */}
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground"
                  >
                    <Trash2 className="size-5" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>

              <TooltipContent>
                <p>Delete Menu Item</p>
              </TooltipContent>
            </Tooltip>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  menu item:{" "}
                  <span className="font-bold">{row.original.name}</span>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete && handleDelete(row.original.id)}
                >
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      );
    },
  },
];

// Skeleton columns for loading states, providing a visual placeholder
export const skeletonColumns: SkeletonColumn[] = [
  {
    header: <Checkbox disabled checked={false} />,
    cell: <Skeleton className="size-4 rounded-sm" />,
  },
  {
    header: "menu item name",
    cell: (
      <div className="flex gap-2 items-center">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="w-28 h-8" />
      </div>
    ),
  },
  {
    header: "description",
    cell: <Skeleton className="w-48 h-8" />,
  },
  {
    header: "price",
    cell: <Skeleton className="w-20 h-8" />,
  },
  {
    header: "status",
    cell: <Skeleton className="w-24 h-8" />,
  },
  {
    header: "actions",
    cell: <Skeleton className="w-20 h-8" />,
  },
];
