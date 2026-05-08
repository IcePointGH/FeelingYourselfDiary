import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatFeelingValue, getMoodColor } from '../../utils/feeling';

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

/* Custom dot colored by mood value */
function MoodDot(props: { cx?: number; cy?: number; payload?: { value: number } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  const color = getMoodColor(payload.value);
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />;
}

function MoodActiveDot(props: { cx?: number; cy?: number; payload?: { value: number } }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;
  const color = getMoodColor(payload.value);
  return <circle cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={2} />;
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => formatXAxisDate(d, tab)}
                tick={{ fontSize: 11, fill: '#999' }}
                axisLine={{ stroke: '#e8e8e8' }}
                tickLine={{ stroke: '#e8e8e8' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#999' }}
                axisLine={{ stroke: '#e8e8e8' }}
                tickLine={{ stroke: '#e8e8e8' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e8e8e8',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#454545',
                }}
                formatter={(value) => [formatFeelingValue(Number(value)), '情绪值']}
                labelFormatter={(label) => formatXAxisDate(String(label), tab)}
              />
              <ReferenceLine y={0} stroke="#e0e0e0" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#d0d0d0"
                strokeWidth={1.5}
                dot={<MoodDot />}
                activeDot={<MoodActiveDot />}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
