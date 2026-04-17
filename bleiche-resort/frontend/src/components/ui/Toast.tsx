import { X, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useOfferStore } from '../../store/offerStore';

const iconMap = {
  success: { Icon: CheckCircle2, color: 'text-brand-400' },
  error: { Icon: XCircle, color: 'text-red-800' },
  warning: { Icon: AlertTriangle, color: 'text-brand-500' },
  info: { Icon: Info, color: 'text-brand-400' },
} as const;

export default function ToastContainer() {
  const toasts = useOfferStore(s => s.toasts);
  const removeToast = useOfferStore(s => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
      {toasts.map(toast => {
        const { Icon, color } = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className="bg-white border border-dark-200 shadow-lg p-4 flex items-start gap-3 animate-[slideIn_0.2s_ease-out] rounded-none"
          >
            <Icon size={20} className={`${color} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-500">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-dark-400 mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-dark-300 hover:text-dark-500 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
