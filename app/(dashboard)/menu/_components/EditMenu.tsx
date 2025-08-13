"use client";

import { X } from "lucide-react";
// Assuming correct alias paths for UI components
import { Button } from "@/components/ui/button";
import {
  SheetClose,
  SheetHeader,
  SheetDescription,
  SheetFooter,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Ensure Select components are imported
import { useState, useEffect } from "react";
import Image from "next/image";
import { fetchAllMenus } from "@/data/menu";

// --- Type Definitions (Re-declared for clarity within this file) ---
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
  menu_name?: string;
}

interface Menu {
  id: string;
  menu_name: string;
}

// Props for the EditMenu component
type EditMenuProps = {
  initialData: MenuItem | null; // The menu item data if editing, or null if adding
  onClose: () => void; // Callback to close the sheet
  onSave: (formData: FormData, id?: number) => Promise<void>; // Callback to save data, expects FormData
};

/**
 * Client-side utility function to compress an image file using Canvas.
 * @param {File} file - The image file to compress.
 * @param {number} maxWidth - Maximum width for the compressed image.
 * @param {number} maxHeight - Maximum height for the compressed image.
 * @param {number} quality - JPEG/WebP quality (0.0 to 1.0).
 * @returns {Promise<File | Blob>} - A Promise that resolves with the compressed File or Blob.
 */
async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.7
): Promise<File | Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file); // Read the file as a Data URL

    reader.onload = (event) => {
      const img = document.createElement("img");
      img.src = event.target?.result as string; // Set image source to the Data URL

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height); // Draw image to canvas with new dimensions

          // Convert canvas content to Blob (compressed image data)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create a new File object from the compressed Blob, retaining original file name
                const compressedFile = new File([blob], file.name, {
                  type: blob.type,
                  lastModified: Date.now(), // Set last modified date
                });
                resolve(compressedFile);
              } else {
                resolve(file); // Fallback: resolve with original file if blob creation fails
              }
            },
            file.type,
            quality
          ); // Specify output type and quality
        } else {
          resolve(file); // Fallback: resolve with original file if context is not available
        }
      };
      img.onerror = () => resolve(file); // Fallback: resolve with original file if image fails to load
    };
    reader.onerror = () => resolve(file); // Fallback: resolve with original file if file read fails
  });
}

type EditMenuPropsWithOwner = EditMenuProps & { ownerId: string };

