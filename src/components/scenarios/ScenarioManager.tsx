/**
 * Scenario Manager - Create, manage, and compare up to 10 scenarios
 */

import { useState } from 'react';
import { 
  Plus, 
  Star, 
  Trash2, 
  Copy, 
  Check, 
  MoreVertical,
  Layers,
  GitCompare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Scenario } from '@/hooks/useScenarios';
import { cn } from '@/lib/utils';

interface ScenarioManagerProps {
  scenarios: Scenario[];
  selectedIds: string[];
  maxScenarios: number;
  onCreateScenario: (name: string, copyFromId?: string) => Promise<any>;
  onDeleteScenario: (id: string) => void;
  onSetBaseline: (id: string) => void;
  onToggleSelection: (id: string) => void;
  onSelectScenario: (id: string) => void;
  activeScenarioId?: string;
}

export function ScenarioManager({
  scenarios,
  selectedIds,
  maxScenarios,
  onCreateScenario,
  onDeleteScenario,
  onSetBaseline,
  onToggleSelection,
  onSelectScenario,
  activeScenarioId,
}: ScenarioManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [copyFromId, setCopyFromId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newScenarioName.trim()) return;
    
    setCreating(true);
    const copyId = copyFromId === '__none__' ? undefined : copyFromId;
    await onCreateScenario(newScenarioName, copyId || undefined);
    setCreating(false);
    setCreateDialogOpen(false);
    setNewScenarioName('');
    setCopyFromId('');
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Scenario Manager</h3>
            <p className="text-sm text-muted-foreground">
              {scenarios.length}/{maxScenarios} scenarios • Select up to 3 to compare
            </p>
          </div>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="gap-2"
              disabled={scenarios.length >= maxScenarios}
            >
              <Plus className="h-4 w-4" />
              New Scenario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Scenario</DialogTitle>
              <DialogDescription>
                Create a new "what-if" scenario to explore different retirement strategies.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Scenario Name</label>
                <Input
                  placeholder="e.g., Early Retirement, Conservative Plan"
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Copy Settings From</label>
                <Select value={copyFromId} onValueChange={setCopyFromId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start fresh (empty)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Start fresh</SelectItem>
                    {scenarios.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.scenario_name} {s.is_baseline && '(Baseline)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!newScenarioName.trim() || creating}>
                {creating ? 'Creating...' : 'Create Scenario'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scenarios List */}
      <div className="space-y-2">
        {scenarios.map((scenario) => {
          const isSelected = selectedIds.includes(scenario.id);
          const isActive = scenario.id === activeScenarioId;
          
          return (
            <div
              key={scenario.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                isActive && "bg-primary/5 border-primary",
                !isActive && "bg-card hover:bg-muted/50 border-border"
              )}
              onClick={() => onSelectScenario(scenario.id)}
            >
              {/* Selection Checkbox */}
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(scenario.id)}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Scenario Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{scenario.scenario_name}</span>
                  {scenario.is_baseline && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Star className="h-3 w-3 fill-current" />
                      Baseline
                    </Badge>
                  )}
                  {isActive && (
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Age {scenario.current_age || '—'} → {scenario.retirement_age}</span>
                  <span>•</span>
                  <span className={cn(
                    "font-mono",
                    scenario.cached_success_rate !== null && scenario.cached_success_rate >= 80 && "text-green-600",
                    scenario.cached_success_rate !== null && scenario.cached_success_rate < 80 && scenario.cached_success_rate >= 60 && "text-yellow-600",
                    scenario.cached_success_rate !== null && scenario.cached_success_rate < 60 && "text-red-600"
                  )}>
                    {scenario.cached_success_rate !== null 
                      ? `${scenario.cached_success_rate.toFixed(0)}% success` 
                      : 'Not simulated'}
                  </span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Estate</p>
                  <p className="font-mono">{formatCurrency(scenario.cached_estate_value)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Taxes</p>
                  <p className="font-mono">{formatCurrency(scenario.total_lifetime_taxes)}</p>
                </div>
              </div>

              {/* Actions Menu */}
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!scenario.is_baseline && (
                      <DropdownMenuItem onClick={() => onSetBaseline(scenario.id)}>
                        <Star className="h-4 w-4 mr-2" />
                        Set as Baseline
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => {
                      setNewScenarioName(`${scenario.scenario_name} (Copy)`);
                      setCopyFromId(scenario.id);
                      setCreateDialogOpen(true);
                    }}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {!scenario.is_baseline && (
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => onDeleteScenario(scenario.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {scenarios.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No scenarios yet</p>
            <p className="text-sm">Create your first retirement scenario to get started</p>
          </div>
        )}
      </div>

      {/* Compare Button */}
      {selectedIds.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <GitCompare className="h-4 w-4 inline mr-1" />
              {selectedIds.length} scenarios selected for comparison
            </p>
            <Button size="sm" variant="outline" onClick={() => {}}>
              View Comparison
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
