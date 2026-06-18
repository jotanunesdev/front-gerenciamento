import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrafficDashboardPayload } from "@/lib/api";
import { TrafficChartCard } from "./TrafficChartCard";

interface TrafficDistributionChartsProps {
  statusCodes: TrafficDashboardPayload["statusCodes"];
  requestsByApi: TrafficDashboardPayload["requestsByApi"];
}

const STATUS_COLORS: Record<number, string> = {
  200: "oklch(0.7 0.16 155)",
  400: "oklch(0.78 0.15 75)",
  401: "oklch(0.72 0.15 55)",
  403: "oklch(0.68 0.17 40)",
  404: "oklch(0.65 0.18 265)",
  500: "oklch(0.62 0.22 22)",
};

const tooltipStyle = {
  background: "oklch(0.2 0.013 285)",
  border: "1px solid oklch(0.28 0.013 285)",
  borderRadius: "0.5rem",
  color: "oklch(0.96 0.004 285)",
  fontSize: "12px",
};

export function TrafficDistributionCharts({
  statusCodes,
  requestsByApi,
}: TrafficDistributionChartsProps) {
  const trackedStatuses = [200, 400, 401, 403, 404, 500].map((statusCode) => ({
    statusCode,
    name: `HTTP ${statusCode}`,
    total: statusCodes.find((item) => item.statusCode === statusCode)?.total ?? 0,
  }));

  return (
    <div className="grid gap-6 2xl:grid-cols-2">
      <TrafficChartCard
        title="Distribuição por status HTTP"
        description="Respostas 200, 400, 401, 403, 404 e 500"
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={trackedStatuses}
                dataKey="total"
                nameKey="name"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={2}
              >
                {trackedStatuses.map((item) => (
                  <Cell
                    key={item.statusCode}
                    fill={STATUS_COLORS[item.statusCode] ?? "oklch(0.68 0.012 285)"}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => Number(value).toLocaleString("pt-BR")}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {trackedStatuses.map((item) => (
            <div key={item.statusCode} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[item.statusCode] }}
              />
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-semibold">{item.total.toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </TrafficChartCard>

      <TrafficChartCard
        title="Requisições por API"
        description="Comparativo de volume entre APIs monitoradas"
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={requestsByApi} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.28 0.013 285)"
                horizontal={false}
              />
              <XAxis type="number" stroke="oklch(0.68 0.012 285)" fontSize={11} />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
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
                fill="oklch(0.7 0.13 200)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </TrafficChartCard>
    </div>
  );
}
