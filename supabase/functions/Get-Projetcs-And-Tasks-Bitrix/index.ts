import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BITRIX_BASE_URL = Deno.env.get('BITRIX_BASE_URL'); 
const RETRIES = 4;
const DELAY_MS = 250;

function normalizeList(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
}

function getField(item: any, lowerKey: string, upperKey: string) {
  if (item[lowerKey] !== undefined && item[lowerKey] !== null) return item[lowerKey];
  if (item[upperKey] !== undefined && item[upperKey] !== null) return item[upperKey];
  return null;
}

function toInt(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toIso(value: any): string | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function nonEmptyString(value: any): string | null {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}

function keepBest<T>(incoming: T | null | undefined, existing: T | null | undefined) {
  if (incoming === undefined || incoming === null) return existing ?? null;
  if (typeof incoming === 'string' && incoming.trim() === '') return existing ?? incoming;
  return incoming;
}

async function fetchJsonWithRetry(url: string) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        await new Promise((r) => setTimeout(r, DELAY_MS * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      return await response.json();
    } catch (error: any) {
      lastError = error;
      if (attempt === RETRIES - 1) break;
      await new Promise((r) => setTimeout(r, DELAY_MS * (attempt + 1)));
    }
  }

  throw lastError ?? new Error('Falha ao buscar dados do Bitrix.');
}

async function fetchExistingTasksMap(supabase: any, taskIds: number[]) {
  const existing = new Map<number, any>();
  if (!taskIds.length) return existing;

  for (let offset = 0; offset < taskIds.length; offset += 500) {
    const slice = taskIds.slice(offset, offset + 500);
    const { data, error } = await supabase
      .from('tasks')
      .select('task_id,title,description,status,deadline,closed_date,group_id,group_name,responsible_id,responsible_name,project_id,last_seen_in_bitrix_at,missing_from_bitrix_since')
      .in('task_id', slice);

    if (error) throw new Error(`Erro ao carregar tarefas existentes: ${error.message}`);
    for (const row of data ?? []) {
      const taskId = toInt((row as any).task_id);
      if (taskId) existing.set(taskId, row);
    }
  }

  return existing;
}

function mergeTaskRecord(incoming: any, existing?: any) {
  if (!existing) return incoming;

  return {
    task_id: incoming.task_id,
    title: keepBest(incoming.title, existing.title) ?? `Tarefa ${incoming.task_id}`,
    description: keepBest(incoming.description, existing.description) ?? '',
    status: keepBest(incoming.status, existing.status),
    deadline: keepBest(incoming.deadline, existing.deadline),
    closed_date: keepBest(incoming.closed_date, existing.closed_date),
    group_id: keepBest(incoming.group_id, existing.group_id),
    group_name: keepBest(incoming.group_name, existing.group_name),
    responsible_id: keepBest(incoming.responsible_id, existing.responsible_id),
    responsible_name: keepBest(incoming.responsible_name, existing.responsible_name),
    updated_at: incoming.updated_at,
    project_id: keepBest(incoming.project_id, existing.project_id),
    last_seen_in_bitrix_at: keepBest(incoming.last_seen_in_bitrix_at, existing.last_seen_in_bitrix_at),
    missing_from_bitrix_since: keepBest(incoming.missing_from_bitrix_since, existing.missing_from_bitrix_since),
  };
}

