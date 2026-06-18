import type { TrafficEndpointMetric } from "@/lib/api";
import { formatDurationMs } from "@/lib/format";

interface TrafficEndpointTableProps {
  rows: TrafficEndpointMetric[];
  emptyMessage: string;
}

export function TrafficEndpointTable({ rows, emptyMessage }: TrafficEndpointTableProps) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            <th className="pb-3 font-medium">Endpoint</th>
            <th className="pb-3 text-right font-medium">Chamadas</th>
            <th className="pb-3 text-right font-medium">Erros</th>
            <th className="pb-3 text-right font-medium">Média</th>
            <th className="pb-3 text-right font-medium">Máximo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.httpMethod}-${row.endpoint}`}
              className="border-b border-border/50 last:border-0"
            >
              <td className="py-3 pr-4">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                    {row.httpMethod}
                  </span>
                  <span className="truncate font-mono text-xs">{row.endpoint}</span>
                </div>
              </td>
              <td className="py-3 text-right tabular-nums">{row.total.toLocaleString("pt-BR")}</td>
              <td className="py-3 text-right tabular-nums text-destructive">
                {row.errors.toLocaleString("pt-BR")}
              </td>
              <td className="py-3 text-right tabular-nums">
                {formatDurationMs(row.averageDurationMs)}
              </td>
              <td className="py-3 text-right tabular-nums text-warning">
                {formatDurationMs(row.maximumDurationMs)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
