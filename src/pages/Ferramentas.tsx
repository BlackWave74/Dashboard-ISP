import { useState } from "react";
import { motion } from "framer-motion";
import { usePageSEO } from "@/hooks/usePageSEO";
import {
  Video,
  Calendar,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Users,
  Wrench,
  ChevronRight,
  Info,
  FileText,
} from "lucide-react";

interface MeetFormState {
  title: string;
  date: string;
  time: string;
  duration: string;
  guests: string;
  description: string;
}

function buildGoogleMeetUrl(form: MeetFormState): string {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams();
  if (form.title) params.set("text", form.title);
  if (form.description) params.set("details", form.description);
  if (form.date && form.time) {
    const start = new Date(`${form.date}T${form.time}:00`);
    const durationMs = (Number(form.duration) || 60) * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    params.set("dates", `${fmt(start)}/${fmt(end)}`);
  }
  params.set("add", "meet");
  if (form.guests.trim()) {
    form.guests.split(/[\n,;]/).map((e) => e.trim()).filter(Boolean)
      .forEach((email) => params.append("add", email));
  }
  return `${base}&${params.toString()}`;
}

const DURATION_OPTIONS = [
  { label: "30 min", value: "30" },
  { label: "1 hora", value: "60" },
  { label: "1h 30", value: "90" },
  { label: "2 horas", value: "120" },
];

