This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Configurar variáveis de ambiente

Antes de abrir o projeto, copie o template e personalize as chaves reais:

```bash
cp .env.example .env.local
# ou no Windows:
copy .env.example .env.local
```

- Preencha os dados do Supabase (URL pública, anon key e service role).  
- Atualize as credenciais mock/seed (`NEXT_PUBLIC_DEFAULT_ADMIN_*` e `NEXT_PUBLIC_ADMIN_PASSCODE`).  
- Ajuste as variáveis do Flask/IXC (`FLASK_*`, `IXC_*`) conforme a instância alvo.  

Os scripts `npm run dev`, `npm run build` e `npm run start` já carregam `.env.local` com `dotenv-cli`, então não é preciso exportar variáveis manualmente.

## Subir frontend + backend juntos
Use `python iniciador.py` para ligar `next dev frontend` e o Flask (`web.app`) em um único comando. O script imprime os links em `127.0.0.1` e no IP da LAN e encerra ambos os processos quando você pressiona `Ctrl+C`. Para testes rápidos, defina `INICIADOR_RUNTIME_SECONDS=<segundos>` antes de executar o script para forçar a parada automática.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
