import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface BarChartData {
  name: string;
  value: number;
  percentage: number;
}

interface BarChartComponentProps {
  data: BarChartData[];
  title?: string;
  color?: string;
}

const BarChartComponent = ({ data, title, color = '#667eea' }: BarChartComponentProps) => {
  const COLORS = ['#667eea', '#48bb78', '#f6ad55', '#764ba2', '#fc8181', '#9f7aea', '#38b2ac'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-800">{payload[0].payload.name}</p>
          <p className="text-sm text-gray-600">
            {payload[0].value} відповідей ({payload[0].payload.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Обрізаємо довгі назви для осі X
  const truncateLabel = (label: string, maxLength: number = 20) => {
    if (label.length <= maxLength) return label;
    return label.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white rounded-xl p-4">
      {title && (
        <h4 className="text-sm font-semibold text-gray-700 mb-4">{title}</h4>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fill: '#718096' }} axisLine={{ stroke: '#e2e8f0' }} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fill: '#718096' }}
            axisLine={{ stroke: '#e2e8f0' }}
            width={150}
            tickFormatter={truncateLabel}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Легенда з відсотками */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-700">{item.name}</span>
            </div>
            <span className="text-gray-600 font-medium">
              {item.value} ({item.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BarChartComponent;
