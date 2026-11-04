import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className="pagination-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.825rem',
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--bg-surface)'
      }}
    >
      <div>
        Showing <strong style={{ color: 'var(--text-primary)' }}>{startItem}</strong> to{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{endItem}</strong> of{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> entries
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span style={{ padding: '0 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Page {currentPage} of {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages || totalPages === 0}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};
