import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Account {
  account_type: string;
  current_balance: number;
}

interface AllocationChartProps {
  accounts: Account[];
}

const COLORS = [
  'hsl(152, 76%, 45%)',
  'hsl(199, 89%, 48%)',
  'hsl(262, 83%, 58%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 72%, 51%)',
  'hsl(180, 70%, 45%)',
  'hsl(320, 70%, 50%)',
  'hsl(60, 70%, 45%)',
];

export function AllocationChart({ accounts }: AllocationChartProps) {
  // Group by account type
  const allocationData = accounts.reduce((acc, account) => {
    const existing = acc.find(item => item.name === account.account_type);
    if (existing) {
      existing.value += Number(account.current_balance);
    } else {
      acc.push({ name: account.account_type, value: Number(account.current_balance) });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  if (accounts.length === 0) {
    return (
      <div className="stat-card">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Asset Allocation</h3>
          <p className="text-sm text-muted-foreground">By account type</p>
        </div>
        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
          Add accounts to see allocation
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Asset Allocation</h3>
        <p className="text-sm text-muted-foreground">By account type</p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={allocationData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {allocationData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 12%)',
                border: '1px solid hsl(217, 33%, 20%)',
                borderRadius: '8px',
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
              }}
              formatter={(value: number) => formatValue(value)}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
