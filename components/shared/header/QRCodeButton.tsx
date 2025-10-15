"use client";

import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";
import QRCodeModal from "@/components/shared/QRCodeModal";
import { useEffect, useState } from "react";

export default function QRCodeButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        aria-label="Generate QR Code"
        disabled
      >
        <QrCode className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <QRCodeModal>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        aria-label="Generate QR Code"
        suppressHydrationWarning
      >
        <QrCode className="h-4 w-4" />
      </Button>
    </QRCodeModal>
  );
}
