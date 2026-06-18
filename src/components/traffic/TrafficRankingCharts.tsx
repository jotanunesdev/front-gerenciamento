import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrafficDashboardPayload, TrafficEndpointMetric } from "@/lib/api";
import { formatDurationMs } from "@/lib/format";
import { TrafficChartCard } from "./TrafficChartCard";

interface TrafficRankingChartsProps {
  topEndpoints: TrafficEndpointMetric[];
  slowestEndpoints: TrafficEndpointMetric[];
  topErrorEndpoints: TrafficEndpointMetric[];
  topUsers: TrafficDashboardPayload["topUsers"];
}

const tooltipStyle = {
  background: "oklch(0.2 0.013 285)",
  border: "1px solid oklch(0.28 0.013 285)",
  borderRadius: "0.5rem",
  color: "oklch(0.96 0.004 285)",
  fontSize: "12px",
};

const endpointLabel = (row: TrafficEndpointMetric) => `${row.httpMethod} ${row.endpoint}`;
const shortLabel = (value: string) => (value.length > 42 ? `${value.slice(0, 39)}…` : value);

export function TrafficRankingCharts({
  topEndpoints,
  slowestEndpoints,
  topErrorEndpoints,
  topUsers,
}: TrafficRankingChartsProps) {
  const accessed = topEndpoints.map((row) => ({ ...row, label: endpointLabel(row) }));
  const slowest = slowestEndpoints.map((row) => ({ ...row, label: endpointLabel(row) }));
  const errors = topErrorEndpoints.map((row) => ({ ...row, label: endpointLabel(row) }));

  return (
    <div className="grid gap-6 2xl:grid-cols-2">
      <HorizontalRanking
        title="Top 10 endpoints mais acessados"
        description="Quantidade de chamadas por rota normalizada"
        data={accessed}
        dataKey="total"
        color="oklch(0.68 0.2 18)"
        valueFormatter={(value) => Number(value).toLocaleString("pt-BR")}
      />
      <HorizontalRanking
        title="Top 10 endpoints mais lentos"
        description="Tempo médio de resposta por rota"
        data={slowest}
        dataKey="averageDurationMs"
        color="oklch(0.78 0.15 75)"
        valueFormatter={(value) => formatDurationMs(Number(value))}
      />
      <HorizontalRanking
        title="Erros por endpoint"
        description="Rotas com maior quantidade de respostas HTTP 4xx e 5xx"
        data={errors}
        dataKey="errors"
        color="oklch(0.62 0.22 22)"
        valueFormatter={(value) => Number(value).toLocaleString("pt-BR")}
      />
      <TrafficChartCard
        title="Usuários que mais chamam a API"
        description="Top 10 usuários autenticados por volume de requisições"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topUsers} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.28 0.013 285)"
                horizontal={false}
              />
              <XAxis type="number" stroke="oklch(0.68 0.012 285)" fontSize={11} />
              <YAxis
                type="category"
                dataKey="userName"
                width={120}
                tickFormatter={shortLabel}
                stroke="oklch(0.68 0.012 285)"
                fontSize={11}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => Number(value).toLocaleString("pt-BR")}
              />
              <Bar
                dataKey="total"
                name="Requisições"
                fill="oklch(0.65 0.18 265)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TrafficChartCard>
    </div>
  );
}

interface HorizontalRankingProps {
  title: string;
  description: string;
  data: Array<TrafficEndpointMetric & { label: string }>;
  dataKey: "total" | "errors" | "averageDurationMs";
  color: string;
  valueFormatter: (value: unknown) => string;
}

function HorizontalRanking({
  title,
  description,
  data,
  dataKey,
  color,
  valueFormatter,
}: HorizontalRankingProps) {
  return (
    <TrafficChartCard title={title} description={description}>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.28 0.013 285)"
              horizontal={false}
            />
            <XAxis type="number" stroke="oklch(0.68 0.012 285)" fontSize={11} />
            <YAxis
              type="category"
              dataKey="label"
              width={190}
              tickFormatter={shortLabel}
              stroke="oklch(0.68 0.012 285)"
              fontSize={10}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={valueFormatter} />
            <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </TrafficChartCard>
  );
}
