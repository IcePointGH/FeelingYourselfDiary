import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatFeelingValue, getMoodColor } from '../../utils/feeling';

interface ChartDataItem {
  date?: string;
  value: number;
  isFiller?: boolean;
}

interface MoodTrendChartProps {
  tab: 'daily' | 'weekly' | 'monthly';
  chartData: ChartDataItem[];
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

/* ── helpers ── */
function isDarkMode(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

/** Compute Y-axis domain that positions 0 intelligently:
 *  - all values ≥ 0 → 0 at bottom (no negative space)
 *  - all values ≤ 0 → 0 at top (no positive space)
 *  - mixed → 0 in middle with 1-unit padding */
function computeSmartDomain(data: ChartDataItem[]): [number, number] {
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    if (min >= 0) return [0, max + 1];
    if (max <= 0) return [min - 1, 0];
    return [min - 1, max + 1];
  }

  if (min >= 0) return [0, max + 1];
  if (max <= 0) return [min - 1, 0];
  return [min - 1, max + 1];
}

/* Custom dot colored by mood value */
function MoodDot(props: { cx?: number; cy?: number; payload?: ChartDataItem }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;

  if (payload.isFiller) {
    const stroke = isDarkMode() ? '#fff' : '#454545';
    return <circle cx={cx} cy={cy} r={2.5} fill="#fff" stroke={stroke} strokeWidth={1} />;
  }

  const color = getMoodColor(payload.value);
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />;
}

function MoodActiveDot(props: { cx?: number; cy?: number; payload?: ChartDataItem }) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || !payload) return null;

  if (payload.isFiller) {
    const stroke = isDarkMode() ? '#fff' : '#454545';
    return <circle cx={cx} cy={cy} r={3.5} fill="#fff" stroke={stroke} strokeWidth={1.5} />;
  }

  const color = getMoodColor(payload.value);
  return <circle cx={cx} cy={cy} r={6} fill={color} stroke="#fff" strokeWidth={2} />;
}

export default function MoodTrendChart({ tab, chartData, month }: MoodTrendChartProps) {
  if (!chartData || chartData.length === 0) return null;

  // ── Daily: LineChart of mood trajectory through the day ──
  if (tab === 'daily') {
    return (
      <div className="card">
        <h2>情绪波动</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#999' }}
              axisLine={{ stroke: '#e8e8e8' }}
              tickLine={{ stroke: '#e8e8e8' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#999' }}
              axisLine={{ stroke: '#e8e8e8' }}
              tickLine={{ stroke: '#e8e8e8' }}
              domain={computeSmartDomain(chartData)}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #e8e8e8',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#454545',
              }}
              formatter={(_value: number) => [formatFeelingValue(_value), '情绪值']}
              labelFormatter={(label) => String(label)}
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
    );
  }

  // ── Weekly / Monthly: LineChart ──
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
                domain={computeSmartDomain(chartData)}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e8e8e8',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#454545',
                }}
                formatter={(_value, _name, props) => {
                  if ((props.payload as ChartDataItem).isFiller) return ['无数据', '情绪值'];
                  return [formatFeelingValue(Number(_value)), '情绪值'];
                }}
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
