# Portfólio — Djennifer Carvalho

Portfólio pessoal com projetos, estudos de caso e formulário de contato integrado ao Resend.

## Desenvolvimento local

Requer Node.js 20 ou superior.

```bash
npm run dev
```

O site ficará disponível em `http://127.0.0.1:4173`.

## Configuração do formulário

1. Copie `.env.example` para `.env.local`.
2. Crie uma chave no Resend ou instale a integração Resend no Vercel Marketplace.
3. Preencha as três variáveis:

```env
RESEND_API_KEY=re_sua_chave
CONTACT_TO_EMAIL=djennifercarvalhoq@gmail.com
CONTACT_FROM_EMAIL=onboarding@resend.dev
```

Para produção, substitua `onboarding@resend.dev` por um endereço de domínio verificado no Resend.

## Validação

```bash
npm test
npm run check
```

## Publicação na Vercel

Cadastre `RESEND_API_KEY`, `CONTACT_TO_EMAIL` e `CONTACT_FROM_EMAIL` nas variáveis de ambiente do projeto. O arquivo `.env.local` é ignorado e não deve ser enviado ao repositório.
