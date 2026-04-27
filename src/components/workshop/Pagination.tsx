import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  const { t } = useTranslation();
  const safeTotal = Math.max(1, totalPages || 1);
  const hasPrev = page > 1;
  const hasNext = page < safeTotal;

  return (
    <div className="flex items-center justify-center gap-2 border-t border-border bg-surface/60 px-4 py-3">
      <button className="btn-icon" disabled={!hasPrev} onClick={() => onChange(1)}>
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button
        className="btn-icon"
        disabled={!hasPrev}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="px-2 text-xs text-muted">
        {t("labels.page")} <span className="text-foreground">{page}</span>{" "}
        {t("labels.of", { total: safeTotal })}
      </div>
      <button
        className="btn-icon"
        disabled={!hasNext}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <button
        className="btn-icon"
        disabled={!hasNext}
        onClick={() => onChange(safeTotal)}
      >
        <ChevronsRight className="h-4 w-4" />
      </button>
    </div>
  );
}
