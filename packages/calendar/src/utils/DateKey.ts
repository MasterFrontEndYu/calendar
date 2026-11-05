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

/** 公历每个月的最大天数，2 月按闰年放宽到 29 */
const SOLAR_MAX_DAY = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 公历 MMDD 是否对应真实存在的日期（例如 0231、0431 为 false） */
const isSolarMonthDay = function (m: number, d: number): boolean {
  return d >= 1 && d <= (SOLAR_MAX_DAY[m - 1] ?? 0);
};

/** 农历 MMDD：每个月最多 30 天 */
const isLunarMonthDay = function (m: number, d: number): boolean {
  return d >= 1 && d <= 30;
};

export { mmddOf, isSolarMonthDay, isLunarMonthDay };
