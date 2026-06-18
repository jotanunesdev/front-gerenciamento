import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrafficDashboardPayload } from "@/lib/api";
import { formatDurationMs } from "@/lib/format";
import { TrafficChartCard } from "./TrafficChartCard";

interface TrafficTimeSeriesChartsProps {
  timeline: TrafficDashboardPayload["timeline"];
  requestsPerMinute: TrafficDashboardPayload["requestsPerMinute"];
  errors500ByHour: TrafficDashboardPayload["errors500ByHour"];
}

const tooltipStyle = {
  background: "oklch(0.2 0.013 285)",
  border: "1px solid oklch(0.28 0.013 285)",
  borderRadius: "0.5rem",
  color: "oklch(0.96 0.004 285)",
  fontSize: "12px",
};

const hourLabel = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
  });

const minuteLabel = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

export function TrafficTimeSeriesCharts({
  timeline,
  requestsPerMinute,
  errors500ByHour,
}: TrafficTimeSeriesChartsProps) {
  return (
    <div className="grid gap-6 2xl:grid-cols-2">
      <TrafficChartCard
        title="Volume de requisições por minuto"
        description="Últimas seis horas; evidencia picos instantâneos de acesso"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={requestsPerMinute}>
              <defs>
                <linearGradient id="minuteVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.68 0.2 18)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="oklch(0.68 0.2 18)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.28 0.013 285)"
                vertical={false}
              />
              <XAxis
                dataKey="timestampUtc"
                tickFormatter={minuteLabel}
                stroke="oklch(0.68 0.012 285)"
                fontSize={11}
                minTickGap={32}
              />
              <YAxis stroke="oklch(0.68 0.012 285)" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(value) => new Date(String(value)).toLocaleString("pt-BR")}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Requisições/min"
                stroke="oklch(0.68 0.2 18)"
                fill="url(#minuteVolume)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </TrafficChartCard>

      <TrafficChartCard
        title="Erros HTTP 500 por hora"
        description="Falhas internas agrupadas em intervalos de uma hora"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={errors500ByHour}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.28 0.013 285)"
                vertical={false}
              />
              <XAxis
                dataKey="timestampUtc"
                tickFormatter={hourLabel}
                stroke="oklch(0.68 0.012 285)"
                fontSize={11}
                minTickGap={28}
              />
              <YAxis stroke="oklch(0.68 0.012 285)" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(value) => new Date(String(value)).toLocaleString("pt-BR")}
              />
              <Bar
                dataKey="total"
                name="Erros 500"
                fill="oklch(0.62 0.22 22)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TrafficChartCard>

      <TrafficChartCard
        title="Tempo médio de resposta"
        description="Evolução da latência média por hora"
        className="2xl:col-span-2"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.28 0.013 285)"
                vertical={false}
              />
              <XAxis
                dataKey="timestampUtc"
                tickFormatter={hourLabel}
                stroke="oklch(0.68 0.012 285)"
                fontSize={11}
                minTickGap={30}
              />
              <YAxis
                tickFormatter={(value) => formatDurationMs(Number(value))}
                stroke="oklch(0.68 0.012 285)"
                fontSize={11}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(value) => new Date(String(value)).toLocaleString("pt-BR")}
                formatter={(value) => formatDurationMs(Number(value))}
              />
              <Line
                type="monotone"
                dataKey="averageDurationMs"
                name="Tempo médio"
                stroke="oklch(0.65 0.18 265)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </TrafficChartCard>
    </div>
  );
}
