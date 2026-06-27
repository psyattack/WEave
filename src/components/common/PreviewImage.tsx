import { useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { Image as ImageIcon } from "lucide-react";

import { inTauri } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface Props {
  src?: string;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
  fit?: "cover" | "contain";
}

function isRemote(src: string): boolean {
  return /^(https?:|data:|blob:|asset:|tauri:)/i.test(src);
}

function toDisplaySrc(src?: string): string | undefined {
  if (!src) return undefined;
  if (isRemote(src)) return src;
  // Local absolute filesystem path -> convert via Tauri's asset protocol.
  if (inTauri) {
    try {
      return convertFileSrc(src);
    } catch {
      return src;
    }
  }
  return src;
}

export default function PreviewImage({
  src,
  alt,
  className,
  fallback,
  fit = "cover",
}: Props) {
  const [prevSrc, setPrevSrc] = useState(src);
  const [resolved, setResolved] = useState<string | undefined>(
    toDisplaySrc(src),
  );
  const [failed, setFailed] = useState(false);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setFailed(false);
    setResolved(toDisplaySrc(src));
  }

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-surface-sunken text-subtle",
          className,
        )}
      >
        {fallback ?? <ImageIcon className="size-6" />}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt ?? ""}
      draggable={false}
      onError={() => {
        setFailed(true);
      }}
      className={cn(
        "size-full animate-fade-in",
        fit === "cover" ? "object-cover" : "object-contain",
        className,
      )}
    />
  );
}
