import { Button } from '@/components/ui/button';
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group';

interface PeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  periods?: string[];
}

export function PeriodSelector({ 
  selectedPeriod, 
  onPeriodChange, 
  periods = ['7d', '30d', '90d', '1y'] 
}: PeriodSelectorProps) {
  return (
    <ButtonGroup gap="sm">
      <ButtonGroupText>Period:</ButtonGroupText>
      {periods.map((period) => (
        <Button
          key={period}
          variant={selectedPeriod === period ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPeriodChange(period)}
        >
          {period}
        </Button>
      ))}
    </ButtonGroup>
  );
}
