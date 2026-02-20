import { useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Flame, Target, Zap, Star, TrendingUp, Award, Crown } from "lucide-react";
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

/** Returns true if the task was finished on or before the deadline (same day counts) */
function wasFinishedOnTime(t: Record<string, any>): boolean {
  const statusRaw = String(t.status ?? t.situacao ?? "").toLowerCase();
  const isDone = ["5", "done", "concluido", "concluído", "completed", "finalizado"].includes(statusRaw);
  if (!isDone) return false;

  const deadline = parseDateValue(t.deadline) ?? parseDateValue(t.due_date) ?? parseDateValue(t.dueDate);
  if (!deadline) return true; // sem prazo = considera no prazo

  // Closed date pode indicar quando foi concluída
  const closedRaw = t.closed_date ?? t.closedDate ?? t.data_conclusao ?? null;
  const closedDate = closedRaw ? parseDateValue(String(closedRaw)) : null;

  const checkDate = closedDate ?? new Date();

  // Normaliza para comparar apenas a data (sem hora)
  const deadlineDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const closedDay = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());

  return closedDay <= deadlineDay;
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

/** Animated floating trophy — reduced glow intensity */
function TrophyAnimation() {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 120, damping: 10 }}
    >
      {/* Outer glow ring — softer */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 120, height: 120, background: "radial-gradient(circle, hsl(45 90% 55% / 0.08), transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      {/* Floating trophy */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        className="relative z-10"
      >
        <motion.div
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/15 to-yellow-600/8 border border-amber-400/15 backdrop-blur-sm"
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <Trophy className="h-8 w-8 text-amber-400" />
        </motion.div>
        {/* Sparkle particles — fewer, softer */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber-400/60"
            style={{
              top: `${25 + Math.sin(i * 2) * 25}%`,
              left: `${25 + Math.cos(i * 2) * 30}%`,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.6, 0],
              y: [0, -8, -16],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.5,
              delay: i * 0.6,
              ease: "easeOut",
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
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
      if (status === "done") {
        entry.done++;
        // Conta no prazo apenas se concluída até o dia do vencimento (inclusive)
        if (wasFinishedOnTime(t)) entry.onTime++;
      } else if (status === "overdue") {
        entry.overdue++;
      }
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
      <div className="pointer-events-none absolute bottom-[20%] right-[10%] h-[300px] w-[300px] rounded-full opacity-6 blur-[120px]" style={{ background: "radial-gradient(circle, hsl(280 70% 55%), transparent 70%)" }} />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] space-y-8 px-6 pt-6 md:px-10 pb-16">
        {/* Header with trophy animation */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <TrophyAnimation />
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Ranking de Produtividade
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">Últimos 90 dias • Baseado em tarefas concluídas no prazo</p>
          </div>
        </motion.div>

        {/* Podium — fixed sizes, no oscillation */}
        {topThree.length > 0 && (
          <div className="flex items-end justify-center gap-4 pt-2">
            {[1, 0, 2].map((podiumIdx) => {
              const person = topThree[podiumIdx];
              if (!person) return <div key={podiumIdx} className="w-36" />;
              const isFirst = podiumIdx === 0;
              const isSecond = podiumIdx === 1;
              // isThird = podiumIdx === 2

              const podiumHeights = [180, 150, 120];

              // Medal colors: gold, silver, bronze
              const medalConfigs = [
                {
                  // 1st — GOLD
                  avatarGradient: "linear-gradient(135deg, hsl(45 90% 55%), hsl(38 92% 40%))",
                  avatarSize: "h-14 w-14",
                  barBg: "linear-gradient(180deg, hsl(45 90% 55% / 0.14), hsl(45 90% 55% / 0.03))",
                  barBorder: "1px solid hsl(45 90% 55% / 0.25)",
                  medalEl: <Crown key="g" className="h-7 w-7" style={{ color: "hsl(45 90% 55%)" }} />,
                  rankColor: "hsl(45 90% 55%)",
                  glow: "0 0 24px hsl(45 90% 55% / 0.18)",
                },
                {
                  // 2nd — SILVER
                  avatarGradient: "linear-gradient(135deg, hsl(0 0% 80%), hsl(0 0% 55%))",
                  avatarSize: "h-11 w-11",
                  barBg: "linear-gradient(180deg, hsl(0 0% 70% / 0.10), hsl(0 0% 70% / 0.02))",
                  barBorder: "1px solid hsl(0 0% 70% / 0.20)",
                  medalEl: <Medal key="s" className="h-6 w-6" style={{ color: "hsl(0 0% 75%)" }} />,
                  rankColor: "hsl(0 0% 75%)",
                  glow: "0 0 18px hsl(0 0% 70% / 0.12)",
                },
                {
                  // 3rd — BRONZE
                  avatarGradient: "linear-gradient(135deg, hsl(25 70% 55%), hsl(20 65% 38%))",
                  avatarSize: "h-11 w-11",
                  barBg: "linear-gradient(180deg, hsl(25 70% 45% / 0.10), hsl(25 70% 45% / 0.02))",
                  barBorder: "1px solid hsl(25 70% 45% / 0.20)",
                  medalEl: <Medal key="b" className="h-5 w-5" style={{ color: "hsl(25 70% 55%)" }} />,
                  rankColor: "hsl(25 70% 55%)",
                  glow: "0 0 18px hsl(25 70% 45% / 0.12)",
                },
              ];

              const mc = medalConfigs[podiumIdx];

              return (
                <motion.div
                  key={podiumIdx}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + podiumIdx * 0.2, type: "spring", stiffness: 100 }}
                  className="flex flex-col items-center"
                >
                  {isFirst && (
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className="mb-1"
                    >
                      <Crown className="h-5 w-5" style={{ color: "hsl(45 90% 55%)" }} />
                    </motion.div>
                  )}
                  <div
                    className={`flex items-center justify-center rounded-full ${mc.avatarSize} text-white font-bold text-sm mb-2`}
                    style={{
                      background: mc.avatarGradient,
                      boxShadow: mc.glow,
                    }}
                  >
                    {person.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <p className="text-sm font-bold text-foreground text-center truncate max-w-[110px]">{person.name}</p>
                  <p className="text-xs font-semibold" style={{ color: mc.rankColor }}>{person.points} pts</p>
                  {/* Podium bar */}
                  <motion.div
                    className="w-28 mt-3 rounded-t-xl flex flex-col items-center justify-start pt-4"
                    style={{
                      height: podiumHeights[podiumIdx],
                      background: mc.barBg,
                      border: mc.barBorder,
                      boxShadow: mc.glow,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 + podiumIdx * 0.15, duration: 0.5 }}
                  >
                    {mc.medalEl}
                    <span className="text-2xl font-black mt-2" style={{ color: `${mc.rankColor.replace(")", " / 0.2)")}` }}>
                      #{podiumIdx + 1}
                    </span>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Badges Legend — moved down with more spacing */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="pt-4">
          <div className="rounded-2xl bg-card/25 backdrop-blur-xl p-5" style={{ border: "1px solid hsl(234 89% 64% / 0.08)" }}>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Conquistas Disponíveis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(BADGE_DEFS).map(([key, def], i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + i * 0.08 }}
                  whileHover={{ scale: 1.03 }}
                  className="flex items-center gap-2 rounded-xl bg-card/25 p-3 cursor-default" style={{ border: "1px solid hsl(234 89% 64% / 0.06)" }}
                >
                  <def.icon className="h-5 w-5 shrink-0" style={{ color: def.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{def.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{def.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Full Ranking */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
          <div className="rounded-2xl bg-card/25 backdrop-blur-xl p-5" style={{ border: "1px solid hsl(234 89% 64% / 0.08)" }}>
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
                    transition={{ delay: 1.1 + i * 0.04 }}
                    className="flex items-center gap-4 rounded-xl bg-card/15 p-3 transition-colors hover:bg-card/30 cursor-default" style={{ border: "1px solid hsl(234 89% 64% / 0.06)" }}
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
                        <Badge variant="outline" className="text-[9px] border-border/15" style={{ color: levelColor, borderColor: `${levelColor}25` }}>
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
                          <div
                            key={b}
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{ background: `${def.color}12` }}
                            title={def.description}
                          >
                            <def.icon className="h-3.5 w-3.5" style={{ color: def.color }} />
                          </div>
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
