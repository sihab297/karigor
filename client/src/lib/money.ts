// Bangladeshi grouping: 1,20,000
export function taka(amount: number) {
  return `৳${amount.toLocaleString('en-IN')}`;
}

export function takaRange(min: number, max: number) {
  return min === max ? taka(min) : `${taka(min)} – ${taka(max)}`;
}
