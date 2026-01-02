-- Add 'video' to supported kinds

-- 1. Update room_messages check constraint
ALTER TABLE public.room_messages 
DROP CONSTRAINT IF EXISTS room_messages_kind_check;

ALTER TABLE public.room_messages 
ADD CONSTRAINT room_messages_kind_check 
CHECK (kind IN ('text', 'image', 'video', 'file'));

-- 2. Update room_attachments check constraint
ALTER TABLE public.room_attachments 
DROP CONSTRAINT IF EXISTS room_attachments_kind_check;

ALTER TABLE public.room_attachments 
ADD CONSTRAINT room_attachments_kind_check 
CHECK (kind IN ('image', 'video', 'file'));
