/** 预生成的 MMDD 查表键（12 × 31），避免每次查节日/调休都拼字符串 */
const MMDD: string[][] = Array.from({ length: 13 }, () => Array.from({ length: 32 }, () => ""));

for (let m = 1; m <= 12; m++) {
  for (let d = 1; d <= 31; d++) {
    (MMDD[m] as string[])[d] = (m < 10 ? "0" + m : String(m)) + (d < 10 ? "0" + d : String(d));
  }
}

/** 取四位 MMDD 字符串，例如 mmddOf(1, 1) → "0101" */
const mmddOf = function (m: number, d: number): string {
  return (MMDD[m] as string[])[d] as string;
};

export { mmddOf };
