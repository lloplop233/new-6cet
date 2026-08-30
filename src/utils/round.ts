/**
 * 四舍五入到指定小数位。
 * 原本用的是 lodash-es 的 round，为了少一个依赖自己实现。
 */
export function round(n: number, precision = 0): number {
  const factor = 10 ** precision
  return Math.round(n * factor) / factor
}
