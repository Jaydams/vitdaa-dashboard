# Supabase Storage Setup

To ensure image uploads work properly, make sure the following storage buckets exist in your Supabase project:

## Required Buckets

1. **profile-images** (for profile and cover images)

   - Public bucket
   - Used for business owner profile and cover images
   - Used for staff profile images

2. **menu-images** (for menu item images)
   - Public bucket
   - Used for menu item images

## Creating Buckets

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create the following buckets:
   - `profile-images` (make it public)
   - `menu-images` (make it public)

## Bucket Policies

Make sure both buckets have the following RLS policies:

### For profile-images bucket:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-images');

-- Allow public read access
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profile-images');

-- Allow users to update their own images
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'profile-images');

-- Allow users to delete their own images
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'profile-images');
```

### For menu-images bucket:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'menu-images');

-- Allow public read access
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'menu-images');

-- Allow users to update their own images
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'menu-images');

-- Allow users to delete their own images
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'menu-images');
```
