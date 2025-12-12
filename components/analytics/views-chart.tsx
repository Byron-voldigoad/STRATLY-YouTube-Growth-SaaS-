// components/analytics/views-chart.tsx
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ViewsChartProps {
  data: Array<{
    date: string;
    views: number;
    watchTime: number;
  }>;
}

export function ViewsChart({ data }: ViewsChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    watchTimeHours: Math.round(item.watchTime / 60)
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          />
          <YAxis stroke="#9CA3AF" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem'
            }}
            formatter={(value, name) => {
              if (name === 'watchTimeHours') {
                return [`${value} heures`, 'Temps de visionnage'];
              }
              return [value.toLocaleString(), name === 'views' ? 'Vues' : 'Heures'];
            }}
          />
          <Legend />
          <Bar 
            dataKey="views" 
            name="Vues"
            fill="#8B5CF6" 
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="watchTimeHours" 
            name="Temps de visionnage (h)"
            fill="#F59E0B" 
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}