import { describe, expect, it } from "vite-plus/test";
import createCalendar, { utils } from "../src/index.ts";

const calendar = createCalendar();

const DAY_MS = 86400000;
const START = Date.UTC(1900, 0, 31);
const END = Date.UTC(2100, 11, 31);

const ymd = (r: { cYear: number; cMonth: number; cDay: number }) =>
  `${r.cYear}-${String(r.cMonth).padStart(2, "0")}-${String(r.cDay).padStart(2, "0")}`;

describe("公历转农历", () => {
  it("1900-01-31 是农历数据起点", () => {
    const r = calendar.solarToLunar(1900, 1, 31);
    expect([r.lYear, r.lMonth, r.lDay, r.isLeap]).toEqual([1900, 1, 1, false]);
    expect([r.lMonthCn, r.lDayCn]).toEqual(["正月", "初一"]);
  });

  it("已知春节日期", () => {
    const springFestivals: Array<[number, number, number]> = [
      [1900, 1, 31],
      [1949, 1, 29],
      [1984, 2, 2],
      [2000, 2, 5],
      [2008, 2, 7],
      [2010, 2, 14],
      [2012, 1, 23],
      [2020, 1, 25],
      [2021, 2, 12],
      [2022, 2, 1],
      [2023, 1, 22],
      [2024, 2, 10],
      [2025, 1, 29],
      [2026, 2, 17],
      [2027, 2, 6],
      [2030, 2, 3],
      [2050, 1, 23],
      [2100, 2, 9],
    ];
    for (const [y, m, d] of springFestivals) {
      const r = calendar.solarToLunar(y, m, d);
      expect([r.lYear, r.lMonth, r.lDay], `${y}-${m}-${d}`).toEqual([y, 1, 1]);
    }
  });

  it("不传参返回今天", () => {
    const now = new Date();
    const r = calendar.solarToLunar();
    expect([r.cYear, r.cMonth, r.cDay]).toEqual([
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
    ]);
    expect(r.isToday).toBe(true);
  });

  it("全量往返：73,384 天无误差且农历日逐日递增", () => {
    let previous: ReturnType<typeof calendar.solarToLunar> | null = null;
    let checked = 0;
    for (let time = START; time <= END; time += DAY_MS) {
      const date = new Date(time);
      const r = calendar.solarToLunar(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
      );
      const back = calendar.lunarToSolar(r.lYear, r.lMonth, r.lDay, r.isLeap);
      expect(ymd(back)).toBe(ymd(r));
      if (
        previous &&
        previous.lYear === r.lYear &&
        previous.lMonth === r.lMonth &&
        previous.isLeap === r.isLeap
      ) {
        expect(r.lDay).toBe(previous.lDay + 1);
      }
      previous = r;
      checked++;
    }
    expect(checked).toBe(73384);
  }, 120_000);
});

describe("农历转公历", () => {
  it("2024 正月初一是 2024-02-10", () => {
    expect(ymd(calendar.lunarToSolar(2024, 1, 1))).toBe("2024-02-10");
  });

  it("闰月换算", () => {
    expect(ymd(calendar.lunarToSolar(2020, 4, 1, true))).toBe("2020-05-23");
    expect(calendar.solarToLunar(2020, 5, 23).isLeap).toBe(true);
  });
});

