export const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
};

export const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

export const stdev = (values: readonly number[]): number => {
  if (values.length < 2) return 0;
  const average = mean(values);
  const variance =
    values.reduce((total, value) => total + (value - average) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

export const geomean = (values: readonly number[]): number => {
  const positive = values.filter((value) => value > 0);
  if (positive.length === 0) return 0;
  return Math.exp(positive.reduce((total, value) => total + Math.log(value), 0) / positive.length);
};

export const fmt = (value: number, digits = 3): string => value.toFixed(digits);

export const pct = (value: number, base: number): string =>
  base === 0 ? "—" : `${((value / base - 1) * 100).toFixed(0)}%`;

export const ratio = (value: number, base: number): string =>
  base === 0 ? "—" : `${(value / base).toFixed(2)}×`;
