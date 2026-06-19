import { useEffect } from "react";
import { usePaginationCtx } from "@/stores/hotkeys/pagination";

/**
 * Mount in a view to publish its current pagination state to the global
 * hotkey handler. When the view unmounts the context is cleared.
 */
export function usePaginationContext(opts: {
  view: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const publish = usePaginationCtx((s) => s.publish);
  const clear = usePaginationCtx((s) => s.clear);

  useEffect(() => {
    publish({
      view: opts.view,
      page: opts.page,
      totalPages: opts.totalPages,
      onChange: opts.onPageChange,
    });

    return () => clear(opts.view);
  }, [
    publish,
    clear,
    opts.view,
    opts.page,
    opts.totalPages,
    opts.onPageChange,
  ]);
}
