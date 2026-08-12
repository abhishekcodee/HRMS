import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  width = '400px'
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        className="modal-content"
        style={{
          width,
          maxWidth: '100vw',
          height: '100vh',
          maxHeight: '100vh',
          borderRadius: 0,
          animation: 'slideLeft 0.25s ease'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
