# Retirement Planning Dashboard

A comprehensive fintech application for retirement planning, featuring Monte Carlo simulations, tax optimization strategies, and AI-powered financial guidance.

**URL**: https://lovable.dev/projects/joyful-savings-dash

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn/ui, Recharts, Framer Motion
- **Backend**: Supabase (via Lovable Cloud)
- **Integrations**: Plaid (account aggregation), Stripe (subscriptions)

## Project Structure

```
src/
├── components/
│   ├── advisor/          # AI Advisor sidebar & chat interface
│   ├── buckets/          # Time-segmentation bucket strategy
│   ├── charts/           # Reusable chart components
│   ├── dashboard/        # Main dashboard components
│   ├── estate/           # Estate planning & beneficiaries
│   ├── income/           # Income source management
│   ├── layout/           # App layout, sidebar, navigation
│   ├── onboarding/       # User onboarding flow
│   ├── rebalance/        # Year-end rebalance audit module
│   ├── scenarios/        # Monte Carlo, Roth, SS strategies
│   ├── ui/               # shadcn/ui primitives
│   └── withdrawal/       # Withdrawal strategy components
├── contexts/             # React contexts (Auth, ChartHover, AIAdvisor)
├── hooks/                # Custom React hooks
├── lib/                  # Core business logic engines
├── pages/                # Route page components
└── workers/              # Web Workers (Monte Carlo)

supabase/
├── config.toml           # Supabase configuration
└── functions/            # Edge Functions
```

## Core Logic Locations

### 📊 Income & Cash Flow
- **`src/lib/cashFlowEngine.ts`** - Cash flow projections and gap analysis
- **`src/hooks/useIncomeSources.ts`** - Income source data management
- **`src/hooks/useCashFlowDashboard.ts`** - Dashboard state aggregation
- **`src/components/income/`** - Income category cards, forms, charts

### 💰 Tax Optimization (2026 OBBB Act Compliant)
- **`src/lib/taxBracketEngine.ts`** - Federal tax brackets (2026), IRMAA cliff detection
- **`src/lib/irsLimits2026.ts`** - IRS contribution limits, Super Catch-Up (SECURE 2.0)
- **`src/lib/rothConversionEngine.ts`** - Roth conversion ladder optimization
- **`src/lib/stateTax2026Engine.ts`** - State-specific tax rules for all 50 states
- **`src/lib/withdrawalEngine.ts`** - Tax-efficient withdrawal sequencing
- **`src/hooks/useRothConversion.ts`** - Roth strategy state management

### 🤖 AI Advisor
- **`supabase/functions/ai-advisor/index.ts`** - Edge function with streaming responses
- **`supabase/functions/retirement-coach/index.ts`** - Contextual coaching prompts
- **`src/hooks/useAIAdvisor.ts`** - Client-side chat management
- **`src/contexts/AIAdvisorContext.tsx`** - Global advisor state
- **`src/components/advisor/`** - Sidebar UI, "Ask AI" button

### 📈 Simulation Engine
- **`src/workers/monteCarloWorker.ts`** - Latin Hypercube Sampling (5,000 trials)
- **`src/lib/guardrailsEngine.ts`** - Guyton-Klinger spending guardrails
- **`src/lib/socialSecurityCalculator.ts`** - SS benefit calculations
- **`src/lib/socialSecurityOptimizer.ts`** - Spousal & survivor optimization

### 🏦 Account Aggregation
- **`supabase/functions/create-link-token/index.ts`** - Plaid Link initialization
- **`supabase/functions/exchange-public-token/index.ts`** - Token exchange
- **`supabase/functions/plaid-webhook/index.ts`** - Balance sync with DLQ

## Key Features

1. **Monte Carlo Simulation** - 5,000-trial retirement success analysis
2. **Social Security Optimizer** - Spousal/survivor benefit maximization
3. **Roth Conversion Explorer** - Tax-bracket filling strategies
4. **Guardrail System** - Dynamic spending adjustments
5. **Relocation Explorer** - State tax comparison (2026 data)
6. **Estate Planning** - Beneficiary allocation & tax impact

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Configured automatically via Lovable Cloud:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Compliance

This application includes a mandatory compliance header: **"Educational tool only. No investment advice provided."**

All financial calculations use 2026 tax law projections based on the OBBB Act framework.
