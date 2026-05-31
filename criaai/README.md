# CriaAI — Backend Setup

## Stack
- Next.js 14 (App Router)
- Supabase (banco + auth)
- Stripe (pagamentos)
- Kling AI (geração de vídeo)
- OpenAI GPT-4o (geração de ebook + copy)

---

## 1. Instalar dependências

```bash
npm install @supabase/supabase-js stripe openai
npm install -D @types/node typescript
```

---

## 2. Configurar variáveis de ambiente

Copie `.env.local` e preencha todas as chaves:

| Variável | Onde pegar |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → Signing secret |
| `KLING_API_KEY` | klingai.com → API → Keys |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |

---

## 3. Criar produtos no Stripe

No dashboard do Stripe, crie:

**Assinaturas:**
- Starter Mensal — R$97/mês
- Starter Anual — R$931/ano
- Pro Mensal — R$197/mês
- Pro Anual — R$1.891/ano
- Agency Mensal — R$497/mês
- Agency Anual — R$4.771/ano

**Pagamentos únicos (packs):**
- Pack 10 créditos — R$27
- Pack 30 créditos — R$67
- Pack 100 créditos — R$197

Cole os Price IDs no `.env.local`.

---

## 4. Configurar Webhook do Stripe

```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Em produção, adicione no dashboard Stripe:
- URL: `https://seudominio.com.br/api/stripe/webhook`
- Eventos: `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`

---

## 5. APIs disponíveis

### POST /api/generate-video
```json
{
  "imageUrl": "https://...",
  "niche": "skincare",
  "tone": "lifestyle",
  "format": "9:16"
}
```

### POST /api/generate-ebook
```json
{
  "niche": "marketing digital",
  "title": "Guia Completo de Tráfego Pago",
  "subtitle": "Do zero ao primeiro cliente",
  "chapters": 7,
  "audience": ["iniciantes", "afiliados"],
  "tone": "motivador",
  "color": "#7c5cfc",
  "author": "João Silva"
}
```

### GET /api/credits/consume
Retorna saldo atual de créditos do usuário.

### POST /api/stripe/checkout
```json
{ "plan": "Pro", "billing": "monthly" }
```
Retorna `{ url }` para redirecionar ao checkout Stripe.

---

## 6. Rodar em desenvolvimento

```bash
npm run dev
```

---

## 7. Estrutura de arquivos

```
app/
  api/
    generate-video/route.ts   ← gera vídeo via Kling
    generate-ebook/route.ts   ← gera ebook via GPT-4o
    stripe/
      checkout/route.ts       ← cria sessão de pagamento
      webhook/route.ts        ← recebe eventos do Stripe
    credits/
      consume/route.ts        ← consulta saldo de créditos
lib/
  supabase.ts                 ← cliente Supabase
  kling.ts                    ← integração Kling AI
.env.local                    ← variáveis de ambiente
```
