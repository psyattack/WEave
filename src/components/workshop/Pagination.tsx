import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/stores/app";

interface Props {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  infoText?: string;
}

export default function Pagination({ page, totalPages, onChange, infoText }: Props) {

  const safeTotal = Math.max(1, totalPages || 1);
  const hasPrev = page > 1;
  const hasNext = page < safeTotal;
  const [prevPage, setPrevPage] = useState(page);
  const [inputValue, setInputValue] = useState(String(page));
  
  const containerRef = useRef<HTMLDivElement>(null);
  const setPaginationWidth = useAppStore((s) => s.setPaginationWidth);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPaginationWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [setPaginationWidth]);

  if (page !== prevPage) {
    setPrevPage(page);
    setInputValue(String(page));
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num >= 1 && num <= safeTotal) {
      onChange(num);
    } else {
      setInputValue(String(page));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-3 left-1/2 z-30 flex h-10 -translate-x-1/2 items-center rounded-full border border-white/10 bg-background/50 px-3 shadow-2xl backdrop-blur-2xl transition-all"
    >
      <div className="flex items-center gap-1.5">
        <button 
          className="flex size-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30" 
          disabled={!hasPrev} 
          onClick={() => onChange(1)}
        >
          <ChevronsLeft className="size-4" />
        </button>
        <button
          className="flex size-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
          disabled={!hasPrev}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </button>
        
        <div className="flex min-w-20 items-center justify-center gap-1 px-6 text-[11px] font-medium text-foreground/80">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-6 bg-transparent text-center font-bold text-foreground placeholder-white/30 selection:bg-primary/50 focus:outline-none"
          />
          <span className="opacity-50">/ {safeTotal}</span>
        </div>

        <button
          className="flex size-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
          disabled={!hasNext}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          className="flex size-7 items-center justify-center rounded-full text-foreground transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
          disabled={!hasNext}
          onClick={() => onChange(safeTotal)}
        >
          <ChevronsRight className="size-4" />
        </button>
      </div>

      {infoText && (
        <>
          <div className="mx-2 h-4 w-px bg-white/10" />
          <div className="px-2 text-[11px] font-medium whitespace-nowrap text-white/70">
            {infoText}
          </div>
        </>
      )}
    </div>
  );
}
