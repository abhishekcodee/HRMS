import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableContainer: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({ children, className = '', style }) => (
  <div style={style} className={`table-container ${className}`}>{children}</div>
);

export const Table: React.FC<TableProps> = ({ children, className = '', ...props }) => (
  <table className={`table ${className}`} {...props}>
    {children}
  </table>
);

export const Thead: React.FC<{ children: React.ReactNode }> = ({ children }) => <thead>{children}</thead>;

export const Tbody: React.FC<{ children: React.ReactNode }> = ({ children }) => <tbody>{children}</tbody>;

export const Tr: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string; style?: React.CSSProperties }> = ({ children, onClick, className = '', style }) => (
  <tr onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default', ...style }} className={className}>
    {children}
  </tr>
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className = '', ...props }) => (
  <th className={className} {...props}>
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className = '', ...props }) => (
  <td className={className} {...props}>
    {children}
  </td>
);
