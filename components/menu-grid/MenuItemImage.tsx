"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ImageOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MenuItemImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  onError?: (error: Error) => void;
  onLoad?: () => void;
  priority?: boolean;
  sizes?: string;
}

/**
 * Enhanced image component with error handling and fallbacks
 * Provides graceful degradation for failed image loads
 */
export function MenuItemImage({
  src,
  alt,
  className,
  fallbackClassName,
  onError,
  onLoad,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw",
}: MenuItemImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  const handleImageError = useCallback(
    (error?: Error) => {
      console.warn(`Failed to load image: ${src}`, error);
      setImageError(true);
      setIsLoading(false);

      if (onError) {
        onError(error || new Error(`Failed to load image: ${src}`));
      }
    },
    [src, onError]
  );

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setImageError(false);

    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  const handleRetry = useCallback(() => {
    if (retryCount < maxRetries) {
      setImageError(false);
      setIsLoading(true);
      setRetryCount((prev) => prev + 1);

      // Force image reload by adding timestamp
      const img = new window.Image();
      img.onload = handleImageLoad;
      img.onerror = () => handleImageError();
      img.src = `${src}?retry=${retryCount + 1}&t=${Date.now()}`;
    }
  }, [src, retryCount, handleImageLoad, handleImageError]);

  // No image source provided
  if (!src) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fallbackClassName,
          className
        )}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">🍽️</div>
          <p className="text-sm font-medium">No Image</p>
        </div>
      </div>
    );
  }

  // Image failed to load
  if (imageError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-muted text-muted-foreground p-4",
          fallbackClassName,
          className
        )}
      >
        <ImageOff className="h-8 w-8 mb-2 text-muted-foreground/60" />
        <p className="text-xs font-medium mb-2 text-center">
          Image unavailable
        </p>

        {retryCount < maxRetries && (
          <Button
            onClick={handleRetry}
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}

        {retryCount >= maxRetries && (
          <p className="text-xs text-muted-foreground/60 text-center">
            Failed to load after {maxRetries} attempts
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
        </div>
      )}

      {/* Main image */}
      <Image
        src={src}
        alt={alt}
        fill
        className={cn(
          "object-cover transition-all duration-500 ease-out",
          isLoading ? "opacity-0 scale-105" : "opacity-100 scale-100"
        )}
        onLoad={handleImageLoad}
        onError={() => handleImageError()}
        priority={priority}
        sizes={sizes}
        quality={85}
      />
    </div>
  );
}

/**
 * Optimized image component for menu item cards
 */
export function MenuItemCardImage({
  src,
  alt,
  isAvailable = true,
  className,
  ...props
}: MenuItemImageProps & { isAvailable?: boolean }) {
  return (
    <MenuItemImage
      src={src}
      alt={alt}
      className={cn(
        "w-full h-40 sm:h-44 md:h-48 lg:h-52",
        !isAvailable && "grayscale",
        className
      )}
      fallbackClassName={cn(
        "w-full h-40 sm:h-44 md:h-48 lg:h-52",
        !isAvailable && "grayscale"
      )}
      {...props}
    />
  );
}

/**
 * Lazy loading image with intersection observer
 */
export function LazyMenuItemImage({
  src,
  alt,
  threshold = 0.1,
  rootMargin = "50px",
  ...props
}: MenuItemImageProps & {
  threshold?: number;
  rootMargin?: string;
}) {
  const [isInView, setIsInView] = useState(false);
  const [imgRef, setImgRef] = useState<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!imgRef || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(imgRef);

    return () => observer.disconnect();
  }, [imgRef, isInView, threshold, rootMargin]);

  return (
    <div ref={setImgRef} className={props.className}>
      {isInView ? (
        <MenuItemImage src={src} alt={alt} {...props} />
      ) : (
        <div className={cn("bg-muted animate-pulse", props.className)} />
      )}
    </div>
  );
}
