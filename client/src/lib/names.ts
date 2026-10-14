// "Rahim Uddin" -> "Rahim", for buttons like "Book Rahim"
export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}