describe("非法入参必须抛错", () => {
  const outOfRange: Array<[string, () => unknown]> = [
    ["1900-01-30 早于数据起点", () => calendar.solarToLunar(1900, 1, 30)],
    ["1899-12-31", () => calendar.solarToLunar(1899, 12, 31)],
    ["2101-01-01", () => calendar.solarToLunar(2101, 1, 1)],
    ["月份 0", () => calendar.solarToLunar(2024, 0, 10)],
    ["月份 13", () => calendar.solarToLunar(2024, 13, 1)],
    ["2 月 30 日", () => calendar.solarToLunar(2024, 2, 30)],
    ["只传年份", () => calendar.solarToLunar(2024)],
    ["字符串参数", () => calendar.solarToLunar("2024" as unknown as number, 1, 1)],
    ["NaN", () => calendar.solarToLunar(NaN, 1, 1)],
    ["农历初零", () => calendar.lunarToSolar(2024, 1, 0)],
    ["农历三十一", () => calendar.lunarToSolar(2024, 1, 31)],
    ["不存在的闰月", () => calendar.lunarToSolar(2024, 4, 1, true)],
    ["换算结果超出 2100-12-31", () => calendar.lunarToSolar(2100, 12, 29)],
  ];

  it.each(outOfRange)("%s", (_name, fn) => {
    expect(fn).toThrow(RangeError);
  });

  it("错误信息里带出错的字段", () => {
    expect(() => calendar.solarToLunar(2024, 13, 1)).toThrow(/month/);
    expect(() => calendar.lunarToSolar(2024, 4, 1, true)).toThrow(/闰4月/);
  });
});

describe("节气", () => {
  it("2026 年节气日期", () => {
    const expected: Record<string, [number, number]> = {
      小寒: [1, 5],
      大寒: [1, 20],
      立春: [2, 4],
      清明: [4, 5],
      夏至: [6, 21],
      霜降: [10, 23],
      冬至: [12, 22],
    };
    for (const [name, [m, d]] of Object.entries(expected)) {
      expect(calendar.solarToLunar(2026, m, d).term).toBe(name);
    }
  });

  it("非节气日 term 为 null", () => {
    expect(calendar.solarToLunar(2026, 10, 31).term).toBeNull();
  });
});

describe("节日", () => {
  it("除夕按腊月最后一天计算，不写死三十", () => {
    // 腊月为小月的年份，过去会漏掉除夕
    for (const year of [2022, 2025, 2026, 2027, 2028, 2029, 2031, 2032]) {
      const spring = calendar.lunarToSolar(year, 1, 1);
      const eve = new Date(Date.UTC(spring.cYear, spring.cMonth - 1, spring.cDay) - DAY_MS);
      const r = calendar.solarToLunar(
        eve.getUTCFullYear(),
        eve.getUTCMonth() + 1,
        eve.getUTCDate(),
      );
      expect(r.nljr, `${year}`).toContain("除夕");
    }
  });

  it("浮动节日按规则计算", () => {
    const expected: Array<[number, number, number, string]> = [
      [2024, 5, 12, "母亲节"],
      [2024, 6, 16, "父亲节"],
      [2024, 11, 28, "感恩节"],
      [2026, 5, 10, "母亲节"],
      [2026, 6, 21, "父亲节"],
      [2026, 11, 26, "感恩节"],
      [2027, 5, 9, "母亲节"],
      [2027, 6, 20, "父亲节"],
      [2027, 11, 25, "感恩节"],
    ];
    for (const [y, m, d, name] of expected) {
      expect(calendar.solarToLunar(y, m, d).gljr, `${y}-${m}-${d}`).toContain(name);
    }
  });

  it("内置节日数据没有写错日期", () => {
    expect(calendar.solarToLunar(2026, 5, 8).gljr).toContain("世界微笑日");
    expect(calendar.solarToLunar(2026, 10, 1).gljr).not.toContain("世界微笑日");
    // 寒衣节是农历十月初一
    expect(calendar.solarToLunar(2026, 11, 9).nljr).toContain("寒衣节");
    expect(calendar.solarToLunar(2026, 10, 1).gljr[0]).toBe("国庆节");
  });

  it("闰月不过节", () => {
    // 1903 闰五月初五、1900 闰八月十五
    const leapMay = calendar.lunarToSolar(1903, 5, 5, true);
    const leapAug = calendar.lunarToSolar(1900, 8, 15, true);
    const normalMay = calendar.lunarToSolar(1903, 5, 5);
    const normalAug = calendar.lunarToSolar(1900, 8, 15);

    expect(leapMay.isLeap).toBe(true);
    expect(leapAug.isLeap).toBe(true);
    expect(calendar.solarToLunar(leapMay.cYear, leapMay.cMonth, leapMay.cDay).nljr).toEqual([]);
    expect(calendar.solarToLunar(leapAug.cYear, leapAug.cMonth, leapAug.cDay).nljr).toEqual([]);
    expect(calendar.solarToLunar(normalMay.cYear, normalMay.cMonth, normalMay.cDay).nljr).toContain(
      "端午节",
    );
    expect(calendar.solarToLunar(normalAug.cYear, normalAug.cMonth, normalAug.cDay).nljr).toContain(
      "中秋节",
    );
  });
});

