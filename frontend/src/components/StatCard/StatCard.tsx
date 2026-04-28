import './StatCard.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export default function StatCard({ title, value, subtitle, color }: StatCardProps) {
  const displayValue = typeof value === 'number' && value > 0 ? `+${value}` : String(value);

  return (
    <div className="stat-card" style={color ? { borderTopColor: color } : undefined}>
      <div className="stat-value">{displayValue}</div>
      <div className="stat-label">{title}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}
