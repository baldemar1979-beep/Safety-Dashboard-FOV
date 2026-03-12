interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number | null;
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
};

export default function StatCard({ title, value, subtitle, trend, icon, color = 'blue' }: StatCardProps) {
  const colorClass = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend !== null && trend !== undefined && (
            <div className={`inline-flex items-center gap-1 mt-2 text-sm font-medium ${trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}% vs last week</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl ${colorClass}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
