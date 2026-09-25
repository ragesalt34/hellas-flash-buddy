/* Hellas Study brand artwork (public/brand/), cut from the supplied logo onto a
   transparent background:
   - hellas-study-logo      branch · seal · wordmark · branch, with the gold swash
   - hellas-study-wordmark  seal + wordmark, for navs
   - hellas-study-seal      the wax seal alone, for small squares and the favicon
   hellas-study-logo@master.png is the full-resolution cut-out for use elsewhere. */

const src = (name: string) => `${import.meta.env.BASE_URL}brand/${name}.webp`;

/** The wax seal on its own. Decorative next to a visible name, so no alt text. */
export function LogoMark({ className = '' }: { className?: string }) {
  return <img className={`logo-mark ${className}`} src={src('hellas-study-seal')} alt="" draggable={false} />;
}

/** Brand lockup. `compact`: seal + wordmark, for navs. `wide`: the full crest. */
export function Logo({ variant = 'compact', className = '' }: { variant?: 'compact' | 'wide'; className?: string }) {
  const wide = variant === 'wide';
  return (
    <img
      className={`logo ${wide ? 'logo-wide' : 'logo-compact'} ${className}`}
      src={src(wide ? 'hellas-study-logo' : 'hellas-study-wordmark')}
      alt="Hellas Study"
      draggable={false}
    />
  );
}
