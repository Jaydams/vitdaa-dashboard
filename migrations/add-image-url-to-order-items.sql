-- Migration: Add image_url column to order_items table
-- This column is needed to store menu item images in order items for better order display

-- Add image_url column to order_items table
ALTER TABLE public.order_items 
ADD COLUMN image_url text;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.order_items.image_url IS 'URL of the menu item image for display in order details';

-- Create index for better performance when querying orders with images
CREATE INDEX IF NOT EXISTS idx_order_items_image_url ON public.order_items(image_url) WHERE image_url IS NOT NULL;