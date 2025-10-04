import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PieChartData {
  name: string;
  value: number;
  percentage: number;
}

interface PieChartComponentProps {
  data: PieChartData[];
  title?: string;
}

const COLORS = ['#667eea', '#48bb78', '#f6ad55', '#764ba2', '#fc8181', '#9f7aea', '#38b2ac'];

const PieChartComponent = ({ data, title }: PieChartComponentProps) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            {payload[0].value} відповідей ({payload[0].payload.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percentage < 5) return null; // Не показуємо відсоток для маленьких сегментів

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-semibold text-sm"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-xl p-4">
      {title && (
        <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => (
              <span className="text-sm text-gray-700">
                {value} ({entry.payload.percentage.toFixed(1)}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PieChartComponent;
