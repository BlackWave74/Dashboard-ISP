ALTER TABLE public.elapsed_times
ADD COLUMN IF NOT EXISTS bitrix_task_id_raw bigint;

CREATE INDEX IF NOT EXISTS idx_elapsed_times_bitrix_task_id_raw
ON public.elapsed_times (bitrix_task_id_raw);
