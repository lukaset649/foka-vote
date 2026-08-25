const POLISH_CHAR_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

export function slugify(title: string): string {
  const transliterated = title
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (char) => POLISH_CHAR_MAP[char] ?? char);

  return transliterated.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
