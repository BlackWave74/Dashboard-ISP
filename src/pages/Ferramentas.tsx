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
  ChevronRight,
  Wrench,
} from "lucide-react";

/* ─── Types ─── */
interface MeetFormState {
  title: string;
  date: string;
  time: string;
  duration: string;
  guests: string;
  description: string;
}

/* ─── Helpers ─── */
function buildGoogleMeetUrl(form: MeetFormState): string {
  const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  const params = new URLSearchParams();

  if (form.title) params.set("text", form.title);
  if (form.description) params.set("details", form.description);

  // Date/time range
  if (form.date && form.time) {
    const start = new Date(`${form.date}T${form.time}:00`);
    const durationMs = (Number(form.duration) || 60) * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    params.set("dates", `${fmt(start)}/${fmt(end)}`);
  }

  // Add Meet conference
  params.set("add", "meet");

  // Guests
  if (form.guests.trim()) {
    const emails = form.guests
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter(Boolean);
    emails.forEach((email) => params.append("add", email));
    // reset add param properly
    const base2 = `${base}&${params.toString()}`;
    return base2;
  }

  return `${base}&${params.toString()}`;
}

function buildDirectMeetUrl(): string {
  return "https://meet.google.com/new";
}

/* ─── Sub-components ─── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-lg border border-border/20 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-primary disabled:opacity-40"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}

function InputField({
  label,
  id,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-foreground/70">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-border/20 bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition"
      />
    </div>
  );
}

/* ─── Main Page ─── */
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

  const set = (field: keyof MeetFormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const meetUrl = buildGoogleMeetUrl(form);
  const directUrl = buildDirectMeetUrl();

  const durationOptions = [
    { label: "30 min", value: "30" },
    { label: "1 hora", value: "60" },
    { label: "1h30", value: "90" },
    { label: "2 horas", value: "120" },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(234 50% 8%) 0%, hsl(250 45% 7%) 40%, hsl(234 40% 6%) 100%)",
        }}
      />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-[10%] right-[-5%] h-[500px] w-[500px] rounded-full opacity-10 blur-[160px]"
          style={{ background: "radial-gradient(circle, hsl(200 90% 50%), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20"
              style={{ background: "hsl(234 89% 64% / 0.1)" }}
            >
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Ferramentas
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Utilitários para facilitar o dia a dia da equipe e dos clientes
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick action — direct Meet */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-6 flex items-center justify-between rounded-2xl border border-border/20 bg-card px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Video className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Iniciar reunião agora
              </p>
              <p className="text-xs text-muted-foreground">
                Abre um Google Meet instantâneo sem precisar agendar
              </p>
            </div>
          </div>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 whitespace-nowrap"
          >
            Abrir Meet
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </motion.div>

        {/* Meet Link Generator */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="rounded-2xl border border-border/20 bg-card overflow-hidden"
        >
          {/* Card header */}
          <div className="flex items-center gap-3 border-b border-border/20 px-6 py-4">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Gerador de Link — Google Meet + Calendar
              </p>
              <p className="text-xs text-muted-foreground">
                Preencha os dados e clique em "Abrir no Calendar" — o Google criará a reunião com link Meet incluso
              </p>
            </div>
          </div>

          <div className="p-6 grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <InputField
                label="Título da reunião"
                id="meet-title"
                value={form.title}
                onChange={set("title")}
                placeholder="Ex: Alinhamento mensal — Cliente ISP"
              />
            </div>

            {/* Date + Time */}
            <InputField
              label="Data"
              id="meet-date"
              type="date"
              value={form.date}
              onChange={set("date")}
            />
            <InputField
              label="Horário"
              id="meet-time"
              type="time"
              value={form.time}
              onChange={set("time")}
            />

            {/* Duration */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/70">
                <Clock className="inline h-3.5 w-3.5 mr-1 opacity-60" />
                Duração
              </label>
              <div className="flex gap-2 flex-wrap">
                {durationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("duration")(opt.value)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      form.duration === opt.value
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/20 text-muted-foreground hover:border-border/40 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guests */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meet-guests" className="text-xs font-medium text-foreground/70">
                <Users className="inline h-3.5 w-3.5 mr-1 opacity-60" />
                Convidados (e-mails, separados por vírgula)
              </label>
              <textarea
                id="meet-guests"
                rows={2}
                value={form.guests}
                onChange={(e) => set("guests")(e.target.value)}
                placeholder="cliente@empresa.com, equipe@empresa.com"
                className="rounded-xl border border-border/20 bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition resize-none"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="meet-desc" className="text-xs font-medium text-foreground/70">
                  Descrição / Pauta (opcional)
                </label>
                <textarea
                  id="meet-desc"
                  rows={3}
                  value={form.description}
                  onChange={(e) => set("description")(e.target.value)}
                  placeholder="Ex: 1. Apresentação do relatório mensal&#10;2. Próximas entregas&#10;3. Dúvidas"
                  className="rounded-xl border border-border/20 bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Preview URL */}
          <div className="border-t border-border/20 bg-muted/5 px-6 py-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
              <Link2 className="h-3 w-3" />
              Link gerado
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-border/20 bg-card px-3 py-2.5 overflow-hidden">
              <p className="flex-1 truncate text-xs text-muted-foreground font-mono select-all">
                {meetUrl}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-border/20 px-6 py-4 flex flex-wrap items-center gap-3">
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <Calendar className="h-4 w-4" />
              Abrir no Google Calendar
              <ChevronRight className="h-4 w-4 opacity-70" />
            </a>
            <CopyButton text={meetUrl} />
          </div>
        </motion.div>

        {/* Info box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 rounded-2xl border border-border/10 bg-muted/5 px-5 py-4 text-xs text-muted-foreground leading-relaxed"
        >
          <strong className="text-foreground/60">Como funciona:</strong> ao clicar em "Abrir no Google Calendar", o Google Calendar será aberto com os dados preenchidos.
          Ao salvar o evento, um link de reunião Google Meet será criado automaticamente. O link Meet é gerado pelo próprio Google — nenhum dado é armazenado aqui.
        </motion.div>
      </div>
    </div>
  );
}
