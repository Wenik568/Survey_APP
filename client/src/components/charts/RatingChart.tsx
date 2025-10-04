import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RatingChartProps {
  data: { rating: number; count: number }[];
  average: number;
}

const RatingChart = ({ data, average }: RatingChartProps) => {
  const COLORS = ['#fc8181', '#f6ad55', '#f6e05e', '#68d391', '#48bb78'];

  // Переконуємось що всі рейтинги від 1 до 5 присутні
  const fullData = [1, 2, 3, 4, 5].map(rating => {
    const found = data.find(d => d.rating === rating);
    return {
      rating: `${rating}⭐`,
      count: found?.count || 0,
      rawRating: rating
    };
  });

  return (
    <div className="space-y-4">
      {/* Середній рейтинг */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 text-center">
        <div className="text-5xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
          ⭐ {average.toFixed(2)}
        </div>
        <p className="text-gray-600 mt-2">Середній рейтинг</p>
      </div>

      {/* Графік розподілу */}
      <div className="bg-white rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Розподіл оцінок</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={fullData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="rating"
              tick={{ fill: '#718096' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tick={{ fill: '#718096' }}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
              formatter={(value: number) => [`${value} відповідей`, 'Кількість']}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {fullData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.rawRating - 1]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RatingChart;
