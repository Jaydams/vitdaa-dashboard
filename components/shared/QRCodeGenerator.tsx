"use client";

import React, { useRef } from "react";
import { QRCode } from "@rtdui/qr-code";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, QrCode } from "lucide-react";
import { toast } from "sonner";

interface QRCodeGeneratorProps {
  businessName: string;
  className?: string;
}

export default function QRCodeGenerator({
  businessName,
  className = "",
}: QRCodeGeneratorProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate the QR code URL with business name
  const qrCodeUrl = `https://app.vitdaa.com/business/${encodeURIComponent(
    businessName
  )}`;

  const downloadQRCode = async () => {
    try {
      if (!qrRef.current) {
        toast.error("QR code not found");
        return;
      }

      // Find the SVG element within the QR code component
      const svgElement = qrRef.current.querySelector("svg");
      if (!svgElement) {
        toast.error("QR code SVG not found");
        return;
      }

      // Create a canvas to convert SVG to PNG
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Canvas context not available");
        return;
      }

      // Set canvas size (make it larger for better quality)
      const size = 1200;
      canvas.width = size;
      canvas.height = size;

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

        // Draw the QR code
        ctx.drawImage(img, 0, 0, size, size);

        // Convert to PNG and download
        canvas.toBlob((blob) => {
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
        }, "image/png");

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
    <Card
      className={`border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 ${className}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <QrCode className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-lg">Business QR Code</CardTitle>
              <CardDescription>
                Share your business with customers
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={downloadQRCode}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div ref={qrRef} className="bg-white p-4 rounded-lg shadow-sm">
            <QRCode
              value={qrCodeUrl}
              icon="/assets/VitdaaLogo.png"
              size={200}
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">
              Scan to visit your business page
            </p>
            <p className="text-xs text-muted-foreground break-all">
              {qrCodeUrl}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