describe("干支", () => {
  it("干支年以立春为界，与干支月口径一致", () => {
    const before = calendar.solarToLunar(2026, 2, 3);
    const after = calendar.solarToLunar(2026, 2, 4);
    expect([before.gzYear, before.gzMonth]).toEqual(["乙巳", "己丑"]);
    expect([after.gzYear, after.gzMonth]).toEqual(["丙午", "庚寅"]);
    expect(before.gzYearLunar).toBe("乙巳");
  });

  it("全量校验：年干推出的月干始终成立", () => {
    const GAN = "甲乙丙丁戊己庚辛壬癸";
    const ZHI = "子丑寅卯辰巳午未申酉戌亥";
    for (let y = 1901; y <= 2099; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of [1, 15, 28]) {
          const r = calendar.solarToLunar(y, m, d);
          const yearStem = GAN.indexOf(r.gzYear[0]);
          const monthStem = GAN.indexOf(r.gzMonth[0]);
          const monthBranch = ZHI.indexOf(r.gzMonth[1]);
          const step = (((monthBranch - 2) % 12) + 12) % 12;
          expect(monthStem, `${y}-${m}-${d} ${r.gzYear} ${r.gzMonth}`).toBe(
            (yearStem * 2 + 2 + step) % 10,
          );
        }
      }
    }
  }, 60_000);
});

describe("工具函数", () => {
  it("星座名称与边界", () => {
    expect(utils.toAstro(1, 19)).toBe("摩羯座");
    expect(utils.toAstro(1, 20)).toBe("水瓶座");
    expect(utils.toAstro(4, 19)).toBe("白羊座");
    expect(utils.toAstro(4, 20)).toBe("金牛座");
    expect(utils.toAstro(10, 23)).toBe("天秤座");
    expect(utils.toAstro(10, 24)).toBe("天蝎座");
    expect(utils.toAstro(12, 22)).toBe("摩羯座");
  });

  it("README 里写过的方法都存在", () => {
    expect(typeof utils.toChinaNum).toBe("function");
    expect(typeof utils.getTerm).toBe("function");
    expect(typeof utils.getSolarTerm).toBe("function");
    expect(utils.toChinaNum(3)).toBe("三");
    expect(utils.getSolarTerm(0)).toBe("小寒");
    expect(utils.getTerm(2026, 3)).toBe(4);
  });

  it("越界的工具函数抛错而不是返回脏值", () => {
    expect(() => utils.lYearDays(1899)).toThrow(RangeError);
    expect(() => utils.leapMonth(2101)).toThrow(RangeError);
    expect(() => utils.lMonthDays(2024, 13)).toThrow(RangeError);
    expect(() => utils.toChinaDay(31)).toThrow(RangeError);
    expect(() => utils.solarDays(2024, 13)).toThrow(RangeError);
    expect(() => utils.toChinaNum(11)).toThrow(RangeError);
  });

  it("星期两套口径都给出", () => {
    const r = calendar.solarToLunar(2026, 11, 1);
    expect([r.nWeek, r.dayOfWeek, r.ncWeek]).toEqual([7, 0, "星期日"]);
    expect(utils.solarFirstWeek(2026, 10)).toBe(4);
  });

  it("农历日中文", () => {
    const expected = ["初一", "初十", "十一", "二十", "廿一", "三十"];
    expect([1, 10, 11, 20, 21, 30].map((d) => utils.toChinaDay(d))).toEqual(expected);
  });
});
