import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 9999
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: 'var(--bg-surface)',
              border: `1px solid var(--${toast.type === 'error' ? 'error' : toast.type === 'success' ? 'success' : 'info'}-border)`,
              color: 'var(--text-primary)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={18} color="var(--success-text)" />
            ) : (
              <AlertCircle size={18} color="var(--error-text)" />
            )}
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '6px' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
