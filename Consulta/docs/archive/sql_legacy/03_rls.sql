-- RLS base para Supabase (ajuste conforme regras de negócio)

-- Clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS clientes_service_role_all ON public.clientes;
CREATE POLICY clientes_service_role_all ON public.clientes
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Colaboradores do cliente: restringe por auth_user_id
ALTER TABLE public.colaboradores_cliente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS colaboradores_cliente_service_role_all ON public.colaboradores_cliente;
CREATE POLICY colaboradores_cliente_service_role_all ON public.colaboradores_cliente
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS colaboradores_cliente_self ON public.colaboradores_cliente;
CREATE POLICY colaboradores_cliente_self ON public.colaboradores_cliente
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Projects (até termos mapeamento cliente -> usuário, liberamos leitura para autenticados)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_service_role_all ON public.projects;
CREATE POLICY projects_service_role_all ON public.projects
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS projects_authenticated_read ON public.projects;
CREATE POLICY projects_authenticated_read ON public.projects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_service_role_all ON public.tasks;
CREATE POLICY tasks_service_role_all ON public.tasks
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS tasks_authenticated_read ON public.tasks;
CREATE POLICY tasks_authenticated_read ON public.tasks
  FOR SELECT USING (auth.role() = 'authenticated');

-- Elapsed times
ALTER TABLE public.elapsed_times ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS elapsed_times_service_role_all ON public.elapsed_times;
CREATE POLICY elapsed_times_service_role_all ON public.elapsed_times
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS elapsed_times_authenticated_read ON public.elapsed_times;
CREATE POLICY elapsed_times_authenticated_read ON public.elapsed_times
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users (tabela paralela aos auth.users): restringe por auth_user_id
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_service_role_all ON public.users;
CREATE POLICY users_service_role_all ON public.users
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS users_self ON public.users;
CREATE POLICY users_self ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

-- Reponsonsibles (nome mantido)
ALTER TABLE public.reponsonsibles_tasks_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reponsonsibles_service_role_all ON public.reponsonsibles_tasks_users;
CREATE POLICY reponsonsibles_service_role_all ON public.reponsonsibles_tasks_users
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS reponsonsibles_self ON public.reponsonsibles_tasks_users;
CREATE POLICY reponsonsibles_self ON public.reponsonsibles_tasks_users
  FOR SELECT USING (auth.uid() = auth_user_id);
