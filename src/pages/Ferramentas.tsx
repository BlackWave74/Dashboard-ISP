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
  Info,
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

  if (form.date && form.time) {
    const start = new Date(`${form.date}T${form.time}:00`);
    const durationMs = (Number(form.duration) || 60) * 60 * 1000;
    const end = new Date(start.getTime() + durationMs);
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    params.set("dates", `${fmt(start)}/${fmt(end)}`);
  }

  params.set("add", "meet");

  if (form.guests.trim()) {
    const emails = form.guests
      .split(/[\n,;]/)
      .map((e) => e.trim())
      .filter(Boolean);
    emails.forEach((email) => params.append("add", email));
    return `${base}&${params.toString()}`;
  }

  return `${base}&${params.toString()}`;
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
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground bg-muted/30 hover:bg-muted/50"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? "Copiado!" : "Copiar link"}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
      {children}
    </label>
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
    <div className="flex flex-col">
      <FieldLabel>{label}</FieldLabel>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl bg-background/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all border-0"
        style={{ boxShadow: "inset 0 0 0 1px hsl(var(--border) / 0.15)" }}
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
          className="absolute top-[10%] right-[-5%] h-[500px] w-[500px] rounded-full opacity-8 blur-[180px]"
          style={{ background: "radial-gradient(circle, hsl(200 90% 50%), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl"
              style={{
                background: "hsl(var(--primary) / 0.12)",
                boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0.2)",
              }}
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
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex items-center justify-between rounded-2xl px-5 py-4"
          style={{
            background: "hsl(160 60% 45% / 0.06)",
            boxShadow: "inset 0 0 0 1px hsl(160 60% 45% / 0.14)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "hsl(160 60% 45% / 0.12)",
                boxShadow: "inset 0 0 0 1px hsl(160 60% 45% / 0.2)",
              }}
            >
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
            href="https://meet.google.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-400 transition-all whitespace-nowrap"
            style={{
              background: "hsl(160 60% 45% / 0.12)",
              boxShadow: "inset 0 0 0 1px hsl(160 60% 45% / 0.25)",
            }}
          >
            Abrir Meet
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </motion.div>

        {/* Meet Link Generator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "hsl(var(--card))",
            boxShadow: "inset 0 0 0 1px hsl(var(--border) / 0.12)",
          }}
        >
          {/* Card header */}
          <div
            className="flex items-center gap-3 px-6 py-4"
            style={{ borderBottom: "1px solid hsl(var(--border) / 0.1)" }}
          >
            <Calendar className="h-4 w-4 text-primary/70" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Gerador de Link — Google Meet + Calendar
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Preencha os dados e clique em "Abrir no Calendar" — o Google criará a reunião com link Meet incluso
              </p>
            </div>
          </div>

          <div className="p-6 grid gap-5 sm:grid-cols-2">
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
            <div>
              <FieldLabel>
                <Clock className="inline h-3 w-3 mr-1 opacity-50" />
                Duração
              </FieldLabel>
              <div className="flex gap-2 flex-wrap mt-1.5">
                {durationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("duration")(opt.value)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      form.duration === opt.value
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={
                      form.duration === opt.value
                        ? {
                            background: "hsl(var(--primary) / 0.12)",
                            boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0.3)",
                          }
                        : {
                            background: "hsl(var(--muted) / 0.3)",
                            boxShadow: "inset 0 0 0 1px hsl(var(--border) / 0.12)",
                          }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Guests */}
            <div>
              <FieldLabel>
                <Users className="inline h-3 w-3 mr-1 opacity-50" />
                Convidados (e-mails)
              </FieldLabel>
              <textarea
                id="meet-guests"
                rows={2}
                value={form.guests}
                onChange={(e) => set("guests")(e.target.value)}
                placeholder="cliente@empresa.com, equipe@empresa.com"
                className="w-full rounded-xl bg-background/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none border-0"
                style={{ boxShadow: "inset 0 0 0 1px hsl(var(--border) / 0.15)" }}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <FieldLabel>Descrição / Pauta (opcional)</FieldLabel>
              <textarea
                id="meet-desc"
                rows={3}
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
                placeholder={"1. Apresentação do relatório mensal\n2. Próximas entregas\n3. Dúvidas"}
                className="w-full rounded-xl bg-background/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none border-0"
                style={{ boxShadow: "inset 0 0 0 1px hsl(var(--border) / 0.15)" }}
              />
            </div>
          </div>

          {/* Preview URL */}
          <div
            className="px-6 py-4"
            style={{ borderTop: "1px solid hsl(var(--border) / 0.1)", background: "hsl(var(--muted) / 0.04)" }}
          >
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
              <Link2 className="h-3 w-3" />
              Link gerado
            </p>
            <div
              className="rounded-xl px-3 py-2.5 overflow-hidden"
              style={{ background: "hsl(var(--background) / 0.5)", boxShadow: "inset 0 0 0 1px hsl(var(--border) / 0.1)" }}
            >
              <p className="truncate text-xs text-muted-foreground/60 font-mono select-all">
                {meetUrl}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div
            className="px-6 py-4 flex flex-wrap items-center gap-3"
            style={{ borderTop: "1px solid hsl(var(--border) / 0.1)" }}
          >
            <a
              href={meetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
              style={{ background: "hsl(var(--primary))" }}
            >
              <Calendar className="h-4 w-4" />
              Abrir no Google Calendar
              <ChevronRight className="h-4 w-4 opacity-60" />
            </a>
            <CopyButton text={meetUrl} />
          </div>
        </motion.div>

        {/* Info box */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex gap-3 rounded-2xl px-5 py-4 text-xs text-muted-foreground/70 leading-relaxed"
          style={{ background: "hsl(var(--muted) / 0.06)", boxShadow: "inset 0 0 0 1px hsl(var(--border) / 0.08)" }}
        >
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/40" />
          <span>
            <strong className="text-muted-foreground/60">Como funciona:</strong> ao clicar em "Abrir no Google Calendar", o Google Calendar será aberto com os dados preenchidos.
            Ao salvar o evento, um link de reunião Google Meet será criado automaticamente. O link Meet é gerado pelo próprio Google — nenhum dado é armazenado aqui.
          </span>
        </motion.div>
      </div>
    </div>
  );
}
