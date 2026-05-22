-- Add status and file_path columns to error_logs table for AI auto-fix system
ALTER TABLE public.error_logs 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open',
ADD COLUMN IF NOT EXISTS file_path text;

-- Add an index for faster querying by status
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON public.error_logs (status);
