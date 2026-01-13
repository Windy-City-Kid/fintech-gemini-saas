import { useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRightLeft, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CashFlowSankeyProps {
  grossIncome: number;
  socialSecurityIncome: number;
  investmentIncome: number;
  pensionIncome?: number;
  federalTax: number;
  stateTax: number;
  medicarePremium: number;
  housingExpense: number;
  medicalExpense: number;
  livingExpense: number;
  discretionaryExpense: number;
  savingsContribution: number;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

export function CashFlowSankey({
  grossIncome = 120000,
  socialSecurityIncome = 24000,
  investmentIncome = 30000,
  pensionIncome = 0,
  federalTax = 18000,
  stateTax = 5000,
  medicarePremium = 4000,
  housingExpense = 24000,
  medicalExpense = 8000,
  livingExpense = 20000,
  discretionaryExpense = 15000,
  savingsContribution = 6000,
}: CashFlowSankeyProps) {
  const sankeyData = useMemo(() => {
    // Calculate totals for validation
    const totalIncome = grossIncome + socialSecurityIncome + investmentIncome + (pensionIncome || 0);
    const totalTaxes = federalTax + stateTax + medicarePremium;
    const netIncome = totalIncome - totalTaxes;
    const totalExpenses = housingExpense + medicalExpense + livingExpense + discretionaryExpense;
    
    // Build nodes
    const nodes = [
      // Income sources (left)
      { id: 'Salary/Withdrawals', color: 'hsl(142, 76%, 36%)' },
      { id: 'Social Security', color: 'hsl(142, 60%, 50%)' },
      { id: 'Investments', color: 'hsl(168, 76%, 42%)' },
      ...(pensionIncome > 0 ? [{ id: 'Pension', color: 'hsl(180, 60%, 45%)' }] : []),
      
      // Aggregation node
      { id: 'Gross Income', color: 'hsl(215, 60%, 50%)' },
      
      // Tax layer
      { id: 'Taxes & Medicare', color: 'hsl(0, 72%, 51%)' },
      { id: 'Net Income', color: 'hsl(215, 80%, 55%)' },
      
      // Expense destinations (right)
      { id: 'Housing', color: 'hsl(25, 95%, 53%)' },
      { id: 'Healthcare', color: 'hsl(0, 84%, 60%)' },
      { id: 'Living Costs', color: 'hsl(45, 93%, 47%)' },
      { id: 'Discretionary', color: 'hsl(270, 60%, 60%)' },
      { id: 'Savings', color: 'hsl(142, 76%, 36%)' },
    ];

    // Build links
    const links = [
      // Income to Gross Income
      { source: 'Salary/Withdrawals', target: 'Gross Income', value: grossIncome },
      { source: 'Social Security', target: 'Gross Income', value: socialSecurityIncome },
      { source: 'Investments', target: 'Gross Income', value: investmentIncome },
      ...(pensionIncome > 0 ? [{ source: 'Pension', target: 'Gross Income', value: pensionIncome }] : []),
      
      // Gross Income splits
      { source: 'Gross Income', target: 'Taxes & Medicare', value: totalTaxes },
      { source: 'Gross Income', target: 'Net Income', value: netIncome },
      
      // Net Income to expenses
      { source: 'Net Income', target: 'Housing', value: housingExpense },
      { source: 'Net Income', target: 'Healthcare', value: medicalExpense },
      { source: 'Net Income', target: 'Living Costs', value: livingExpense },
      { source: 'Net Income', target: 'Discretionary', value: discretionaryExpense },
      { source: 'Net Income', target: 'Savings', value: Math.max(0, savingsContribution) },
    ].filter(link => link.value > 0);

    return { nodes, links };
  }, [
    grossIncome, socialSecurityIncome, investmentIncome, pensionIncome,
    federalTax, stateTax, medicarePremium,
    housingExpense, medicalExpense, livingExpense, discretionaryExpense, savingsContribution
  ]);

  const totalIncome = grossIncome + socialSecurityIncome + investmentIncome + (pensionIncome || 0);
  const totalTaxes = federalTax + stateTax + medicarePremium;
  const taxRate = ((totalTaxes / totalIncome) * 100).toFixed(1);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            Cash Flow Explorer
          </CardTitle>
          <UITooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Visualizes how every dollar flows from income sources through taxes to final expense buckets. Hover over flows to see amounts.</p>
            </TooltipContent>
          </UITooltip>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
          <span>Gross: <span className="font-medium text-foreground">{formatCurrency(totalIncome)}</span></span>
          <span>Taxes: <span className="font-medium text-destructive">{formatCurrency(totalTaxes)} ({taxRate}%)</span></span>
          <span>Net: <span className="font-medium text-chart-2">{formatCurrency(totalIncome - totalTaxes)}</span></span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div style={{ height: 280 }}>
          <ResponsiveSankey
            data={sankeyData}
            margin={{ top: 10, right: 120, bottom: 10, left: 120 }}
            align="justify"
            colors={{ scheme: 'category10' }}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={18}
            nodeSpacing={16}
            nodeBorderWidth={0}
            nodeBorderRadius={3}
            linkOpacity={0.5}
            linkHoverOthersOpacity={0.1}
            linkContract={2}
            enableLinkGradient={true}
            labelPosition="outside"
            labelOrientation="horizontal"
            labelPadding={8}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
            animate={true}
            nodeTooltip={({ node }) => (
              <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2">
                <strong className="text-foreground">{node.id}</strong>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(node.value as number)}
                </div>
              </div>
            )}
            linkTooltip={({ link }) => (
              <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2">
                <div className="text-sm">
                  <span className="text-foreground font-medium">{link.source.id}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="text-foreground font-medium">{link.target.id}</span>
                </div>
                <div className="text-primary font-bold">
                  {formatCurrency(link.value as number)}
                </div>
              </div>
            )}
          />
        </div>

        {/* Legend row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Taxes</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Net Income</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">Expenses</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
