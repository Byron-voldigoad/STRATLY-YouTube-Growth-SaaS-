// components/analytics/subscribers-chart.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SubscribersChartProps {
  data: Array<{
    date: string;
    subscribers: number;
    newSubscribers?: number;
  }>;
}

export function SubscribersChart({ data }: SubscribersChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
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
            labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            formatter={(value) => [value.toLocaleString(), 'Abonnés']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="subscribers"
            name="Abonnés totaux"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          {data[0]?.newSubscribers !== undefined && (
            <Line
              type="monotone"
              dataKey="newSubscribers"
              name="Nouveaux abonnés"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}