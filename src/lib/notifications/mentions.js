const MENTION_RE = /@([^\s@][^\s]*)/g;

export const extractMentions = (text = "") => {
  const mentions = [];
  const matches = text.matchAll(MENTION_RE);
  for (const match of matches) {
    if (match[1]) mentions.push(match[1].trim());
  }
  return [...new Set(mentions)];
};

export const resolveMentionEmail = (mentionName, members = []) => {
  const normalized = mentionName.toLowerCase();
  const match = members.find((member) => {
    const displayName = (member.displayName || "").toLowerCase();
    const email = (member.email || "").toLowerCase();
    return (
      displayName === normalized ||
      email === normalized ||
      email.startsWith(`${normalized}@`)
    );
  });
  return match?.email || null;
};

export const extractNewMentionTargets = (beforeText = "", afterText = "", members = []) => {
  const beforeSet = new Set(
    extractMentions(beforeText)
      .map((name) => resolveMentionEmail(name, members))
      .filter(Boolean)
  );

  const targets = [];
  for (const name of extractMentions(afterText)) {
    const email = resolveMentionEmail(name, members);
    if (!email || beforeSet.has(email)) continue;
    targets.push({
      email,
      mentionLabel: name,
      messageFragment: buildMentionFragment(afterText, name),
    });
  }

  return targets;
};

export const extractCommentMentionTargets = (text = "", members = []) =>
  extractMentions(text)
    .map((name) => {
      const email = resolveMentionEmail(name, members);
      if (!email) return null;
      return {
        email,
        mentionLabel: name,
        messageFragment: buildMentionFragment(text, name),
      };
    })
    .filter(Boolean);

const buildMentionFragment = (text, mentionName) => {
  const idx = text.toLowerCase().indexOf(`@${mentionName.toLowerCase()}`);
  if (idx === -1) return text.slice(0, 140);
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + mentionName.length + 80);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
};
