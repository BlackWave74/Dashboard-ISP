import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Login";
import DashboardLayout from "./components/DashboardLayout";
import IndexPage from "./pages/Index";
import TarefasPage from "./pages/Tarefas";
import AnaliticasPage from "./pages/Analiticas";
import UsuariosPage from "./pages/Usuarios";
import ComodatoPage from "./pages/Comodato";
import ConfiguracoesPage from "./pages/Configuracoes";
import SuportePage from "./pages/Suporte";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<IndexPage />} />
            <Route path="/tarefas" element={<TarefasPage />} />
            <Route path="/analiticas" element={<AnaliticasPage />} />
            <Route path="/usuarios" element={<UsuariosPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/comodato" element={<ComodatoPage />} />
            <Route path="/suporte" element={<SuportePage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
