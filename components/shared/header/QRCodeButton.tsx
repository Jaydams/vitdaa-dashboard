"use client";

import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import QRCodeModal from "@/components/shared/QRCodeModal";

export default function QRCodeButton() {
  return (
    <QRCodeModal>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        aria-label="Generate QR Code"
      >
        <QrCode className="h-4 w-4" />
      </Button>
    </QRCodeModal>
  );
}
