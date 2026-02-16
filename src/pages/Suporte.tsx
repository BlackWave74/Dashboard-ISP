import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Search, HelpCircle, Loader2, Headphones, BookOpen, ChevronDown,
  AlertTriangle,
} from "lucide-react";

/* ─── FAQ Data ─── */
type FaqItem = { q: string; a: string };
type FaqCategory = { category: string; questions: FaqItem[]; requiredArea?: string };

const FAQ_ITEMS: FaqCategory[] = [
  {
    category: "Tarefas",
    requiredArea: "tarefas",
    questions: [
      { q: "Como acompanho o andamento das minhas tarefas?", a: "Acesse a página 'Tarefas' no menu lateral. Lá você verá todas as tarefas do seu projeto, com status, prazo e responsável. Use os filtros para localizar tarefas específicas." },
      { q: "O que significa tarefa 'Atrasada'?", a: "Uma tarefa é marcada como atrasada quando o prazo de entrega já passou e ela ainda não foi concluída. Tarefas atrasadas são destacadas em vermelho para facilitar a visualização." },
      { q: "Posso editar uma tarefa?", a: "A edição de tarefas é feita pelo seu consultor através do sistema de gestão de projetos. Caso precise de alguma alteração, entre em contato com seu consultor." },
    ],
  },
  {
    category: "Conta & Acesso",
    questions: [
      { q: "Como altero minha senha?", a: "A alteração de senha deve ser solicitada ao seu consultor ou administrador responsável. Entre em contato informando que deseja redefinir sua senha e ele providenciará a alteração de forma segura." },
      { q: "Esqueci minha senha, o que faço?", a: "Entre em contato diretamente com seu consultor ou administrador. Informe o e-mail cadastrado e ele irá gerar uma nova senha segura para você. Não temos sistema automático de recuperação de senha no momento." },
      { q: "Não consigo acessar certas páginas", a: "O acesso às páginas é controlado pelo seu perfil de usuário. Consultores e clientes possuem acesso limitado de acordo com as permissões configuradas pelo administrador." },
      { q: "Minha conta foi bloqueada após tentativas de login", a: "Após 3 tentativas de login com senha incorreta, sua conta é temporariamente bloqueada por segurança. Aguarde 60 segundos e tente novamente, ou entre em contato com seu consultor para verificar suas credenciais." },
    ],
  },
  {
    category: "Comodato",
    requiredArea: "comodato",
    questions: [
      { q: "Como consulto um equipamento em comodato?", a: "Acesse a página 'Comodato' no menu lateral e use a aba 'Consultar'. Informe o login PPPoE ou número de série do equipamento para verificar o status do comodato." },
      { q: "Como lanço um novo comodato?", a: "Na página 'Comodato', use a aba 'Lançar'. Preencha os dados do contrato, equipamento e confirme o lançamento. O sistema registrará automaticamente no IXC." },
    ],
  },
  {
    category: "Analíticas",
    requiredArea: "analiticas",
    questions: [
      { q: "O que são os gráficos de analíticas?", a: "Os gráficos mostram indicadores de desempenho dos seus projetos, como tarefas concluídas, velocidade de entrega e distribuição por status. Eles ajudam a acompanhar o progresso geral." },
      { q: "Os dados são atualizados em tempo real?", a: "Os dados são sincronizados periodicamente com o sistema de gestão. Use o botão 'Atualizar' para forçar uma atualização dos dados." },
    ],
  },
];

export default function SuportePage() {
  const navigate = useNavigate();
  const { session, loadingSession, canAccess } = useAuth();
  const [faqSearch, setFaqSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  useEffect(() => {
    if (!loadingSession && !session) navigate("/login");
  }, [loadingSession, session, navigate]);

  // Filter FAQ based on user's allowed areas
  const visibleFaq = useMemo(() => {
    return FAQ_ITEMS.filter(cat => {
      if (!cat.requiredArea) return true; // always show categories without area requirement
      return canAccess(cat.requiredArea as any);
    });
  }, [canAccess]);

  const filteredFaq = useMemo(() => {
    if (!faqSearch.trim()) return visibleFaq;
    return visibleFaq
      .map((cat) => ({
        ...cat,
        questions: cat.questions.filter(
          (q) =>
            q.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
            q.a.toLowerCase().includes(faqSearch.toLowerCase())
        ),
      }))
      .filter((cat) => cat.questions.length > 0);
  }, [faqSearch, visibleFaq]);

  if (loadingSession) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--task-purple))]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-y-auto" style={{ background: "linear-gradient(165deg, hsl(270 60% 10%), hsl(234 45% 6%))" }}>
      <div className="mx-auto w-full max-w-[1000px] space-y-5 p-5 md:p-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] shadow-lg shadow-[hsl(262_83%_58%/0.25)]">
            <Headphones className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--task-text))]">Central de Suporte</h1>
            <p className="text-sm text-[hsl(var(--task-text-muted))]">Tire suas dúvidas com as perguntas frequentes.</p>
          </div>
        </motion.div>

        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl bg-[hsl(var(--task-purple)/0.08)] border border-[hsl(var(--task-purple)/0.15)] p-4">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-[hsl(var(--task-yellow))]" />
          <p className="text-xs leading-relaxed text-[hsl(var(--task-text-muted))]">
            Para <strong className="text-[hsl(var(--task-text))]">alteração de senha</strong> ou qualquer problema de acesso, entre em contato diretamente com seu <strong className="text-[hsl(var(--task-text))]">consultor responsável</strong>.
          </p>
        </div>

        {/* Title bar */}
        <div className="flex items-center gap-2 rounded-xl bg-[hsl(var(--task-surface))] p-3 border border-[hsl(var(--task-border))]">
          <BookOpen className="h-4 w-4 text-[hsl(var(--task-purple))]" />
          <span className="text-xs font-semibold text-[hsl(var(--task-text))]">Perguntas Frequentes</span>
          <span className="text-[10px] text-[hsl(var(--task-text-muted))]">({visibleFaq.reduce((acc, cat) => acc + cat.questions.length, 0)} perguntas)</span>
        </div>

        {/* FAQ */}
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
      </div>
    </div>
  );
}