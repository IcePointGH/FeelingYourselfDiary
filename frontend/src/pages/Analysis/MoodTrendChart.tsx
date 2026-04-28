import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatFeelingValue } from '../../utils/feeling';

interface MoodTrendChartProps {
  tab: 'daily' | 'weekly' | 'monthly';
  chartData: { date: string; value: number }[];
  month?: string;
}

function formatXAxisDate(dateStr: string, tab: string): string {
  if (tab === 'monthly') {
    const day = dateStr.split('-')[2];
    return day.startsWith('0') ? day.slice(1) : day;
  }
  const parts = dateStr.split('-');
  return `${parts[1]}-${parts[2]}`;
}

export default function MoodTrendChart({ tab, chartData, month }: MoodTrendChartProps) {
  if (!chartData || chartData.length === 0) return null;

  return (
    <div className="card">
      <h2>情绪波动</h2>
      {tab === 'monthly' && month && (
        <div className="chart-month-title">
          {`${month.split('-')[0]}年${parseInt(month.split('-')[1], 10)}月`}
        </div>
      )}
      <div className={tab === 'monthly' ? 'chart-scroll-wrapper' : undefined}>
        <div className={`chart-container${tab === 'monthly' ? ' monthly' : ''}`}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0d9d0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatXAxisDate(d, tab)}
                tick={{ fontSize: 11, fill: '#a69c97' }}
                axisLine={{ stroke: '#e0d9d0' }}
                tickLine={{ stroke: '#e0d9d0' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#a69c97' }}
                axisLine={{ stroke: '#e0d9d0' }}
                tickLine={{ stroke: '#e0d9d0' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e0d9d0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#5a534e',
                }}
                formatter={(value) => [formatFeelingValue(Number(value)), '情绪值']}
                labelFormatter={(label) => formatXAxisDate(String(label), tab)}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#a69c97"
                strokeWidth={2}
                dot={{ r: 3, fill: '#a69c97' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
