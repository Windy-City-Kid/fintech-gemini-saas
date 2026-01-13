import { useState } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MonthYearPickerProps {
  month: number | null;
  year: number | null;
  onSelect: (month: number, year: number) => void;
  minYear?: number;
  maxYear?: number;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  milestoneOptions?: { value: string; label: string }[];
  selectedMilestone?: string | null;
  onMilestoneSelect?: (milestone: string | null) => void;
}

const MONTHS = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

export function MonthYearPicker({
  month,
  year,
  onSelect,
  minYear = 2024,
  maxYear = 2100,
  label,
  placeholder = 'Select date',
  disabled = false,
  milestoneOptions,
  selectedMilestone,
  onMilestoneSelect,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(month);

  const handleMonthClick = (m: number) => {
    setSelectedMonth(m);
    onSelect(m, viewYear);
    if (onMilestoneSelect) {
      onMilestoneSelect(null); // Clear milestone when custom date selected
    }
    setOpen(false);
  };

  const handleMilestoneChange = (value: string) => {
    if (onMilestoneSelect) {
      onMilestoneSelect(value === 'custom' ? null : value);
    }
    if (value !== 'custom') {
      setOpen(false);
    }
  };

  const displayValue = selectedMilestone
    ? milestoneOptions?.find(m => m.value === selectedMilestone)?.label
    : month && year
    ? `${MONTHS.find(m => m.value === month)?.short} ${year}`
    : null;

  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-muted-foreground">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !displayValue && 'text-muted-foreground'
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            {/* Milestone selector */}
            {milestoneOptions && milestoneOptions.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Sync to Milestone</label>
                <Select
                  value={selectedMilestone || 'custom'}
                  onValueChange={handleMilestoneChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select milestone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom Date</SelectItem>
                    {milestoneOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Year navigation */}
            {(!selectedMilestone || selectedMilestone === 'custom') && (
              <>
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewYear(y => Math.max(minYear, y - 1))}
                    disabled={viewYear <= minYear}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Select
                      value={viewYear.toString()}
                      onValueChange={(v) => setViewYear(parseInt(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map(y => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewYear(y => Math.min(maxYear, y + 1))}
                    disabled={viewYear >= maxYear}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* Month grid */}
                <div className="grid grid-cols-3 gap-2">
                  {MONTHS.map(m => (
                    <Button
                      key={m.value}
                      variant={selectedMonth === m.value && viewYear === year ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleMonthClick(m.value)}
                      className="text-xs"
                    >
                      {m.short}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
