import './logo.css';

const brand = (name: string) => `${import.meta.env.BASE_URL}brand/hellas-rocks-v1/${name}.webp`;

/** Decorative emblem when used beside a visible brand name. */
export function LogoMark({ className = '' }: { className?: string }) {
  return <img className={`logo-mark ${className}`} src={brand('mark')} alt="" width={256} height={268} draggable={false} />;
}

/** One approved identity for the shared header and landing footer. */
export function Logo({ variant = 'compact', className = '' }: { variant?: 'compact' | 'wide'; className?: string }) {
  return (
    <span className={`logo logo-rocks logo-${variant} ${className}`} role="img" aria-label="Hellas Study">
      <img className="logo-rocks-art" src={brand('horizontal')} alt="" width={1152} height={232} draggable={false} />
    </span>
  );
}
