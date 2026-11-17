// "Nusrat Jahan" -> "Nusrat J.", so strangers never see a customer's full name
export function shortName(name: string) {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first;
}
