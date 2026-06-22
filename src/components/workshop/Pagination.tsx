import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { useState, useEffect } from "react";

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
  const [inputValue, setInputValue] = useState(String(page));

  useEffect(() => {
    setInputValue(String(page));
  }, [page]);

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
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex h-10 items-center rounded-full bg-background/50 backdrop-blur-2xl border border-white/10 px-3 shadow-2xl transition-all">
      <div className="flex items-center gap-1.5">
        <button 
          className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none" 
          disabled={!hasPrev} 
          onClick={() => onChange(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          disabled={!hasPrev}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        
        <div className="flex items-center justify-center gap-1 min-w-[5rem] px-6 text-[11px] font-medium text-foreground/80">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="w-6 bg-transparent text-center text-foreground focus:outline-none font-bold placeholder-white/30 selection:bg-primary/50"
          />
          <span className="opacity-50">/ {safeTotal}</span>
        </div>

        <button
          className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          disabled={!hasNext}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-white/10 text-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
          disabled={!hasNext}
          onClick={() => onChange(safeTotal)}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>

      {infoText && (
        <>
          <div className="w-[1px] h-4 bg-white/10 mx-2" />
          <div className="text-[11px] font-medium text-white/70 px-2 whitespace-nowrap">
            {infoText}
          </div>
        </>
      )}
    </div>
  );
}
