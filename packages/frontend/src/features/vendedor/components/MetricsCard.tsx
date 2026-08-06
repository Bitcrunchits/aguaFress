import { Card } from '../../../shared/components/Card';

type MetricVariant = 'default' | 'teal' | 'coral';

interface MetricsCardProps {
  title: string;
  value: string;
  variant?: MetricVariant;
}

const borderVariants: Record<MetricVariant, string> = {
  default: 'border-l-4 border-l-text-muted',
  teal: 'border-l-4 border-l-brand-teal',
  coral: 'border-l-4 border-l-brand-coral',
};

export function MetricsCard({ title, value, variant = 'default' }: MetricsCardProps) {
  return (
    <Card className={borderVariants[variant]}>
      <div className="px-4 py-3">
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="mt-1 text-xs text-text-secondary">{title}</p>
      </div>
    </Card>
  );
}
