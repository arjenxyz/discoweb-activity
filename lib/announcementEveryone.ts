/** Kayıt/görüntülemeden @everyone metnini temizle */
export function stripEveryoneFromText(text: string): string {
  return text
    .replace(/^@everyone\s*\n?/im, '')
    .replace(/\n@everyone\s*\n?/gi, '\n')
    .replace(/@everyone\b/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
