"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface RealtimeChartProps {
  title: string;
  data: any[];
  type: "line" | "area" | "bar" | "pie";
  dataKey: string;
  height?: number;
  colors?: string[];
}

const BRAND_COLORS = ["#d4af37", "#ffd700", "#ffed4e", "#c4a030", "#a48d29"];

export function RealtimeChart({
  title,
  data,
  type,
  dataKey,
  height = 300,
  colors = BRAND_COLORS,
}: RealtimeChartProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-zinc-900/30 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {type === "line" && (
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #d4af37",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={colors[0]}
                dot={{ fill: colors[0] }}
              />
            </LineChart>
          )}

          {type === "area" && (
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #d4af37",
                }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                fill={colors[0]}
                stroke={colors[0]}
                fillOpacity={0.3}
              />
            </AreaChart>
          )}

          {type === "bar" && (
            <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #d4af37",
                }}
              />
              <Bar dataKey={dataKey} fill={colors[0]} radius={[8, 8, 0, 0]} />
            </BarChart>
          )}

          {type === "pie" && (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey={dataKey}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #d4af37",
                }}
              />
            </PieChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RealtimeAnalytics({
  dailyRevenue,
  revenueTrend,
  paymentMethods,
}: {
  dailyRevenue: { name: string; revenue: number }[];
  revenueTrend: { name: string; total: number; store: number }[];
  paymentMethods: { name: string; value: number }[];
}) {
  return (
    <div className="space-y-6">
      <RealtimeChart
        title="Revenu quotidien"
        data={dailyRevenue}
        type="area"
        dataKey="revenue"
        colors={["#d4af37"]}
      />

      <RealtimeChart
        title="Tendance des revenus (Barber vs Store)"
        data={revenueTrend}
        type="line"
        dataKey="total"
        colors={["#d4af37", "#ffd700"]}
      />

      <RealtimeChart
        title="Mode de paiement"
        data={paymentMethods}
        type="pie"
        dataKey="value"
        colors={["#d4af37", "#ffd700", "#ffed4e", "#c4a030", "#a48d29"]}
      />
    </div>
  );
}
