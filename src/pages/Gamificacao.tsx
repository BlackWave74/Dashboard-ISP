import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Flame, Target, Zap, Star, TrendingUp, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { parseDateValue } from "@/modules/tasks/utils";
import { usePageSEO } from "@/hooks/usePageSEO";

function getTaskStatusKey(t: Record<string, any>): string {
  const statusRaw = String(t.status ?? t.situacao ?? "").toLowerCase();
  const isDone = ["5", "done", "concluido", "concluído", "completed", "finalizado"].includes(statusRaw);
  if (isDone) return "done";
  const deadline = parseDateValue(t.deadline) ?? parseDateValue(t.due_date) ?? parseDateValue(t.dueDate);
  if (deadline && deadline < new Date()) return "overdue";
  return "pending";
}

type ConsultantScore = {
  name: string;
  done: number;
  onTime: number;
  overdue: number;
  total: number;
  points: number;
  streak: number;
  level: number;
  badges: string[];
};

const BADGE_DEFS: Record<string, { icon: React.ElementType; label: string; color: string; description: string }> = {
  speed: { icon: Zap, label: "Velocista", color: "hsl(38 92% 50%)", description: "10+ tarefas no prazo" },
  master: { icon: Star, label: "Mestre", color: "hsl(280 70% 55%)", description: "50+ tarefas concluídas" },
  fire: { icon: Flame, label: "Em Chamas", color: "hsl(0 84% 60%)", description: "Streak de 5+" },
  target: { icon: Target, label: "Pontaria", color: "hsl(160 84% 39%)", description: "90%+ no prazo" },
  rising: { icon: TrendingUp, label: "Ascendente", color: "hsl(234 89% 64%)", description: "20+ tarefas" },
};

const LEVEL_NAMES = ["Bronze", "Prata", "Ouro", "Platina", "Diamante"];
const LEVEL_COLORS = ["hsl(30 50% 50%)", "hsl(0 0% 70%)", "hsl(45 90% 55%)", "hsl(200 50% 70%)", "hsl(234 89% 64%)"];

function getLevel(points: number) {
  if (points >= 500) return 4;
  if (points >= 300) return 3;
  if (points >= 150) return 2;
  if (points >= 50) return 1;
  return 0;
}

function getLevelProgress(points: number) {
  const thresholds = [0, 50, 150, 300, 500];
  const level = getLevel(points);
  if (level >= 4) return 100;
  const current = points - thresholds[level];
  const needed = thresholds[level + 1] - thresholds[level];
  return Math.min(100, Math.round((current / needed) * 100));
}

