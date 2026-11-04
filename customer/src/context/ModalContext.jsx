import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  WarningCircle,
  CheckCircle,
  Info,
  X,
  Storefront,
  Trash,
  ArrowsClockwise
} from '@phosphor-icons/react';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState(null);

  /**
   * showModal({
   *   title: string,
   *   message: string,
   *   type: 'warning' | 'confirm' | 'info' | 'success' | 'danger',
   *   confirmText?: string,
   *   cancelText?: string,
   *   onConfirm?: () => void,
   *   onCancel?: () => void,
   * })
   */
  const showModal = useCallback((config) => {
    return new Promise((resolve) => {
      setModalState({
        ...config,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    if (modalState?.onConfirm) modalState.onConfirm();
    if (modalState?.resolve) modalState.resolve(true);
    setModalState(null);
  };

  const handleCancel = () => {
    if (modalState?.onCancel) modalState.onCancel();
    if (modalState?.resolve) modalState.resolve(false);
    setModalState(null);
  };

  const isConfirmType = modalState?.type === 'confirm' || modalState?.type === 'danger' || !!modalState?.onConfirm;

  return (
    <ModalContext.Provider value={{ showModal }}>
      {children}

      {/* Modern Pop-up Dialog */}
      {modalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm sm:max-w-md bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 transition-theme scale-100"
            role="dialog"
            aria-modal="true"
          >
            {/* Header / Icon */}
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  modalState.type === 'danger'
                    ? 'bg-rose-500/15 text-rose-500'
                    : modalState.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : modalState.type === 'info'
                    ? 'bg-blue-500/15 text-blue-500'
                    : 'bg-[#FF6B00]/15 text-[#FF6B00]'
                }`}
              >
                {modalState.type === 'danger' ? (
                  <Trash size={22} weight="bold" />
                ) : modalState.type === 'success' ? (
                  <CheckCircle size={22} weight="fill" />
                ) : modalState.type === 'info' ? (
                  <Info size={22} weight="bold" />
                ) : (
                  <Storefront size={22} weight="bold" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="font-black text-base sm:text-lg text-[var(--text-main)] leading-tight">
                  {modalState.title || 'Notice'}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  {modalState.message}
                </p>
              </div>

              <button
                onClick={handleCancel}
                className="p-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-page)] transition"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-light)]/60">
              {isConfirmType && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] hover:bg-[var(--bg-page)] text-xs font-bold text-[var(--text-main)] transition"
                >
                  {modalState.cancelText || 'Cancel'}
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition ${
                  modalState.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : 'bg-[#FF6B00] hover:bg-[#E05E00] shadow-[#FF6B00]/25'
                }`}
              >
                {modalState.confirmText || 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);
