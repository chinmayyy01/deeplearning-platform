"use client";
import { useToastStore } from "@/store/toastStore";

export default function Toast() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(16px) scale(0.98); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(16px); }
        }
        .toast-enter { animation: toastIn 0.28s cubic-bezier(0.16, 1, 0.3, 1); }
        .toast-exit { animation: toastOut 0.2s ease-in forwards; }
      `}</style>
      {toasts.map((toast) => {
        const isError = toast.type === "error";
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 rounded-lg border border-line bg-elevated pl-3 pr-4 py-2.5 text-[12.5px] text-ink shadow-pop ${
              toast.isExiting ? "toast-exit" : "toast-enter"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                isError ? "bg-danger-soft" : "bg-success-soft"
              }`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isError ? "var(--color-danger)" : "var(--color-success)"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isError ? (
                  <>
                    <line x1="12" y1="8" x2="12" y2="13" />
                    <line x1="12" y1="16.5" x2="12.01" y2="16.5" />
                  </>
                ) : (
                  <polyline points="20 6 9 17 4 12" />
                )}
              </svg>
            </span>
            {toast.message}
          </div>
        );
      })}
    </div>
  );
}
