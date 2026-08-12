import { Construction } from 'lucide-react';

interface Props {
  moduleName: string;
  description: string;
}

export function PlaceholderModule({ moduleName, description }: Props) {
  return (
    <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
      <Construction size={48} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        {moduleName} Module Boundary
      </h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
        {description}
      </p>
      <div style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'var(--border-accent)', borderRadius: '8px', fontSize: '0.85rem' }}>
        Architecture Boundary Prepared & Target Monolith Module Defined
      </div>
    </div>
  );
}
