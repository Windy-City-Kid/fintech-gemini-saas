/**
 * Wealth Transfer Sankey Diagram
 * Shows the flow of assets at death: Total Assets → Taxes/Heirs/Charity
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveSankey } from '@nivo/sankey';
import { ArrowRight, Users, Building2, Heart, Receipt } from 'lucide-react';
import { EstateProjectionResult, formatEstateCurrency } from '@/lib/estateCalculator';

interface WealthTransferSankeyProps {
  projection: EstateProjectionResult | null;
  stepUpBasis: number;
}

interface SankeyNode {
  id: string;
  label: string;
  color: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export function WealthTransferSankey({ projection, stepUpBasis }: WealthTransferSankeyProps) {
  const data = useMemo(() => {
    if (!projection) return null;

    const nodes: SankeyNode[] = [
      { id: 'total', label: 'Total Estate', color: 'hsl(var(--primary))' },
    ];

    const links: SankeyLink[] = [];

    // Add tax destination if any taxes
    if (projection.totalEstateTax > 0) {
      if (projection.federalEstateTax > 0) {
        nodes.push({ id: 'federal_tax', label: 'Federal Tax (IRS)', color: 'hsl(var(--destructive))' });
        links.push({ source: 'total', target: 'federal_tax', value: projection.federalEstateTax });
      }
      if (projection.stateEstateTax > 0) {
        nodes.push({ id: 'state_tax', label: 'State Tax', color: 'hsl(var(--chart-4))' });
        links.push({ source: 'total', target: 'state_tax', value: projection.stateEstateTax });
      }
    }

    // Add charity destination if any bequests
    if (projection.charitableDeductions > 0) {
      nodes.push({ id: 'charity', label: 'Charity', color: 'hsl(var(--chart-5))' });
      links.push({ source: 'total', target: 'charity', value: projection.charitableDeductions });
    }

    // Add heirs as the main destination
    if (projection.netToHeirs > 0) {
      nodes.push({ id: 'heirs', label: 'Heirs', color: 'hsl(var(--chart-2))' });
      links.push({ source: 'total', target: 'heirs', value: projection.netToHeirs });
    }

    return { nodes, links };
  }, [projection]);

  if (!projection) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Add accounts and properties to see your wealth transfer flow
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-primary" />
          Wealth Transfer Map
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <Building2 className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Total Estate</p>
            <p className="text-lg font-bold">{formatEstateCurrency(projection.grossEstate)}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
            <Receipt className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">To Taxes</p>
            <p className="text-lg font-bold">{formatEstateCurrency(projection.totalEstateTax)}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-chart-5/10 border border-chart-5/20 text-center">
            <Heart className="h-5 w-5 text-chart-5 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">To Charity</p>
            <p className="text-lg font-bold">{formatEstateCurrency(projection.charitableDeductions)}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/20 text-center">
            <Users className="h-5 w-5 text-chart-2 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">To Heirs</p>
            <p className="text-lg font-bold">{formatEstateCurrency(projection.netToHeirs)}</p>
          </div>
        </div>

        {/* Sankey Diagram */}
        {data && data.links.length > 0 && (
          <div className="h-[300px]">
            <ResponsiveSankey
              data={data}
              margin={{ top: 20, right: 160, bottom: 20, left: 20 }}
              align="justify"
              colors={['hsl(210 60% 50%)', 'hsl(0 70% 50%)', 'hsl(35 85% 55%)', 'hsl(280 65% 55%)', 'hsl(140 65% 45%)']}
              nodeOpacity={1}
              nodeHoverOthersOpacity={0.35}
              nodeThickness={18}
              nodeSpacing={24}
              nodeBorderWidth={0}
              nodeBorderRadius={3}
              linkOpacity={0.5}
              linkHoverOthersOpacity={0.1}
              linkContract={3}
              enableLinkGradient={true}
              labelPosition="outside"
              labelOrientation="horizontal"
              labelPadding={16}
              labelTextColor="#888888"
              nodeTooltip={({ node }) => (
                <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border">
                  <p className="font-semibold">{node.label}</p>
                  <p className="text-lg font-bold">{formatEstateCurrency(node.value as number)}</p>
                  {node.id === 'heirs' && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">After-Tax Inheritable Value</p>
                      <p className="text-sm font-medium text-chart-2">
                        {formatEstateCurrency(projection.netToHeirs)}
                      </p>
                      {stepUpBasis > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          + {formatEstateCurrency(stepUpBasis)} tax-free step-up basis
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              linkTooltip={({ link }) => (
                <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border">
                  <p className="text-sm">
                    {link.source.label} → {link.target.label}
                  </p>
                  <p className="text-lg font-bold">{formatEstateCurrency(link.value)}</p>
                  <p className="text-xs text-muted-foreground">
                    {((link.value / projection.grossEstate) * 100).toFixed(1)}% of estate
                  </p>
                </div>
              )}
            />
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>Total Estate</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>Federal Tax</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-chart-4" />
            <span>State Tax</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-chart-5" />
            <span>Charity</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-chart-2" />
            <span>Heirs</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
