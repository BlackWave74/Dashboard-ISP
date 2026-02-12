# Guia rapido para iniciar o app

## 1. Pre-requisitos
- Node.js LTS (testado com v24).
- npm (instala junto com o Node).

## 2. Variaveis de ambiente
Crie um `.env.local` na raiz (ou atualize o existente) com:

```bash
NEXT_PUBLIC_SUPABASE_URL=coloque_a_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=coloque_a_chave_aqui

# Controle de acesso e seeds (opcional, mas recomendado)
NEXT_PUBLIC_ADMIN_PASSCODE=ADMIN-ACCESS
NEXT_PUBLIC_DEFAULT_ADMIN_EMAIL=admin@isp.test
NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD=admin123
```

- `NEXT_PUBLIC_ADMIN_PASSCODE` eh o codigo pedido ao criar um novo admin pela UI.
- O admin padrao eh semeado na primeira carga com o e-mail/senha acima (ajuste para o que preferir).

## 3. Instalar dependencias
```bash
npm install
```

## 4. Rodar o app
```bash
npm run dev
# abre em http://localhost:3000
```

## 5. Perfis e login
- Cadastros e sessoes sao salvos no `localStorage`.
- Usuario administrador pode conectar/desconectar integracoes; usuario comum so visualiza.
- Para criar um admin via tela, informe o codigo definido em `NEXT_PUBLIC_ADMIN_PASSCODE`.

## 6. Estrutura de pastas (resumo)
- `app/` - rotas do Next.js.
- `modules/auth` - autenticacao e componentes de login/cadastro.
- `modules/integrations` - integracoes mock, modal e estado por usuario.
- `modules/tasks/api` - hooks de dados (Supabase) para tarefas/tempos.
- `modules/tasks/ui` - componentes da tela de tarefas (filtros, lista, graficos).
- `modules/tasks/types` e `modules/tasks/utils` - modelos/helpers usados pelos hooks e UI.
- `modules/layout` - navegacao lateral e outros elementos compartilhados.
- `modules/shared` - utilidades comuns (ex.: storage seguro).
