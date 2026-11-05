import { useState } from "react";
import { ImageOff } from "lucide-react";

import { cn, resolvePhotoUrl } from "@/lib/utils";

export function ReportPhoto({
  src,
  alt,
  className,
  aspect = "aspect-[4/3]",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  aspect?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = resolvePhotoUrl(src);

  if (!resolved || failed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400",
          aspect,
          className,
        )}
      >
        <ImageOff className="h-8 w-8" aria-hidden="true" />
        <span className="text-xs font-medium">Foto tidak tersedia</span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      onError={() => setFailed(true)}
      loading="lazy"
      className={cn("w-full rounded-xl border border-slate-200 object-cover", aspect, className)}
    />
  );
}
