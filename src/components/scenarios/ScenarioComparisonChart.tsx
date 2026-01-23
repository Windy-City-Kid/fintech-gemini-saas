/**
 * Multi-Series Line Chart for comparing projected net worth across scenarios
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Scenario } from '@/hooks/useScenarios';
import { SimulationResult } from '@/hooks/useMonteCarloSimulation';

interface ScenarioComparisonChartProps {
  scenarios: Scenario[];
  simulationResults: Map<string, SimulationResult>;
  currentAge: number;
  retirementAge: number;
}

// Distinct colors for up to 3 scenarios
const SCENARIO_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)', // Green
  'hsl(38, 92%, 50%)',  // Amber
];

const SCENARIO_DASH_PATTERNS = [
  undefined, // Solid
  '8 4',     // Dashed
  '4 4',     // Dotted
];

export function ScenarioComparisonChart({
  scenarios,
  simulationResults,
  currentAge,
  retirementAge,
}: ScenarioComparisonChartProps) {
  // Build chart data from simulation results
  const chartData = useMemo(() => {
    if (scenarios.length === 0) return [];

    // Find the longest simulation result
    let maxLength = 0;
    scenarios.forEach((s) => {
      const result = simulationResults.get(s.id);
      if (result?.percentiles?.p50) {
        maxLength = Math.max(maxLength, result.percentiles.p50.length);
      }
    });

    if (maxLength === 0) return [];

    interface ChartDataPoint {
      age: number;
      [key: string]: number | string;
    }

    const data: ChartDataPoint[] = [];
    for (let i = 0; i < maxLength; i++) {
      const point: ChartDataPoint = {
        age: currentAge + i,
      };

      scenarios.forEach((scenario, idx) => {
        const result = simulationResults.get(scenario.id);
        if (result?.percentiles) {
          // Select percentile based on forecast mode
          const mode = scenario.forecast_mode || 'average';
          let value = 0;
          
          switch (mode) {
            case 'optimistic':
              value = result.percentiles.p75?.[i] ?? 0;
              break;
            case 'pessimistic':
              value = result.percentiles.p25?.[i] ?? 0;
              break;
            default:
              value = result.percentiles.p50?.[i] ?? 0;
          }
          
          point[`scenario_${idx}`] = value;
          point[`name_${idx}`] = scenario.scenario_name;
        }
      });

      data.push(point);
    }

    return data;
  }, [scenarios, simulationResults, currentAge]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (chartData.length === 0) {
    return (
      <div className="stat-card">
        <h3 className="text-lg font-semibold mb-4">Scenario Comparison</h3>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p>Run simulations on selected scenarios to compare projections</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Projected Net Worth Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Overlays up to 3 scenarios with forecast mode adjustments
          </p>
        </div>
        <div className="flex items-center gap-4">
          {scenarios.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: SCENARIO_COLORS[idx] }}
              />
              <span className="truncate max-w-24">{s.scenario_name}</span>
              <span className="text-xs text-muted-foreground">
                ({s.forecast_mode || 'avg'})
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <XAxis 
              dataKey="age" 
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip
              formatter={(value: number, name: string, props: { payload?: ChartDataPoint }) => {
                // eslint-disable-next-line react/prop-types
                const idx = parseInt(name.split('_')[1]);
                // eslint-disable-next-line react/prop-types
                const scenarioName = props.payload ? (props.payload[`name_${idx}`] as string) || `Scenario ${idx + 1}` : `Scenario ${idx + 1}`;
                return [formatCurrency(value), scenarioName];
              }}
              labelFormatter={(age) => `Age ${age}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <ReferenceLine
              x={retirementAge}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              label={{
                value: 'Retirement',
                position: 'top',
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 11,
              }}
            />
            
            {scenarios.map((_, idx) => (
              <Line
                key={idx}
                type="monotone"
                dataKey={`scenario_${idx}`}
                stroke={SCENARIO_COLORS[idx]}
                strokeWidth={2}
                strokeDasharray={SCENARIO_DASH_PATTERNS[idx]}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
