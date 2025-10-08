"use client";

import { useCallback, useState, forwardRef } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { XCircle, UploadCloud, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { uploadImage } from "@/actions/image-upload-actions";

const ImageDropzone = forwardRef<
  HTMLDivElement,
  {
    previewImage?: string;
    onFileAccepted: (file: File) => void;
    onImageUploaded?: (url: string) => void;
    uploadType?: "profile" | "cover" | "menu";
  }
>(function ImageDropzone(
  { previewImage, onFileAccepted, onImageUploaded, uploadType = "profile" },
  ref
) {
  const [preview, setPreview] = useState<string | undefined>(previewImage);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        // Set local preview immediately
        const localPreview = URL.createObjectURL(file);
        setPreview(localPreview);
        onFileAccepted(file);

        // Upload to Supabase Storage
        if (onImageUploaded) {
          setIsUploading(true);
          toast.loading(`Uploading ${uploadType} image...`, {
            id: `upload-${uploadType}`,
          });

          try {
            const result = await uploadImage(file, uploadType);

            toast.dismiss(`upload-${uploadType}`);

            if (result.success && result.url) {
              // Update preview with the uploaded URL
              setPreview(result.url);
              onImageUploaded(result.url);

              toast.success(`${uploadType} image uploaded successfully!`);
            } else {
              toast.error(
                result.error || `Failed to upload ${uploadType} image`
              );
              // Revert to original preview on error
              setPreview(previewImage);
            }
          } catch (error) {
            toast.dismiss(`upload-${uploadType}`);
            toast.error(`Failed to upload ${uploadType} image`);
            console.error("Upload error:", error);
            // Revert to original preview on error
            setPreview(previewImage);
          } finally {
            setIsUploading(false);
          }
        }
      }
    },
    [onFileAccepted, onImageUploaded, uploadType, previewImage]
  );

  const removePreview = () => {
    setPreview(undefined);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
  });

  return (
    <div className="w-full" ref={ref}>
      <div
        {...getRootProps({
          className: cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300",
            isDragActive
              ? "border-primary/80 bg-black/10 dark:bg-white/10"
              : "border-input",
            isUploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          ),
        })}
      >
        <input {...getInputProps()} disabled={isUploading} />

        <div className="flex flex-col items-center space-y-2">
          {isUploading ? (
            <Loader2 className="size-10 text-primary animate-spin" />
          ) : (
            <UploadCloud className="size-10 text-primary" />
          )}

          <p className="text-sm text-foreground/80">
            {isUploading ? "Uploading..." : "Drag your images or click here"}
          </p>

          <p className="text-xs italic text-muted-foreground">
            (Only *.jpeg, *.webp and *.png images will be accepted)
          </p>
        </div>
      </div>

      {preview && (
        <div className="size-28 p-2 rounded-md relative border border-input mt-4">
          <Image
            src={preview}
            alt="Preview"
            width={96}
            height={96}
            className="size-full object-cover"
          />

          <button
            onClick={removePreview}
            className="absolute -top-2 -right-2 text-red-500"
          >
            <XCircle className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
});

export default ImageDropzone;
