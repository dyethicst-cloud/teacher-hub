export function countText(text) {
  // Count Unicode code points; structural line/page breaks are not characters.
  const flat = text.replace(/[\r\n\f]/g, '');
  return {withSpaces: Array.from(flat).length, withoutSpaces: Array.from(flat.replace(/\s/gu, '')).length};
}
export function pageText(items) {
  return items.filter(item => typeof item.str === 'string').map(item => item.str + (item.hasEOL ? '\n' : '')).join('');
}
