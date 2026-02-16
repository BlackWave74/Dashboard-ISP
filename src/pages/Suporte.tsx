import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle, Send, ChevronDown, Search, HelpCircle,
  Loader2, User, Headphones, BookOpen, Clock,
} from "lucide-react";

/* ─── FAQ Data ─── */
const FAQ_ITEMS = [
  {
    category: "Tarefas",
    questions: [
      { q: "Como acompanho o andamento das minhas tarefas?", a: "Acesse a página 'Tarefas' no menu lateral. Lá você verá todas as tarefas do seu projeto, com status, prazo e responsável. Use os filtros para localizar tarefas específicas." },
      { q: "O que significa tarefa 'Atrasada'?", a: "Uma tarefa é marcada como atrasada quando o prazo de entrega já passou e ela ainda não foi concluída. Tarefas atrasadas são destacadas em vermelho para facilitar a visualização." },
      { q: "Posso editar uma tarefa?", a: "A edição de tarefas é feita pelo seu consultor através do sistema de gestão de projetos. Caso precise de alguma alteração, envie uma mensagem ao seu consultor por esta tela." },
    ],
  },
  {
    category: "Projetos",
    questions: [
      { q: "Por que não vejo todos os projetos?", a: "Você só tem acesso aos projetos que foram vinculados ao seu perfil pelo administrador. Se acredita que deveria ter acesso a mais projetos, entre em contato com seu consultor." },
      { q: "Como funciona o filtro de projetos?", a: "Na página de tarefas e analíticas, use o dropdown 'Projeto' para filtrar as informações por projeto específico. Os projetos listados são aqueles aos quais você tem permissão de acesso." },
    ],
  },
  {
    category: "Conta",
    questions: [
      { q: "Como altero minha senha?", a: "Entre em contato com seu consultor ou administrador para solicitar a alteração de senha. Por segurança, apenas administradores podem redefinir senhas." },
      { q: "Não consigo acessar certas páginas", a: "O acesso às páginas é controlado pelo seu perfil de usuário. Consultores e clientes possuem acesso limitado de acordo com as permissões configuradas pelo administrador." },
    ],
  },
  {
    category: "Analíticas",
    questions: [
      { q: "O que são os gráficos de analíticas?", a: "Os gráficos mostram indicadores de desempenho dos seus projetos, como tarefas concluídas, velocidade de entrega e distribuição por status. Eles ajudam a acompanhar o progresso geral." },
      { q: "Os dados são atualizados em tempo real?", a: "Os dados são sincronizados periodicamente com o sistema de gestão. Use o botão 'Atualizar' para forçar uma atualização dos dados." },
    ],
  },
];

type Message = {
  id: string;
  sender: "user" | "system";
  text: string;
  timestamp: Date;
};

export default function SuportePage() {
  const navigate = useNavigate();
  const { session, loadingSession } = useAuth();
  const [activeTab, setActiveTab] = useState<"chat" | "faq">("faq");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "system",
      text: "Olá! 👋 Bem-vindo ao suporte. Envie sua mensagem e seu consultor responderá em breve. Para dúvidas comuns, consulte a aba de Perguntas Frequentes.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadingSession && !session) navigate("/login");
  }, [loadingSession, session, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    // Simulate consultant response
    setTimeout(() => {
      const systemMsg: Message = {
        id: `sys-${Date.now()}`,
        sender: "system",
        text: "Sua mensagem foi recebida! Seu consultor será notificado e responderá em breve. Tempo médio de resposta: 2 horas.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, systemMsg]);
      setSending(false);
    }, 1200);
  };

  const filteredFaq = faqSearch.trim()
    ? FAQ_ITEMS.map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (q) =>
            q.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
            q.a.toLowerCase().includes(faqSearch.toLowerCase())
        ),
      })).filter((cat) => cat.questions.length > 0)
    : FAQ_ITEMS;

  if (loadingSession) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--task-purple))]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full" style={{ background: "linear-gradient(165deg, hsl(270 60% 10%), hsl(234 45% 6%))" }}>
      <div className="mx-auto w-full max-w-[1000px] space-y-5 p-5 md:p-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] shadow-lg shadow-[hsl(262_83%_58%/0.25)]">
            <Headphones className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--task-text))]">Central de Suporte</h1>
            <p className="text-sm text-[hsl(var(--task-text-muted))]">Tire dúvidas ou fale com seu consultor.</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-[hsl(var(--task-surface))] p-1 border border-[hsl(var(--task-border))]">
          {([
            { key: "faq" as const, label: "Perguntas Frequentes", icon: BookOpen },
            { key: "chat" as const, label: "Falar com Consultor", icon: MessageCircle },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[hsl(var(--task-purple)/0.15)] text-[hsl(var(--task-purple))]"
                  : "text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* FAQ Tab */}
        {activeTab === "faq" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--task-text-muted))]" />
              <input
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Buscar dúvidas..."
                className="h-10 w-full rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] pl-10 pr-4 text-sm text-[hsl(var(--task-text))] outline-none transition focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]"
              />
            </div>

            {filteredFaq.map((category) => (
              <div key={category.category} className="task-card p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-[hsl(var(--task-border))] flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-[hsl(var(--task-purple))]" />
                  <h3 className="text-sm font-bold text-[hsl(var(--task-text))]">{category.category}</h3>
                  <span className="text-[10px] text-[hsl(var(--task-text-muted))]">({category.questions.length})</span>
                </div>
                <div className="divide-y divide-[hsl(var(--task-border)/0.4)]">
                  {category.questions.map((item) => {
                    const isOpen = expandedFaq === item.q;
                    return (
                      <div key={item.q}>
                        <button
                          onClick={() => setExpandedFaq(isOpen ? null : item.q)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-[hsl(var(--task-surface-hover))]"
                        >
                          <span className="text-xs font-medium text-[hsl(var(--task-text))] pr-4">{item.q}</span>
                          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[hsl(var(--task-text-muted))] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <p className="px-4 pb-3 text-xs leading-relaxed text-[hsl(var(--task-text-muted))]">{item.a}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredFaq.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center task-card">
                <HelpCircle className="h-10 w-10 text-[hsl(var(--task-text-muted)/0.15)] mb-3" />
                <p className="text-sm text-[hsl(var(--task-text-muted))]">Nenhuma pergunta encontrada para "{faqSearch}"</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Chat Tab */}
        {activeTab === "chat" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="task-card p-0 overflow-hidden flex flex-col" style={{ height: "calc(100vh - 16rem)" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 styled-scrollbar">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex items-start gap-2 max-w-[75%] ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      msg.sender === "user"
                        ? "bg-[hsl(var(--task-purple)/0.2)] text-[hsl(var(--task-purple))]"
                        : "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {msg.sender === "user" ? <User className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
                    </div>
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      msg.sender === "user"
                        ? "bg-[hsl(var(--task-purple)/0.15)] border border-[hsl(var(--task-purple)/0.2)]"
                        : "bg-[hsl(var(--task-surface-hover))] border border-[hsl(var(--task-border))]"
                    }`}>
                      <p className="text-xs leading-relaxed text-[hsl(var(--task-text))]">{msg.text}</p>
                      <p className="text-[9px] text-[hsl(var(--task-text-muted)/0.4)] mt-1 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-[hsl(var(--task-surface-hover))] border border-[hsl(var(--task-border))] px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--task-text-muted))]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[hsl(var(--task-border))] p-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 h-10 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-4 text-sm text-[hsl(var(--task-text))] outline-none transition focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)] transition hover:shadow-[hsl(262_83%_58%/0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
