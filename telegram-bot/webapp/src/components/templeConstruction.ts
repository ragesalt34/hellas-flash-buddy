/** Mirrors the existing 85% topic goal. Vocabulary contributes to the readiness
 * verdict separately and must not be used as the height of all four columns. */
export function templeConstruction(coverage: number[]) {
  const columns = coverage.map((value) => {
    const ratio = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    return ratio >= 0.85 ? 1 : ratio;
  });
  return { columns, roof: columns.length > 0 && columns.every((value) => value === 1) };
}
