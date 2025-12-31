-- Add file sharing support

-- Update room_attachments to support more file types
ALTER TABLE public.room_attachments 
DROP CONSTRAINT IF EXISTS room_attachments_kind_check;

ALTER TABLE public.room_attachments 
ADD CONSTRAINT room_attachments_kind_check 
CHECK (kind IN ('image', 'file'));

-- Add filename column
ALTER TABLE public.room_attachments 
ADD COLUMN IF NOT EXISTS filename text;

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public uploads and downloads
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'attachments');
