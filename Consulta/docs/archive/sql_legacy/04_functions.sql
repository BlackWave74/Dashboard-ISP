-- Funções auxiliares para alinhar o frontend ao esquema Supabase.
-- Inclui a mesma assinatura esperada pelo hook useProjectHours (get_consumo_horas).

CREATE OR REPLACE FUNCTION public.get_consumo_horas(
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  filtro_cliente_id BIGINT DEFAULT NULL,
  filtro_project_id BIGINT DEFAULT NULL
)
RETURNS TABLE (
  cliente_id BIGINT,
  cliente_nome TEXT,
  projeto_id BIGINT,
  projeto_nome TEXT,
  total_segundos NUMERIC,
  total_horas NUMERIC
)
LANGUAGE sql
AS $$
  SELECT
    p.cliente_id,
    c.nome AS cliente_nome,
    t.project_id AS projeto_id,
    COALESCE(p.name, CONCAT('Projeto #', t.project_id)) AS projeto_nome,
    COALESCE(SUM(COALESCE(et.seconds, et.minutes * 60, 0)), 0) AS total_segundos,
    COALESCE(SUM(COALESCE(et.seconds, et.minutes * 60, 0)) / 3600.0, 0) AS total_horas
  FROM public.tasks t
  LEFT JOIN public.projects p ON p.id = t.project_id
  LEFT JOIN public.clientes c ON c.cliente_id = p.cliente_id
  LEFT JOIN public.elapsed_times et ON et.task_id = t.task_id
  WHERE
    (data_inicio IS NULL OR et.date_start >= data_inicio)
    AND (data_fim IS NULL OR et.date_start <= data_fim)
    AND (filtro_project_id IS NULL OR t.project_id = filtro_project_id)
    AND (filtro_cliente_id IS NULL OR p.cliente_id = filtro_cliente_id)
  GROUP BY
    p.cliente_id,
    c.nome,
    t.project_id,
    p.name
  ORDER BY total_segundos DESC NULLS LAST;
$$;

