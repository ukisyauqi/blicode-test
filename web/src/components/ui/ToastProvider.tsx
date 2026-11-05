import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import {
  ToastContext,
  type ToastInput,
  type ToastItem,
  type ToastTone,
} from "@/components/ui/toast-context";
import { cn } from "@/lib/utils";

const toneStyles: Record<ToastTone, { container: string; icon: React.ReactNode }> = {
  success: {
    container: "border-emerald-200 bg-emerald-50",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />,
  },
  error: {
    container: "border-rose-200 bg-rose-50",
    icon: <AlertCircle className="h-5 w-5 text-rose-600" aria-hidden="true" />,
  },
  info: {
    container: "border-sky-200 bg-sky-50",
    icon: <Info className="h-5 w-5 text-sky-600" aria-hidden="true" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, number>());
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      counter.current += 1;
      const id = counter.current;
      const item: ToastItem = { ...input, id, tone: input.tone ?? "info" };
      setToasts((current) => [...current.slice(-3), item]);
      const duration = input.duration ?? 4500;
      if (duration > 0) {
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  const success = useCallback(
    (title: string, description?: string) => toast({ title, description, tone: "success" }),
    [toast],
  );
  const error = useCallback(
    (title: string, description?: string) => toast({ title, description, tone: "error" }),
    [toast],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) window.clearTimeout(timer);
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext value={{ toast, success, error, dismiss }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:bottom-0 sm:items-end sm:p-6"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((item) => {
          const tone = item.tone ?? "info";
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur",
                toneStyles[tone].container,
              )}
              role={tone === "error" ? "alert" : "status"}
            >
              <div className="mt-0.5 shrink-0">{toneStyles[tone].icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                {item.description && (
                  <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-white/60 hover:text-slate-900"
                aria-label="Tutup notifikasi"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
