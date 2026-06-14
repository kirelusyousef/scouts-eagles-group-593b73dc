ALTER TABLE public."Users"
  ADD COLUMN IF NOT EXISTS "House_Number" text,
  ADD COLUMN IF NOT EXISTS "Street_Name" text,
  ADD COLUMN IF NOT EXISTS "Sub_Street_Name" text,
  ADD COLUMN IF NOT EXISTS "City" text,
  ADD COLUMN IF NOT EXISTS "Governorate" text;