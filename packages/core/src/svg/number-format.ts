/** Rounds to `precision` decimals and prints the shortest SVG-valid form (".5", "-.5", "0"). */
export function formatNumber(value: number, precision = 2): string {
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  if (rounded === 0) {
    return '0';
  }
  return rounded.toString().replace(/^(-?)0\./, '$1.');
}