export default function FerramentasPage() {
  usePageSEO("/ferramentas");

  const today = new Date().toISOString().split("T")[0];
  const nowTime = new Date().toTimeString().slice(0, 5);

  const [form, setForm] = useState<MeetFormState>({
    title: "",
    date: today,
    time: nowTime,
    duration: "60",
    guests: "",
    description: "",
  });
  const [copied, setCopied] = useState(false);

  const set = (field: keyof MeetFormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const meetUrl = buildGoogleMeetUrl(form);

  const handleCopy = () => {
    navigator.clipboard.writeText(meetUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "hsl(222 47% 5%)" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full blur-[120px]"
          style={{ background: "hsl(234 89% 64% / 0.06)" }}
        />
        <div
          className="absolute top-1/2 -left-60 h-[400px] w-[400px] rounded-full blur-[140px]"
          style={{ background: "hsl(200 90% 50% / 0.04)" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center gap-4"
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, hsl(234 89% 64% / 0.2), hsl(234 89% 64% / 0.08))",
              boxShadow: "0 0 0 1px hsl(234 89% 64% / 0.25), 0 8px 24px hsl(234 89% 64% / 0.12)",
            }}
          >
            <Wrench className="h-5 w-5" style={{ color: "hsl(234 89% 70%)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "hsl(210 40% 96%)" }}>
              Ferramentas
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: "hsl(215 20% 55%)" }}>
              Utilitários para facilitar o dia a dia da equipe
            </p>
          </div>
        </motion.div>

        {/* ── Instant Meet Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="mb-5 flex items-center justify-between rounded-2xl px-5 py-4"
          style={{
            background: "linear-gradient(135deg, hsl(160 60% 40% / 0.12), hsl(160 60% 40% / 0.05))",
            boxShadow: "0 0 0 1px hsl(160 60% 40% / 0.2)",
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "hsl(160 60% 40% / 0.15)",
                boxShadow: "0 0 0 1px hsl(160 60% 40% / 0.25)",
              }}
            >
              <Video className="h-4.5 w-4.5" style={{ color: "hsl(160 60% 55%)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "hsl(210 40% 92%)" }}>
                Iniciar reunião agora
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "hsl(215 20% 52%)" }}>
                Abre um Google Meet instantâneo sem agendar
              </p>
            </div>
          </div>
          <a
            href="https://meet.google.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
            style={{
              background: "hsl(160 60% 40% / 0.18)",
              boxShadow: "0 0 0 1px hsl(160 60% 40% / 0.3)",
              color: "hsl(160 60% 60%)",
            }}
          >
            Abrir Meet
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </motion.div>

        {/* ── Generator Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="overflow-hidden rounded-3xl"
          style={{
            background: "hsl(222 40% 8%)",
            boxShadow: "0 0 0 1px hsl(222 25% 14% / 0.8), 0 24px 48px hsl(222 47% 3% / 0.6)",
          }}
        >
          {/* Card top strip */}
          <div
            className="flex items-center gap-3 px-6 py-5"
            style={{ borderBottom: "1px solid hsl(222 25% 13%)" }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "hsl(234 89% 64% / 0.12)" }}
            >
              <Calendar className="h-4 w-4" style={{ color: "hsl(234 89% 68%)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "hsl(210 40% 92%)" }}>
                Gerador de Link — Google Meet + Calendar
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "hsl(215 20% 50%)" }}>
                O Google cria o Meet ao salvar o evento no Calendar
              </p>
            </div>
          </div>

          {/* Form body */}
          <div className="space-y-5 p-6">
            {/* Title */}
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest" style={{ color: "hsl(215 20% 50%)" }}>
                Título da reunião
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title")(e.target.value)}
                placeholder="Ex: Alinhamento mensal — Cliente ISP"
                className="w-full rounded-xl px-4 py-3 text-sm transition-all outline-none"
                style={{
                  background: "hsl(222 40% 11%)",
                  boxShadow: "0 0 0 1px hsl(222 25% 16%)",
                  color: "hsl(210 40% 92%)",
                }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px hsl(234 89% 64% / 0.4)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "0 0 0 1px hsl(222 25% 16%)")}
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Data", type: "date", field: "date" as const },
                { label: "Horário", type: "time", field: "time" as const },
              ].map(({ label, type, field }) => (
                <div key={field}>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest" style={{ color: "hsl(215 20% 50%)" }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={form[field]}
                    onChange={(e) => set(field)(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm transition-all outline-none"
                    style={{
                      background: "hsl(222 40% 11%)",
                      boxShadow: "0 0 0 1px hsl(222 25% 16%)",
                      color: "hsl(210 40% 92%)",
                      colorScheme: "dark",
                    }}
                    onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px hsl(234 89% 64% / 0.4)")}
                    onBlur={(e) => (e.currentTarget.style.boxShadow = "0 0 0 1px hsl(222 25% 16%)")}
                  />
                </div>
              ))}
            </div>

            {/* Duration */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "hsl(215 20% 50%)" }}>
                <Clock className="h-3 w-3" /> Duração
              </label>
              <div
                className="flex rounded-xl p-1"
                style={{ background: "hsl(222 40% 11%)", boxShadow: "0 0 0 1px hsl(222 25% 16%)" }}
              >
                {DURATION_OPTIONS.map((opt) => {
                  const active = form.duration === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("duration")(opt.value)}
                      className="flex-1 rounded-lg py-2 text-xs font-semibold transition-all"
                      style={
                        active
                          ? {
                              background: "hsl(234 89% 64%)",
                              color: "hsl(0 0% 100%)",
                              boxShadow: "0 2px 8px hsl(234 89% 64% / 0.4)",
                            }
                          : { color: "hsl(215 20% 50%)" }
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guests */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "hsl(215 20% 50%)" }}>
                <Users className="h-3 w-3" /> Convidados
              </label>
              <textarea
                rows={2}
                value={form.guests}
                onChange={(e) => set("guests")(e.target.value)}
                placeholder="cliente@empresa.com, parceiro@empresa.com"
                className="w-full resize-none rounded-xl px-4 py-3 text-sm transition-all outline-none"
                style={{
                  background: "hsl(222 40% 11%)",
                  boxShadow: "0 0 0 1px hsl(222 25% 16%)",
                  color: "hsl(210 40% 92%)",
                }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px hsl(234 89% 64% / 0.4)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "0 0 0 1px hsl(222 25% 16%)")}
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "hsl(215 20% 50%)" }}>
                <FileText className="h-3 w-3" /> Pauta / Descrição
                <span className="ml-1 rounded-full px-2 py-0.5 text-[9px]" style={{ background: "hsl(222 30% 16%)", color: "hsl(215 20% 45%)" }}>opcional</span>
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder={"1. Apresentação do relatório\n2. Próximas entregas\n3. Dúvidas"}
                className="w-full resize-none rounded-xl px-4 py-3 text-sm transition-all outline-none"
                style={{
                  background: "hsl(222 40% 11%)",
                  boxShadow: "0 0 0 1px hsl(222 25% 16%)",
                  color: "hsl(210 40% 92%)",
                }}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px hsl(234 89% 64% / 0.4)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "0 0 0 1px hsl(222 25% 16%)")}
              />
            </div>
          </div>

          {/* URL preview strip */}
          <div
            className="mx-6 mb-5 overflow-hidden rounded-xl"
            style={{ background: "hsl(222 40% 11%)", boxShadow: "0 0 0 1px hsl(222 25% 14%)" }}
          >
            <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid hsl(222 25% 13%)" }}>
              <Link2 className="h-3 w-3 shrink-0" style={{ color: "hsl(215 20% 45%)" }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(215 20% 40%)" }}>
                Link gerado
              </span>
            </div>
            <p className="select-all truncate px-3 py-2.5 font-mono text-[11px]" style={{ color: "hsl(215 20% 55%)" }}>
              {meetUrl}
            </p>
          </div>

          {/* Actions */}
          <div
            className="flex flex-wrap items-center gap-3 px-6 pb-6"
          >
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, hsl(234 89% 62%), hsl(250 80% 58%))",
                color: "hsl(0 0% 100%)",
                boxShadow: "0 4px 16px hsl(234 89% 64% / 0.35)",
              }}
            >
              <Calendar className="h-4 w-4" />
              Abrir no Google Calendar
              <ChevronRight className="h-4 w-4 opacity-70" />
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:opacity-80 active:scale-95"
              style={{
                background: copied ? "hsl(160 60% 40% / 0.15)" : "hsl(222 30% 14%)",
                boxShadow: copied
                  ? "0 0 0 1px hsl(160 60% 40% / 0.3)"
                  : "0 0 0 1px hsl(222 25% 18%)",
                color: copied ? "hsl(160 60% 60%)" : "hsl(215 20% 60%)",
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar link"}
            </button>
          </div>
        </motion.div>

        {/* ── Info note ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex items-start gap-3 rounded-2xl px-5 py-4"
          style={{
            background: "hsl(234 50% 8% / 0.6)",
            boxShadow: "0 0 0 1px hsl(234 89% 64% / 0.08)",
          }}
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "hsl(234 89% 64% / 0.5)" }} />
          <p className="text-xs leading-relaxed" style={{ color: "hsl(215 20% 45%)" }}>
            <span className="font-semibold" style={{ color: "hsl(215 20% 58%)" }}>Como funciona: </span>
            ao clicar em "Abrir no Google Calendar", o Calendar abrirá com os dados preenchidos. Ao salvar, o Google gera automaticamente um link de Meet — nenhum dado é armazenado aqui.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
