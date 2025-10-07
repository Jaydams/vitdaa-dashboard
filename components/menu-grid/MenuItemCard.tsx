"use client";

import React, { useState } from "react";
import { MenuItem } from "@/data/menu";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAmount } from "@/helpers/formatAmount";
import { Edit, Trash2, Plus } from "lucide-react";
import { MenuItemCardImage } from "./MenuItemImage";

interface MenuItemCardProps {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
  onEdit?: (item: MenuItem) => void;
  onDelete?: (id: number) => void;
  className?: string;
}

/**
 * Individual menu item display card
 * Shows item image, name, price, and availability status
 * Includes hover effects and click animations
 */
export function MenuItemCard({
  item,
  onClick,
  onEdit,
  onDelete,
  className,
}: MenuItemCardProps) {
  const [isClicked, setIsClicked] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const isAvailable = item.status !== "unavailable";

  const handleClick = () => {
    if (!isAvailable) return;

    // Add click animation
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 150);

    // Add success feedback animation
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1000);

    onClick(item);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(item);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      onDelete?.(item.id);
    }
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden transition-all duration-300 ease-out",
        // Enhanced responsive design
        "w-full h-full flex flex-col",
        // Enhanced hover effects with smooth transitions
        "hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.02] sm:hover:scale-[1.03]",
        "hover:-translate-y-1 hover:border-primary/20",
        // Click animation with spring effect
        isClicked &&
          "scale-[0.98] sm:scale-[0.97] transition-transform duration-100",
        // Success feedback animation
        isAdded && "ring-2 ring-green-500 ring-opacity-75 animate-pulse",
        // Disabled state with smooth transition
        !isAvailable &&
          "opacity-60 cursor-not-allowed grayscale hover:scale-100 hover:shadow-none hover:translate-y-0",
        // Responsive minimum heights
        "min-h-[280px] sm:min-h-[300px] lg:min-h-[320px]",
        // Enhanced border and background transitions
        "border-2 border-transparent hover:border-primary/10",
        "bg-gradient-to-br from-card to-card/95",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        {/* Image Container with Error Handling */}
        <div className="relative w-full overflow-hidden">
          <MenuItemCardImage
            src={item.image_url}
            alt={item.name}
            isAvailable={isAvailable}
            className={cn(
              "transition-all duration-500 ease-out",
              "group-hover:scale-110 group-hover:brightness-110",
              "group-hover:saturate-110",
              !isAvailable && "group-hover:scale-105"
            )}
            onError={(error) => {
              console.warn(`Failed to load image for ${item.name}:`, error);
            }}
          />

          {/* Action Buttons - Show on hover with staggered animation */}
          {(onEdit || onDelete) && (
            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out flex gap-1">
              {onEdit && (
                <Button
                  size="sm"
                  variant="secondary"
                  className={cn(
                    "h-8 w-8 p-0 backdrop-blur-sm",
                    "bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800",
                    "text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white",
                    "border border-gray-200/50 dark:border-gray-600/50",
                    "shadow-sm hover:shadow-md",
                    "transform translate-y-2 group-hover:translate-y-0",
                    "transition-all duration-300 ease-out delay-75",
                    "hover:scale-110 active:scale-95"
                  )}
                  onClick={handleEdit}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  className={cn(
                    "h-8 w-8 p-0 backdrop-blur-sm",
                    "bg-red-500/90 hover:bg-red-500 dark:bg-red-600/90 dark:hover:bg-red-600",
                    "text-white hover:text-white",
                    "border border-red-400/50 dark:border-red-500/50",
                    "shadow-sm hover:shadow-md",
                    "transform translate-y-2 group-hover:translate-y-0",
                    "transition-all duration-300 ease-out delay-100",
                    "hover:scale-110 active:scale-95"
                  )}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}

          {/* Availability Status Badge */}
          <div className="absolute top-2 right-2">
            <Badge
              variant={isAvailable ? "default" : "destructive"}
              className={cn(
                "text-xs font-medium backdrop-blur-sm",
                "transform translate-y-1 group-hover:translate-y-0",
                "transition-all duration-300 ease-out delay-50",
                isAvailable
                  ? "bg-green-500/90 hover:bg-green-600 border-green-400/50"
                  : "bg-red-500/90 hover:bg-red-600 border-red-400/50"
              )}
            >
              {isAvailable ? "Available" : "Unavailable"}
            </Badge>
          </div>

          {/* Overlay for unavailable items */}
          {!isAvailable && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                Unavailable
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div
          className={cn(
            "flex-1 flex flex-col space-y-2",
            // Responsive padding
            "p-3 sm:p-4 lg:p-5"
          )}
        >
          {/* Item Name */}
          <h3
            className={cn(
              "font-semibold leading-tight line-clamp-2",
              // Responsive text sizes
              "text-base sm:text-lg lg:text-xl",
              "group-hover:text-primary transition-all duration-300 ease-out",
              "transform group-hover:translate-x-1"
            )}
            title={item.name}
          >
            {item.name}
          </h3>

          {/* Description */}
          {item.description && (
            <p
              className="text-sm text-muted-foreground line-clamp-2"
              title={item.description}
            >
              {item.description}
            </p>
          )}

          {/* Price and Menu Name */}
          <div className="flex justify-between items-end pt-2 mt-auto">
            <div className="space-y-1">
              {/* Price */}
              <p
                className={cn(
                  "font-bold text-primary",
                  // Responsive price text sizes
                  "text-lg sm:text-xl lg:text-2xl"
                )}
              >
                {formatAmount(item.price)}
              </p>

              {/* Menu Name */}
              {item.menu_name && (
                <p className="text-xs text-muted-foreground">
                  {item.menu_name}
                </p>
              )}
            </div>

            {/* Add to Order Indicator */}
            {isAvailable && (
              <div
                className={cn(
                  "opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out",
                  "transform translate-x-2 group-hover:translate-x-0 scale-75 group-hover:scale-100"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full bg-primary flex items-center justify-center",
                    "shadow-lg hover:shadow-xl transition-all duration-200",
                    "hover:scale-110 active:scale-95",
                    isAdded && "bg-green-500 animate-bounce"
                  )}
                >
                  <Plus
                    className={cn(
                      "h-4 w-4 text-primary-foreground transition-transform duration-200",
                      isAdded && "rotate-90"
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