function EditMenu({
  initialData,
  onClose,
  onSave,
  ownerId,
}: EditMenuPropsWithOwner) {
  const isEditMode = !!initialData; // Determine if in edit mode based on initialData presence
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || ""
  );

  // Use string for price input to avoid NaN issues
  const [price, setPrice] = useState(initialData?.price?.toString() || "");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    initialData?.image_url || null
  ); // URL for displaying image preview
  const [status, setStatus] = useState(initialData?.status || "available"); // UI state for status
  const [clearImage, setClearImage] = useState(false); // Flag to indicate if user wants to clear image

  // Fix: Add missing selectedImageFile state
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  // Menu selection state (must be at top level, not inside useEffect or conditionals)
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | undefined>(
    initialData?.menu_id
  );
  const [menuSearch, setMenuSearch] = useState("");

  // Fetch all menus for dropdown
  useEffect(() => {
    if (ownerId) {
      fetchAllMenus(ownerId)
        .then((menus) => {
          console.log("Fetched menus:", menus);
          setMenus(menus);
        })
        .catch((err) => {
          console.error("Error fetching menus:", err);
        });
    }
  }, [ownerId]);

  // Reset selectedMenuId when initialData changes
  useEffect(() => {
    setSelectedMenuId(initialData?.menu_id);
  }, [initialData]);

  // Effect to reset form/image preview when initialData changes (e.g., opening sheet for a new item)
  useEffect(() => {
    if (!initialData) {
      // If no initialData, it's an 'Add' operation
      setName("");
      setDescription("");
      setPrice("");
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      setStatus("available");
      setClearImage(false);
      setSelectedMenuId(undefined);
    } else {
      setImagePreviewUrl(initialData.image_url || null);
      setStatus(initialData.status || "available");
      setSelectedImageFile(null); // Clear selected file when editing existing item
      setClearImage(false); // Reset clear image flag
      setSelectedMenuId(initialData.menu_id);
    }
  }, [initialData]);

  /**
   * Handles changes to the file input (image selection).
   * Compresses the selected image before storing it in state.
   */
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress the image before storing it
      const compressedFile = await compressImage(file, 800, 600, 0.7); // Adjust dimensions and quality as needed
      setSelectedImageFile(compressedFile as File); // Store the compressed File object
      setImagePreviewUrl(URL.createObjectURL(compressedFile)); // Create URL for preview
      setClearImage(false); // If a new image is selected, don't mark for clearing
    } else {
      setSelectedImageFile(null);
      // If no file is selected, revert preview to initial image or clear it
      if (!clearImage) {
        // Only change if not explicitly clearing
        setImagePreviewUrl(initialData?.image_url || null);
      }
    }
  };

  /**
   * Handles clearing the image. Sets preview to null and marks for server-side deletion.
   */
  const handleClearImage = () => {
    setSelectedImageFile(null); // Clear selected file
    setImagePreviewUrl(null); // Clear image preview
    setClearImage(true); // Set flag to tell server action to remove image
  };

  /**
   * Handles form submission. Creates FormData and calls the onSave prop.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission to handle it manually

    const formData = new FormData(); // Create a new FormData object
    formData.append("name", name);
    formData.append("description", description);
    formData.append("price", price.toString());
    formData.append("price", price ? price.toString() : "0");
    if (selectedMenuId) {
      formData.append("menu_id", selectedMenuId);
    }

    // Append the selected image file if it exists
    if (selectedImageFile) {
      formData.append("imageFile", selectedImageFile);
    } else if (clearImage) {
      // If user explicitly cleared image, send a flag to the server action
      formData.append("clearImage", "true");
    } else if (imagePreviewUrl && isEditMode) {
      // If in edit mode and no new file was selected, but an image URL exists,
      // send the current URL to inform the server action to keep the existing image.
      formData.append("currentImageUrl", imagePreviewUrl);
    }

    // Call the onSave prop, passing the FormData and item ID (if in edit mode)
    await onSave(formData, initialData?.id);
  };

  return (
    <>
      <SheetHeader className="flex-row gap-4 justify-between text-left bg-background p-6">
        <div className="flex flex-col">
          <SheetTitle>
            {isEditMode ? "Edit Menu Item" : "Add Menu Item"}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? "Edit your menu item details here."
              : "Add your menu item and necessary information from here."}
          </SheetDescription>
        </div>

        <SheetClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground flex-shrink-0"
            onClick={onClose} // Close sheet on button click
          >
            <X className="size-6" />
          </Button>
        </SheetClose>
      </SheetHeader>

      <form
        onSubmit={handleSubmit}
        className="flex-grow flex flex-col justify-between"
      >
        <div className="grid gap-4 py-4 px-6">
          {/* Name Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>

          {/* Description Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Price Input */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price
            </Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="col-span-3"
              required
              step="0.01"
            />
          </div>

          {/* Menu Select Dropdown (scrollable and searchable) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="menu" className="text-right">
              Menu
            </Label>
            <Select
              value={
                selectedMenuId === undefined
                  ? undefined
                  : String(selectedMenuId)
              }
              onValueChange={(val) =>
                setSelectedMenuId(val === "" ? undefined : val)
              }
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Menu" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                <div className="sticky top-0 z-10 bg-white px-2 py-1">
                  <input
                    type="text"
                    placeholder="Search menu..."
                    className="w-full border rounded px-2 py-1 text-sm mb-2"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                  />
                </div>
                {menus
                  .filter((menu) =>
                    menu.menu_name
                      .toLowerCase()
                      .includes(menuSearch.toLowerCase())
                  )
                  .map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.menu_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Image Upload Input and Preview */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image" className="text-right">
              Image
            </Label>
            <div className="col-span-3 flex flex-col gap-2">
              <Input
                id="image"
                type="file"
                onChange={handleImageChange}
                accept="image/*"
              />
              {imagePreviewUrl && (
                <div className="relative w-32 h-32 border-2 border-gray-200 rounded-lg shadow-md overflow-hidden flex items-center justify-center bg-white">
                  <Image
                    src={imagePreviewUrl}
                    alt="Selected menu item preview"
                    className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                    height={128}
                    width={128}
                    style={{ objectFit: "cover" }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 bg-white/80 hover:bg-red-100 border border-gray-300 shadow-sm"
                    onClick={handleClearImage}
                    aria-label="Clear image preview"
                  >
                    <X className="size-4 text-gray-700 hover:text-red-500 transition-colors" />
                  </Button>
                </div>
              )}
              {/* Show "Clear Existing Image" button only if there's an initial image and no new one selected */}
              {!imagePreviewUrl && initialData?.image_url && (
                <Button
                  type="button"
                  onClick={handleClearImage}
                  variant="secondary"
                >
                  Clear Existing Image
                </Button>
              )}
            </div>
          </div>

          {/* Status Select */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as "available" | "unavailable")
              }
            >
              {" "}
              {/* Use onValueChange for shadcn/ui Select */}
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="unavailable">Unavailable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="px-6">
          <SheetClose asChild>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={onClose}
            >
              Cancel
            </Button>
          </SheetClose>

          <Button type="submit" size="lg" className="w-full">
            {isEditMode ? "Save Changes" : "Add Menu Item"}
          </Button>
        </SheetFooter>
      </form>
    </>
  );
}

export default EditMenu;