async function fetchAllDbTaskIds(supabase: any) {
  const taskIds: number[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('tasks')
      .select('task_id')
      .range(from, to);

    if (error) throw new Error(`Erro ao carregar IDs de tarefas do banco: ${error.message}`);

    const rows = (data ?? []) as Array<{ task_id?: number | string | null }>;
    for (const row of rows) {
      const taskId = toInt(row.task_id);
      if (taskId) taskIds.push(taskId);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return taskIds;
}

async function markMissingTasks(supabase: any, seenTaskIds: Set<number>, syncStartedAtIso: string) {
  const dbTaskIds = await fetchAllDbTaskIds(supabase);
  const missingTaskIds = dbTaskIds.filter((taskId) => !seenTaskIds.has(taskId));

  for (let offset = 0; offset < missingTaskIds.length; offset += 500) {
    const slice = missingTaskIds.slice(offset, offset + 500);
    const { error } = await supabase
      .from('tasks')
      .update({ missing_from_bitrix_since: syncStartedAtIso })
      .in('task_id', slice)
      .is('missing_from_bitrix_since', null);

    if (error) {
      throw new Error(`Erro ao marcar tarefas ausentes no Bitrix: ${error.message}`);
    }
  }

  return missingTaskIds.length;
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!BITRIX_BASE_URL) {
      throw new Error("A BITRIX_BASE_URL não foi configurada nos Secrets.");
    }

    console.log("--- INICIANDO SINCRONIZAÇÃO (V9 - ALL PROJECTS + ARCHIVED) ---");
    const syncStartedAtIso = new Date().toISOString();

    // Cache para validar chaves estrangeiras
    const validProjectIds = new Set<number>();

    // =================================================================
    // ETAPA 1: PROJETOS (Ativos E Arquivados)
    // =================================================================
    console.log(">>> Etapa 1: Buscando Projetos (Ativos e Arquivados)...");
    
    // Vamos iterar por status para garantir que o Bitrix entregue tudo
    const projectStatuses = ['N', 'Y']; // N = Ativo, Y = Arquivado (Closed)
    let totalProjects = 0;

    const projectFields = [
      "ID", "ACTIVE", "NAME", "DESCRIPTION", "KEYWORDS", "CLOSED", 
      "VISIBLE", "OPENED", "DATE_CREATE", "DATE_UPDATE", "DATE_ACTIVITY", 
      "NUMBER_OF_MEMBERS", "PROJECT", "PROJECT_DATE_START", "PROJECT_DATE_FINISH", "SUBJECT_NAME"
    ];

    for (const status of projectStatuses) {
      console.log(`>>> Buscando projetos com CLOSED = ${status}...`);
      let startProjects = 0;
      let hasMoreProjects = true;

      while (hasMoreProjects) {
        const projUrl = new URL('socialnetwork.api.workgroup.list', BITRIX_BASE_URL);
        projUrl.searchParams.append('start', startProjects.toString());
        
        // FILTRO EXPLÍCITO: Traz ou Ativos ou Arquivados
        projUrl.searchParams.append('filter[CLOSED]', status);
        
        // SELECT EXPLÍCITO: Garante que os campos venham preenchidos
        projectFields.forEach(f => projUrl.searchParams.append('select[]', f));
        
        const response = await fetch(projUrl.toString());
        if (!response.ok) throw new Error(`Erro Bitrix Projects (${status}): ${response.statusText}`);
        
        const data = await response.json();
        const rawProjects = data.result?.workgroups || data.result || [];
        const projects = normalizeList(rawProjects);

        if (projects.length === 0) {
          hasMoreProjects = false;
          break;
        }

        const projectsToUpsert = projects
          .map((p: any) => {
            const rawId = getField(p, 'id', 'ID');
            if (!rawId) return null;

            // Adiciona ao cache de IDs válidos
            validProjectIds.add(parseInt(rawId));

            const rawName = getField(p, 'name', 'NAME');
            // Fallback de segurança para nome
            const safeName = (rawName && String(rawName).trim() !== '') 
              ? rawName 
              : `[SEM NOME] Projeto ID ${rawId}`;

            const rawActive = getField(p, 'active', 'ACTIVE');
            const rawDesc = getField(p, 'description', 'DESCRIPTION');
            const rawKeywords = getField(p, 'keywords', 'KEYWORDS');
            const rawClosed = getField(p, 'closed', 'CLOSED');
            const rawVisible = getField(p, 'visible', 'VISIBLE');
            const rawOpened = getField(p, 'opened', 'OPENED');
            const rawDateCreate = getField(p, 'dateCreate', 'DATE_CREATE');
            const rawDateUpdate = getField(p, 'dateUpdate', 'DATE_UPDATE');
            const rawDateActivity = getField(p, 'dateActivity', 'DATE_ACTIVITY');
            const rawMembers = getField(p, 'numberOfMembers', 'NUMBER_OF_MEMBERS');
            const rawProject = getField(p, 'project', 'PROJECT');
            const rawDateStart = getField(p, 'projectDateStart', 'PROJECT_DATE_START');
            const rawDateFinish = getField(p, 'projectDateFinish', 'PROJECT_DATE_FINISH');
            const rawType = getField(p, 'type', 'TYPE') || getField(p, 'subjectName', 'SUBJECT_NAME');

            const toBool = (val: any) => val === 'Y';
            const parseDate = (d: any) => d ? new Date(d).toISOString() : null;

            return {
              id: parseInt(rawId),
              active: toBool(rawActive),
              name: safeName,
              description: rawDesc || '',
              keywords: rawKeywords || null,
              closed: toBool(rawClosed),
              visible: toBool(rawVisible),
              opened: toBool(rawOpened),
              date_create: parseDate(rawDateCreate),
              date_update: parseDate(rawDateUpdate),
              date_activity: parseDate(rawDateActivity),
              number_of_members: rawMembers ? parseInt(rawMembers) : 1,
              project: toBool(rawProject),
              project_date_start: parseDate(rawDateStart),
              project_date_finish: parseDate(rawDateFinish),
              type: rawType || 'project', 
            };
          })
          .filter((p: any) => p !== null);

        if (projectsToUpsert.length > 0) {
          const { error: projError } = await supabase
            .from('projects')
            .upsert(projectsToUpsert, { onConflict: 'id' });

          if (projError) {
              console.error(`Erro Upsert Projects (${status}):`, projError);
              throw new Error(`Erro Upsert Projects: ${projError.message}`);
          }
          totalProjects += projectsToUpsert.length;
        }

        if (data.next) {
          startProjects = data.next;
        } else {
          hasMoreProjects = false;
        }
      }
    }
    console.log(`>>> Total de Projetos sincronizados (Ativos + Arquivados): ${totalProjects}`);
    console.log(`>>> Cache de IDs válidos: ${validProjectIds.size}`);


    // =================================================================
    // ETAPA 2: TAREFAS
    // =================================================================
    console.log(">>> Etapa 2: Buscando Tarefas...");
    let startTasks = 0;
    let hasMoreTasks = true;
    const canonicalTasks = new Map<number, any>();
    const seenTaskIds = new Set<number>();
    let hadTaskWriteErrors = false;

    while (hasMoreTasks) {
      const taskUrl = new URL('tasks.task.list.json', BITRIX_BASE_URL);
      taskUrl.searchParams.append('start', startTasks.toString());
      // Selecionando campos essenciais
      ['ID', 'TITLE', 'DESCRIPTION', 'STATUS', 'DEADLINE', 'CLOSED_DATE', 'GROUP_ID', 'RESPONSIBLE_ID', 'CREATED_BY', 'CREATED_DATE'].forEach(f => taskUrl.searchParams.append('select[]', f));

      const data = await fetchJsonWithRetry(taskUrl.toString());
      const rawTasks = data.result?.tasks || data.result || [];
      const tasks = normalizeList(rawTasks);

      if (tasks.length === 0) {
        hasMoreTasks = false;
        break;
      }

      const pageCanonical = new Map<number, any>();
      const pageTaskIds: number[] = [];

      tasks
        .map((t: any) => {
          const rawId = getField(t, 'id', 'ID');
          if (!rawId) return null;
          const numericId = toInt(rawId);
          if (!numericId) return null;

          const rawTitle = getField(t, 'title', 'TITLE');
          const rawDesc = getField(t, 'description', 'DESCRIPTION');
          const rawStatus = getField(t, 'status', 'STATUS');
          const rawDeadline = getField(t, 'deadline', 'DEADLINE');
          const rawClosedDate = getField(t, 'closedDate', 'CLOSED_DATE');
          const rawGroupId = getField(t, 'groupId', 'GROUP_ID');
          const rawRespId = getField(t, 'responsibleId', 'RESPONSIBLE_ID');
          
          const responsibleName = t.responsible?.name || t.RESPONSIBLE?.NAME || null;
          const groupName = t.group?.name || t.GROUP?.NAME || null;

          const deadline = toIso(rawDeadline);
          const closedDate = toIso(rawClosedDate);
          
          // --- SEGURANÇA MÁXIMA DE FK ---
          let projectId = null;
          if (rawGroupId && rawGroupId !== "0") {
             const possibleId = toInt(rawGroupId);
             // Verifica se o projeto existe na lista que acabamos de baixar (ativos + arquivados)
             if (possibleId && validProjectIds.has(possibleId)) {
                projectId = possibleId;
             } else {
                // Se cair aqui, é porque o projeto foi DELETADO PERMANENTEMENTE do Bitrix, 
                // mas a tarefa continua lá (lixo no banco do Bitrix).
                // Enviamos NULL para não quebrar a sincronização.
                // console.warn(`Tarefa ${rawId} aponta para projeto inexistente ${possibleId}. Setando NULL.`);
             }
          }

          return {
            task_id: numericId,
            title: nonEmptyString(rawTitle) || `Tarefa ${rawId}`,
            description: nonEmptyString(rawDesc) || '',
            status: toInt(rawStatus),
            deadline: deadline,
            closed_date: closedDate,
            group_id: projectId, // Mantemos o ID original no group_id para referência
            group_name: nonEmptyString(groupName),
            responsible_id: toInt(rawRespId),
            responsible_name: nonEmptyString(responsibleName),
            updated_at: new Date().toISOString(),
            project_id: projectId, // NULL se não existir na tabela projects
            last_seen_in_bitrix_at: syncStartedAtIso,
            missing_from_bitrix_since: null,
          };
        })
        .filter((t: any) => t !== null)
        .forEach((task: any) => {
          pageTaskIds.push(task.task_id);
          seenTaskIds.add(task.task_id);
          const existingInPage = pageCanonical.get(task.task_id);
          pageCanonical.set(task.task_id, mergeTaskRecord(task, existingInPage));
        });

      const existingTasksMap = await fetchExistingTasksMap(supabase, pageTaskIds);
      const tasksToUpsert = Array.from(pageCanonical.values()).map((task) => {
        const existingInRun = canonicalTasks.get(task.task_id);
        const existingInDb = existingTasksMap.get(task.task_id);
        const merged = mergeTaskRecord(task, existingInRun ?? existingInDb);
        canonicalTasks.set(task.task_id, merged);
        return merged;
      });

      if (tasksToUpsert.length > 0) {
          const { error: taskError } = await supabase
            .from('tasks')
            .upsert(tasksToUpsert, { onConflict: 'task_id' });

          if (taskError) {
             hadTaskWriteErrors = true;
             console.error(`Erro Upsert Tasks (Lote ${startTasks}): ${taskError.message}`);
          }
      }

      if (data.next) {
        startTasks = data.next;
        // Delay para evitar Rate Limit (importante com muitas requisições)
        await new Promise(r => setTimeout(r, DELAY_MS));
      } else {
        hasMoreTasks = false;
      }
    }

    const missingTasksMarked = hadTaskWriteErrors
      ? 0
      : await markMissingTasks(supabase, seenTaskIds, syncStartedAtIso);

    return new Response(
      JSON.stringify({
        success: true,
        projects: totalProjects,
        tasks: canonicalTasks.size,
        missing_tasks_marked: missingTasksMarked,
        missing_marking_skipped_due_to_errors: hadTaskWriteErrors,
      }),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (error) {
    console.error("ERRO FATAL:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
