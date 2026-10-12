// 6 decimal places is about 10 cm, more than enough for a house
export function roundCoordinate(value: number) {
  return Math.round(value * 1e6) / 1e6;
}
