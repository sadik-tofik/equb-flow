// apps/web/src/lib/money.ts
/**
 * Safe monetary formatting for 6-decimal USDC base units.
 * Never uses floating point numbers for financial calculations.
 */

export function formatUsdcBaseUnits(baseUnits: bigint | string | number): string {
  const bigVal = typeof baseUnits === 'bigint' ? baseUnits : BigInt(String(baseUnits || '0'));
  const isNegative = bigVal < 0n;
  const absVal = isNegative ? -bigVal : bigVal;

  const whole = absVal / 1_000_000n;
  const frac = absVal % 1_000_000n;
  const fracStr = frac.toString().padStart(6, '0').slice(0, 2); // Show 2 decimal places

  const sign = isNegative ? '-' : '';
  return `${sign}${whole.toString()}.${fracStr} USDC`;
}

export function parseUsdcToUnits(displayStr: string): string {
  // e.g. "1.50" or "1.50 USDC" -> "1500000"
  const cleaned = displayStr.replace(/[^\d.-]/g, '').trim();
  if (!cleaned) return '0';

  const parts = cleaned.split('.');
  const wholePart = BigInt(parts[0] || '0');
  const fracPartStr = (parts[1] || '').padEnd(6, '0').slice(0, 6);
  const fracPart = BigInt(fracPartStr);

  const total = wholePart * 1_000_000n + fracPart;
  return total.toString();
}
