import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BITRIX_BASE_URL = Deno.env.get('BITRIX_BASE_URL');

const PAGE_SIZE = 50;
const UPSERT_BATCH_SIZE = 500;
const DB_TASK_PAGE_SIZE = 1000;
const RETRIES = 4;
const DELAY_MS = 200;
const DELAY_429_MS = 2500;

function normalizeList(data: unknown): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data as Record<string, unknown>);
  return [];
}

function getField(item: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null) return item[key];
  }
  return null;
}

function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(String(value), 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  try {
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  } catch {
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bitrixPost(url: string, body: unknown): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        await sleep(DELAY_429_MS * (attempt + 1));
        continue;
      }

      if (response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      if (data.error && !data.result) {
        const message = String(data.error_description || data.error);
        if (message.includes('QUERY_LIMIT')) {
          await sleep(DELAY_429_MS * (attempt + 1));
          continue;
        }
        throw new Error(message);
      }

      return data;
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.message?.includes('fetch')) {
        lastError = error;
        await sleep(1000 * Math.pow(2, attempt));
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error('Bitrix request failed after retries');
}

async function fetchAllElapsedTimes(): Promise<any[]> {
  if (!BITRIX_BASE_URL) {
    throw new Error('A BITRIX_BASE_URL não foi configurada nos Secrets.');
  }

  const endpoint = new URL('task.elapseditem.getlist.json', BITRIX_BASE_URL).toString();
  const allItems: any[] = [];
  let lastId = 0;

  console.log('>>> Buscando todos os elapsed items via cursor global (>ID)...');

  while (true) {
    const requestBody = {
      ORDER: { ID: 'ASC' },
      FILTER: { '>ID': lastId },
      SELECT: [
        'ID',
        'TASK_ID',
        'USER_ID',
        'MINUTES',
        'SECONDS',
        'CREATED_DATE',
        'DATE_START',
        'DATE_STOP',
        'SOURCE',
        'COMMENT_TEXT',
      ],
      PARAMS: {
        NAV_PARAMS: {
          nPageSize: PAGE_SIZE,
          iNumPage: 1,
        },
      },
    };

    const data = await bitrixPost(endpoint, requestBody);
    const items = normalizeList(data.result);

    if (items.length === 0) {
      console.log(`>>> Cursor finalizado em ID ${lastId}.`);
      break;
    }

    const lastItem = items[items.length - 1];
    const nextCursor = toInt(getField(lastItem, 'id', 'ID'));

    if (!nextCursor || nextCursor <= lastId) {
      throw new Error(`Cursor inválido retornado pelo Bitrix. lastId=${lastId}, nextCursor=${nextCursor}`);
    }

    allItems.push(...items);
    lastId = nextCursor;

    console.log(`>>> Lote global > ${lastId - items.length} | recebidos=${items.length} | cursor=${lastId} | total=${allItems.length}`);

    await sleep(DELAY_MS);
  }

  return allItems;
}

function parseElapsed(raw: Record<string, any>, validTaskIds: Set<number>) {
  const id = toInt(getField(raw, 'id', 'ID'));
  if (!id) return null;

  const rawTaskId = toInt(getField(raw, 'taskId', 'TASK_ID', 'task_id'));

  return {
    id,
    bitrix_task_id_raw: rawTaskId,
    task_id: rawTaskId && validTaskIds.has(rawTaskId) ? rawTaskId : null,
    user_id: toInt(getField(raw, 'userId', 'USER_ID', 'user_id')),
    comment_text: String(getField(raw, 'commentText', 'COMMENT_TEXT', 'comment_text') ?? ''),
    date_start: toIso(getField(raw, 'dateStart', 'DATE_START', 'date_start')),
    date_stop: toIso(getField(raw, 'dateStop', 'DATE_STOP', 'date_stop')),
    created_date: toIso(getField(raw, 'createdDate', 'CREATED_DATE', 'created_date')),
    minutes: toInt(getField(raw, 'minutes', 'MINUTES')) ?? 0,
    seconds: toInt(getField(raw, 'seconds', 'SECONDS')) ?? 0,
    source: (() => {
      const value = getField(raw, 'source', 'SOURCE');
      return value !== null && value !== undefined ? String(value) : null;
    })(),
    updated_at: new Date().toISOString(),
  };
}

async function upsertElapsedTimes(supabase: any, records: any[]) {
  let inserted = 0;
  const errors: string[] = [];

  for (let offset = 0; offset < records.length; offset += UPSERT_BATCH_SIZE) {
    const batch = records.slice(offset, offset + UPSERT_BATCH_SIZE);
    const { error } = await supabase
      .from('elapsed_times')
      .upsert(batch, { onConflict: 'id' });

    if (!error) {
      inserted += batch.length;
      continue;
    }

    errors.push(`Batch ${offset}: ${error.message}`);

    for (const record of batch) {
      const { error: singleError } = await supabase
        .from('elapsed_times')
        .upsert(record, { onConflict: 'id' });

      if (!singleError) {
        inserted += 1;
      } else {
        errors.push(`ID ${record.id}: ${singleError.message}`);
      }
    }
  }

  return { inserted, errors };
}

async function fetchAllDbTaskIds(supabase: any): Promise<Set<number>> {
  const ids = new Set<number>();
  let from = 0;

  while (true) {
    const to = from + DB_TASK_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('tasks')
      .select('task_id')
      .range(from, to);

    if (error) {
      throw new Error(`Erro ao carregar tasks do banco: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{ task_id?: number | string | null }>;
    for (const row of rows) {
      const taskId = toInt(row.task_id);
      if (taskId) ids.add(taskId);
    }

    if (rows.length < DB_TASK_PAGE_SIZE) {
      break;
    }

    from += DB_TASK_PAGE_SIZE;
  }

  return ids;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async () => {
  const startedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!BITRIX_BASE_URL) {
      throw new Error('A BITRIX_BASE_URL não foi configurada nos Secrets.');
    }

    console.log('--- INICIANDO SINCRONIZAÇÃO GLOBAL DE ELAPSED TIMES ---');

    console.log('>>> Carregando whitelist completa de tarefas do banco...');
    const validTaskIds = await fetchAllDbTaskIds(supabase);

    console.log(`>>> Tarefas no banco: ${validTaskIds.size}`);

    const rawElapsed = await fetchAllElapsedTimes();

    const byId = new Map<number, Record<string, any>>();
    for (const item of rawElapsed) {
      const id = toInt(getField(item, 'id', 'ID'));
      if (id) byId.set(id, item);
    }

    const records = Array.from(byId.values())
      .map((item) => parseElapsed(item, validTaskIds))
      .filter((item) => item !== null) as NonNullable<ReturnType<typeof parseElapsed>>[];

    const distinctTaskIds = new Set<number>();
    for (const item of rawElapsed) {
      const taskId = toInt(getField(item, 'taskId', 'TASK_ID', 'task_id'));
      if (taskId) distinctTaskIds.add(taskId);
    }

    console.log(`>>> Registros brutos recebidos: ${rawElapsed.length}`);
    console.log(`>>> Registros únicos por ID: ${records.length}`);
    console.log(`>>> Tarefas distintas encontradas nos tempos: ${distinctTaskIds.size}`);

    const { inserted, errors } = await upsertElapsedTimes(supabase, records);
    const durationSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    return json({
      success: true,
      strategy: 'global-cursor-by-id',
      elapsed_raw_count: rawElapsed.length,
      elapsed_unique_count: records.length,
      elapsed_upserted: inserted,
      distinct_task_ids_found: distinctTaskIds.size,
      db_task_whitelist_count: validTaskIds.size,
      orphan_task_ids_are_saved_as_null: true,
      errors_count: errors.length,
      errors_sample: errors.slice(0, 10),
      duration_seconds: durationSeconds,
    });
  } catch (error: any) {
    console.error('ERRO FATAL:', error);
    return json(
      {
        success: false,
        error: error.message || String(error),
        strategy: 'global-cursor-by-id',
        duration_seconds: ((Date.now() - startedAt) / 1000).toFixed(1),
      },
      500,
    );
  }
});
