# MAPA_PROJETO

## Estrutura atual (PT-BR)

| Pasta          | Antes             | Depois                  | O que faz |
|----------------|-------------------|-------------------------|-----------|
| `app/`         | `app/`            | `frontend/app/`         | Router/app do Next.js com páginas e APIs. |
| `modules/`     | `modules/`        | `frontend/modules/`     | Hooks, componentes e integrações consumidas pelo frontend. |
| `styles/`      | `styles/`         | `frontend/styles/`      | CSS globais e específicos das páginas. |
| `public/`      | `public/`         | `frontend/public/`      | Ativos públicos (logos, favicons) servidos pelo Next. |
| `frontend/`    | (nova)            |                         | Container único do frontend a cada build. |
| `backend/`     | (nova)            |                         | Destinado ao Flask/web API (web/). |
| `shared/`      | (nova)            |                         | Abriga código compartilhado (`core/`, módulos utilitários). |
| `docs/`        | (nova)            | `docs/archive/`         | Arquivos de referência arquivados (fixtures TXT e SQL legado). |

-## Observações

- O `package.json` agora roda o Next a partir de `frontend/` (`next build frontend` etc.).
- O `tsconfig.json` do root mantém o alias `@/*` apontando para `frontend/*`, e `frontend/tsconfig.json` estende essa configuração para evitar reescrita automática.

-## ATIVO vs LEGACY

- **Ativo**: `frontend/`, `web/`, `core/`, `scripts/` continuam sendo a base da aplicação atual (Next, Flask/API, lógica compartilhada e deploy).  
- **Arquivado**: referências históricas e fixtures foram movidas para `docs/archive/` para reduzir código morto no runtime.
