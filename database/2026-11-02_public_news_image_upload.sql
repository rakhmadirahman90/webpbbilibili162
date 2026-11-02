-- Allow public/admin news image uploads to the existing public images bucket.
-- Public reads are already enabled at the bucket level; this policy only permits INSERT.
DROP POLICY IF EXISTS public_news_image_upload ON storage.objects;
CREATE POLICY public_news_image_upload
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'images');