export default function Gamificacao() {
  usePageSEO("/gamificacao");
  const { session } = useAuth();
  const { tasks } = useTasks({ accessToken: session?.accessToken, period: "90d" });

  const ranking = useMemo<ConsultantScore[]>(() => {
    const byConsultant = new Map<string, { done: number; onTime: number; overdue: number; total: number }>();

    tasks.forEach((t) => {
      const name = String(t.responsible_name ?? t.consultant ?? t.owner ?? t.responsavel ?? "Desconhecido").trim();
      if (!name || name === "Desconhecido") return;
      if (!byConsultant.has(name)) byConsultant.set(name, { done: 0, onTime: 0, overdue: 0, total: 0 });
      const entry = byConsultant.get(name)!;
      const status = getTaskStatusKey(t);
      entry.total++;
      if (status === "done") { entry.done++; entry.onTime++; }
      else if (status === "overdue") { entry.overdue++; }
    });

    return Array.from(byConsultant.entries())
      .map(([name, s]) => {
        const points = s.done * 10 + s.onTime * 5 - s.overdue * 3;
        const streak = Math.min(s.done, 10);
        const badges: string[] = [];
        if (s.onTime >= 10) badges.push("speed");
        if (s.done >= 50) badges.push("master");
        if (streak >= 5) badges.push("fire");
        if (s.total > 0 && s.onTime / s.total >= 0.9) badges.push("target");
        if (s.total >= 20) badges.push("rising");
        return { name, ...s, points: Math.max(0, points), streak, level: getLevel(Math.max(0, points)), badges };
      })
      .sort((a, b) => b.points - a.points);
  }, [tasks]);

  const topThree = ranking.slice(0, 3);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{
        background: "linear-gradient(180deg, hsl(270 60% 10%) 0%, hsl(250 50% 8%) 25%, hsl(234 45% 7%) 50%, hsl(260 40% 9%) 75%, hsl(234 45% 6%) 100%)",
      }} />
      <div className="pointer-events-none absolute top-[10%] left-[20%] h-[500px] w-[500px] rounded-full opacity-12 blur-[140px]" style={{ background: "radial-gradient(circle, hsl(45 90% 55%), transparent 70%)" }} />
      <div className="pointer-events-none absolute bottom-[20%] right-[10%] h-[400px] w-[400px] rounded-full opacity-8 blur-[120px]" style={{ background: "radial-gradient(circle, hsl(280 70% 55%), transparent 70%)" }} />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] space-y-8 px-6 pt-6 md:px-10 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8 text-amber-400" />
            Ranking de Produtividade
          </h1>
          <p className="text-sm text-muted-foreground mt-2">Últimos 90 dias • Baseado em tarefas concluídas no prazo</p>
        </motion.div>

        {/* Podium */}
        {topThree.length > 0 && (
          <div className="flex items-end justify-center gap-4 pt-8">
            {[1, 0, 2].map((podiumIdx) => {
              const person = topThree[podiumIdx];
              if (!person) return <div key={podiumIdx} className="w-40" />;
              const isFirst = podiumIdx === 0;
              const heights = ["h-48", "h-40", "h-32"];
              const medals = [
                <Trophy key="g" className="h-8 w-8 text-amber-400" />,
                <Medal key="s" className="h-7 w-7 text-gray-400" />,
                <Medal key="b" className="h-6 w-6 text-amber-700" />,
              ];
              return (
                <motion.div
                  key={podiumIdx}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + podiumIdx * 0.15, type: "spring" }}
                  className="flex flex-col items-center"
                >
                  <motion.div
                    className={`flex items-center justify-center rounded-full bg-gradient-to-br ${isFirst ? "from-amber-400 to-yellow-600 h-16 w-16" : "from-primary to-[hsl(280_70%_55%)] h-12 w-12"} text-white font-bold text-lg shadow-xl mb-2`}
                    animate={isFirst ? { boxShadow: ["0 0 20px hsl(45 90% 55% / 0.3)", "0 0 40px hsl(45 90% 55% / 0.5)", "0 0 20px hsl(45 90% 55% / 0.3)"] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    {person.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </motion.div>
                  <p className="text-sm font-bold text-foreground text-center truncate max-w-[120px]">{person.name}</p>
                  <p className="text-xs text-primary font-semibold">{person.points} pts</p>
                  <motion.div
                    className={`${heights[podiumIdx]} w-28 mt-3 rounded-t-xl flex flex-col items-center justify-start pt-4 border border-border/20`}
                    style={{
                      background: isFirst
                        ? "linear-gradient(180deg, hsl(45 90% 55% / 0.15), hsl(45 90% 55% / 0.03))"
                        : "linear-gradient(180deg, hsl(234 89% 64% / 0.12), hsl(234 89% 64% / 0.02))",
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    transition={{ delay: 0.6 + podiumIdx * 0.1 }}
                  >
                    {medals[podiumIdx]}
                    <span className="text-2xl font-black text-foreground/20 mt-2">#{podiumIdx + 1}</span>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Badges Legend */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <div className="rounded-2xl bg-card/30 border border-border/20 backdrop-blur-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Conquistas Disponíveis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(BADGE_DEFS).map(([key, def]) => (
                <div key={key} className="flex items-center gap-2 rounded-xl bg-card/30 border border-border/15 p-3">
                  <def.icon className="h-5 w-5 shrink-0" style={{ color: def.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{def.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Full Ranking */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <div className="rounded-2xl bg-card/30 border border-border/20 backdrop-blur-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Ranking Completo</h3>
            <div className="space-y-2">
              {ranking.map((person, i) => {
                const levelColor = LEVEL_COLORS[person.level];
                const levelName = LEVEL_NAMES[person.level];
                return (
                  <motion.div
                    key={person.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.04 }}
                    className="flex items-center gap-4 rounded-xl bg-card/20 border border-border/15 p-3 hover:bg-card/50 transition-all"
                  >
                    <span className={`text-lg font-black w-8 text-center ${i < 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${levelColor}, hsl(234 89% 64%))` }}>
                      {person.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{person.name}</p>
                        <Badge variant="outline" className="text-[9px] border-border/20" style={{ color: levelColor, borderColor: `${levelColor}30` }}>
                          {levelName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground"><span className="text-emerald-400 font-semibold">{person.done}</span> concluídas</span>
                        <span className="text-[11px] text-muted-foreground"><span className="text-red-400 font-semibold">{person.overdue}</span> atrasadas</span>
                        <Progress value={getLevelProgress(person.points)} className="h-1.5 w-20 bg-muted/50" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {person.badges.map((b) => {
                        const def = BADGE_DEFS[b];
                        if (!def) return null;
                        return (
                          <motion.div
                            key={b}
                            whileHover={{ scale: 1.2, rotate: 10 }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ background: `${def.color}15` }}
                            title={def.description}
                          >
                            <def.icon className="h-3.5 w-3.5" style={{ color: def.color }} />
                          </motion.div>
                        );
                      })}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{person.points}</p>
                      <p className="text-[10px] text-muted-foreground">pts</p>
                    </div>
                  </motion.div>
                );
              })}
              {ranking.length === 0 && (
                <div className="flex flex-col items-center py-10 text-muted-foreground">
                  <Trophy className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">Nenhum dado de ranking disponível</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
