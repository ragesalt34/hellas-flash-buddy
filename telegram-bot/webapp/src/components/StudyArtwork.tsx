/** Each generated drawing has a reserved content slot; never a floating backdrop. */
export function StudyArtwork({ kind, className = '' }: { kind: 'architecture' | 'notebook'; className?: string }) {
  return (
    <img
      className={`hs-deco study-artwork ${className}`}
      src={`${import.meta.env.BASE_URL}assets/study/${kind}.webp`}
      width={768}
      height={512}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      loading="lazy"
    />
  );
}
