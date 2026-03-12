
-- Update monument_type enum: remove old values, add new ones
-- First add the new values
ALTER TYPE public.monument_type ADD VALUE IF NOT EXISTS 'flat_marker';
ALTER TYPE public.monument_type ADD VALUE IF NOT EXISTS 'double_companion';
ALTER TYPE public.monument_type ADD VALUE IF NOT EXISTS 'monument_base';
ALTER TYPE public.monument_type ADD VALUE IF NOT EXISTS 'bronze_plaque';
ALTER TYPE public.monument_type ADD VALUE IF NOT EXISTS 'obelisk_unique';
ALTER TYPE public.monument_type ADD VALUE IF NOT EXISTS 'mausoleum_panel';
