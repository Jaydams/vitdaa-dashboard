"use client";

import React, { useRef, useState, useEffect } from "react";
import { QRCode } from "@rtdui/qr-code";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, QrCode } from "lucide-react";
import { toast } from "sonner";

interface QRCodeModalProps {
  children: React.ReactNode;
}

export default function QRCodeModal({ children }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [businessName, setBusinessName] = useState("Your Business");
  const [isLoading, setIsLoading] = useState(true);

  // Generate the QR code URL with business name
  const qrCodeUrl = `https://app.vitdaa.com/business/${encodeURIComponent(
    businessName
  )}`;

  useEffect(() => {
    const fetchBusinessName = async () => {
      try {
        const response = await fetch("/api/business/settings");
        if (response.ok) {
          const data = await response.json();
          setBusinessName(data.business_name || "Your Business");
        }
      } catch (error) {
        console.error("Error fetching business name:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessName();
  }, []);

  const downloadQRCode = async () => {
    try {
      if (!qrRef.current) {
        toast.error("QR code not found");
        return;
      }

      // Wait a bit for the QR code to fully render
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try multiple selectors to find the SVG
      let svgElement = qrRef.current.querySelector("svg");

      // If not found, try looking deeper in the DOM
      if (!svgElement) {
        svgElement = qrRef.current.querySelector("div svg");
      }

      // If still not found, try looking for canvas (some QR libraries use canvas)
      if (!svgElement) {
        const canvasElement = qrRef.current.querySelector("canvas");
        if (canvasElement) {
          // If it's a canvas, create a new canvas with padding
          const originalCanvas = canvasElement as HTMLCanvasElement;
          const newCanvas = document.createElement("canvas");
          const newCtx = newCanvas.getContext("2d");

          if (newCtx) {
            const size = 1200; // High resolution for better quality
            newCanvas.width = size;
            newCanvas.height = size;

            // Enable high-quality rendering
            newCtx.imageSmoothingEnabled = false; // Keep sharp edges for QR codes
            newCtx.textRenderingOptimization = "optimizeQuality";

            // Fill white background
            newCtx.fillStyle = "white";
            newCtx.fillRect(0, 0, size, size);

            // Add padding (10% of canvas size)
            const padding = size * 0.1;
            const availableSize = size - padding * 2;

            // Calculate scale and position
            const scale = Math.min(
              availableSize / originalCanvas.width,
              availableSize / originalCanvas.height
            );
            const scaledWidth = originalCanvas.width * scale;
            const scaledHeight = originalCanvas.height * scale;
            const x = (size - scaledWidth) / 2;
            const y = (size - scaledHeight) / 2;

            // Draw the original canvas with padding
            newCtx.drawImage(originalCanvas, x, y, scaledWidth, scaledHeight);

            newCanvas.toBlob(
              (blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${businessName.replace(
                    /[^a-zA-Z0-9]/g,
                    "_"
                  )}_QR_Code.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  toast.success("QR code downloaded successfully!");
                } else {
                  toast.error("Failed to generate PNG from canvas");
                }
              },
              "image/png",
              1.0
            ); // Maximum quality
          }
          return;
        }
      }

      if (!svgElement) {
        console.log("Available elements in qrRef:", qrRef.current.innerHTML);
        toast.error("QR code SVG not found. Please try again.");
        return;
      }

      // Create a canvas to convert SVG to PNG
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Canvas context not available");
        return;
      }

      // Set canvas size (high resolution for better quality)
      const size = 1200;
      canvas.width = size;
      canvas.height = size;

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = false; // Keep sharp edges for QR codes
      ctx.textRenderingOptimization = "optimizeQuality";

      // Get SVG dimensions
      const svgRect = svgElement.getBoundingClientRect();
      const svgWidth = svgRect.width || 200;
      const svgHeight = svgRect.height || 200;

      // Create an image from the SVG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        // Fill white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, size, size);

        // Add padding (20% of canvas size)
        const padding = size * 0.1;
        const availableSize = size - padding * 2;

        // Calculate scale to fit QR code with padding
        const scale = Math.min(
          availableSize / svgWidth,
          availableSize / svgHeight
        );
        const scaledWidth = svgWidth * scale;
        const scaledHeight = svgHeight * scale;

        // Center the QR code
        const x = (size - scaledWidth) / 2;
        const y = (size - scaledHeight) / 2;

        // Draw the QR code with padding
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

        // Convert to PNG and download
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${businessName.replace(
                /[^a-zA-Z0-9]/g,
                "_"
              )}_QR_Code.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              toast.success("QR code downloaded successfully!");
            } else {
              toast.error("Failed to generate PNG");
            }
          },
          "image/png",
          1.0
        ); // Maximum quality

        URL.revokeObjectURL(svgUrl);
      };

      img.onerror = () => {
        toast.error("Failed to load QR code image");
        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;
    } catch (error) {
      console.error("Error downloading QR code:", error);
      toast.error("Failed to download QR code");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Business QR Code
          </DialogTitle>
          <DialogDescription>
            Share your business with customers by scanning this QR code
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          {isLoading ? (
            <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center">
              <QrCode className="h-8 w-8 text-gray-400" />
            </div>
          ) : (
            <div ref={qrRef} className="bg-white p-4 rounded-lg shadow-sm">
              <QRCode
                value={qrCodeUrl}
                icon="/assets/VitdaaLogo.png"
                size={200}
              />
            </div>
          )}
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">
              Scan to visit your business page
            </p>
            <p className="text-xs text-muted-foreground break-all max-w-xs">
              {qrCodeUrl}
            </p>
          </div>
          <Button
            onClick={downloadQRCode}
            className="w-full gap-2"
            disabled={isLoading}
          >
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
