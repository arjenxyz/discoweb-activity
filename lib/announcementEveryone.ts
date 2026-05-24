/** Metinde @everyone geçiyor mu? */
export function textMentionsEveryone(text: string): boolean {
  return /@everyone\b/i.test(text);
}

export function announcementMentionsEveryone(title: string, body: string): boolean {
  return textMentionsEveryone(title) || textMentionsEveryone(body);
}

/** Discord broadcast ile aynı: baştaki @everyone ping'i ayır */
export function splitEveryonePing(content: string): { pingContent?: string; body: string } {
  const trimmed = content.trim();
  if (trimmed.toLowerCase().startsWith('@everyone')) {
    const body = trimmed.replace(/^@everyone\s*/i, '').trim();
    return { pingContent: '@everyone', body: body || trimmed };
  }
  return { body: trimmed };
}
