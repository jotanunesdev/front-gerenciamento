import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePagerProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Label for the items being paginated, e.g. "workflows" or "execuções". */
  itemLabel?: string;
}

export function TablePager({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  itemLabel = "itens",
}: TablePagerProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 sm:flex-row">
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> de{" "}
        <span className="font-medium text-foreground">{total}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">
          Página <span className="font-medium text-foreground">{page}</span> de{" "}
          <span className="font-medium text-foreground">{pageCount}</span>
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Próxima
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
