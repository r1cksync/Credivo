'use client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a78bfa', '#06b6d4'];

const tipStyle = {
  contentStyle: { background: '#0a1628', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 },
  itemStyle: { color: '#e2e8f0' },
  labelStyle: { color: '#94a3b8', fontSize: 11 },
};

export function ChartCard({ title, subtitle, children, height = 240 }: { title: string; subtitle?: string; children: React.ReactNode; height?: number }) {
  return (
    <div className="card-glass p-5">
      <div className="mb-3">
        <div className="text-sm font-medium text-slate-200">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
      <div style={{ width: '100%', height }}>{children}</div>
    </div>
  );
}

export function LineSeries({ data, lines }: { data: any[]; lines: { key: string; color?: string; name?: string }[] }) {
  return (
    <ResponsiveContainer>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
        <YAxis stroke="#64748b" fontSize={10} />
        <Tooltip {...tipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {lines.map((l, i) => (
          <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color || PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} name={l.name || l.key} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BarSeries({ data, bars, xKey = 'date', stacked = false }: { data: any[]; bars: { key: string; color?: string; name?: string }[]; xKey?: string; stacked?: boolean }) {
  return (
    <ResponsiveContainer>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey={xKey} stroke="#64748b" fontSize={10} />
        <YAxis stroke="#64748b" fontSize={10} />
        <Tooltip {...tipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {bars.map((b, i) => (
          <Bar key={b.key} dataKey={b.key} fill={b.color || PALETTE[i % PALETTE.length]} stackId={stacked ? 'a' : undefined} name={b.name || b.key} radius={stacked ? undefined : [4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip {...tipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Helper to convert a key→count object into pie data
export function toPie(obj: Record<string, number> | undefined): { name: string; value: number }[] {
  if (!obj) return [];
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}
