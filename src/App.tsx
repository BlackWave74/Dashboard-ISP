import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import PageSkeleton from "@/components/ui/PageSkeleton";

// Eager-loaded (always needed)
import LoginPage from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";

// Lazy-loaded pages (code splitting)
const IndexPage = lazy(() => import("./pages/Index"));
const TarefasPage = lazy(() => import("./pages/Tarefas"));
const AnaliticasPage = lazy(() => import("./pages/Analiticas"));
const UsuariosPage = lazy(() => import("./pages/Usuarios"));
const ComodatoPage = lazy(() => import("./pages/Comodato"));
const IntegracoesPage = lazy(() => import("./pages/Integracoes"));
const SuportePage = lazy(() => import("./pages/Suporte"));
const NotFound = lazy(() => import("./pages/NotFound"));

const CalendarioPage = lazy(() => import("./pages/Calendario"));
const GamificacaoPage = lazy(() => import("./pages/Gamificacao"));

const queryClient = new QueryClient();

const LazyPage = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<LazyPage><IndexPage /></LazyPage>} />
            <Route path="/tarefas" element={<LazyPage><TarefasPage /></LazyPage>} />
            <Route path="/analiticas" element={<LazyPage><AnaliticasPage /></LazyPage>} />
            <Route path="/usuarios" element={<LazyPage><UsuariosPage /></LazyPage>} />
            <Route path="/integracoes" element={<LazyPage><IntegracoesPage /></LazyPage>} />
            <Route path="/comodato" element={<LazyPage><ComodatoPage /></LazyPage>} />
            <Route path="/suporte" element={<LazyPage><SuportePage /></LazyPage>} />
            
            <Route path="/calendario" element={<LazyPage><CalendarioPage /></LazyPage>} />
            <Route path="/gamificacao" element={<LazyPage><GamificacaoPage /></LazyPage>} />
          </Route>
          <Route path="*" element={<LazyPage><NotFound /></LazyPage>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
