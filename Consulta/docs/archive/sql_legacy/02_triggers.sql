-- Triggers utilitárias para manter updated_at / date_update

CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.tg_set_date_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.date_update := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualiza updated_at em tasks e elapsed_times
DROP TRIGGER IF EXISTS trg_tasks_set_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_elapsed_times_set_updated_at ON public.elapsed_times;
CREATE TRIGGER trg_elapsed_times_set_updated_at
BEFORE UPDATE ON public.elapsed_times
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_updated_at();

-- Atualiza date_update em projects
DROP TRIGGER IF EXISTS trg_projects_set_date_update ON public.projects;
CREATE TRIGGER trg_projects_set_date_update
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.tg_set_date_update();
