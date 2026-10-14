const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<]+/gi;
const TRAILING_PUNCTUATION = /[),.!?;:'"\]}।]+$/u;

const toSafeHttpUrl = (value) => {
  const candidate = value.toLowerCase().startsWith("www.")
    ? `https://${value}`
    : value;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
};

export const linkifyPostText = (text = "") => {
  const parts = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    const matchedText = match[0];
    const trailing = matchedText.match(TRAILING_PUNCTUATION)?.[0] || "";
    const displayText = trailing
      ? matchedText.slice(0, -trailing.length)
      : matchedText;
    const href = toSafeHttpUrl(displayText);

    if (start > cursor) {
      parts.push({ type: "text", text: text.slice(cursor, start) });
    }

    if (href && displayText) {
      parts.push({ type: "link", text: displayText, href });
      if (trailing) parts.push({ type: "text", text: trailing });
    } else {
      parts.push({ type: "text", text: matchedText });
    }

    cursor = start + matchedText.length;
  }

  if (cursor < text.length) {
    parts.push({ type: "text", text: text.slice(cursor) });
  }

  return parts.length ? parts : [{ type: "text", text }];
};
