import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ContractedHoursRecord = {
  project_id: number;
  contracted_hours: number;
  notes?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
};

export function useContractedHours() {
  const [data, setData] = useState<Map<number, ContractedHoursRecord>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("project_contracted_hours" as any)
        .select("project_id, contracted_hours, notes, updated_by, updated_at");

      if (error) throw error;

      const map = new Map<number, ContractedHoursRecord>();
      (rows ?? []).forEach((r: any) => {
        map.set(Number(r.project_id), r as ContractedHoursRecord);
      });
      setData(map);
    } catch (err) {
      console.warn("[useContractedHours] fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const upsert = useCallback(
    async (projectId: number, contractedHours: number, updatedBy: string, notes?: string): Promise<boolean> => {
      try {
        const { error } = await supabase
          .from("project_contracted_hours" as any)
          .upsert(
            {
              project_id: projectId,
              contracted_hours: contractedHours,
              updated_by: updatedBy,
              notes: notes ?? null,
            },
            { onConflict: "project_id" }
          );
        if (error) throw error;
        await fetch();
        return true;
      } catch (err) {
        console.error("[useContractedHours] upsert failed", err);
        return false;
      }
    },
    [fetch]
  );

  return { data, loading, refetch: fetch, upsert };
}
