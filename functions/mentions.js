const FRAGMENT_MAX = 50;

const normalize = (value = "") =>
  String(value).trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

const truncateFragment = (text = "", max = FRAGMENT_MAX) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
};

const buildMentionFragment = (text = "", mentionLabel = "") => {
  if (!text) return "";
  const needle = `@${mentionLabel}`;
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return truncateFragment(text);
  const start = Math.max(0, idx - 10);
  const end = Math.min(text.length, idx + needle.length + 30);
  const slice = text.slice(start, end).replace(/\s+/g, " ").trim();
  return truncateFragment(
    `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`,
  );
};

const extractMentionTargetsFromText = (text = "", members = []) => {
  if (!text || !members.length) return [];

  const targets = [];
  const seen = new Set();

  // Expresión regular que detecta únicamente correos electrónicos: @usuario@dominio.com
  const emailRegex = /@([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
  let match;

  while ((match = emailRegex.exec(text)) !== null) {
    const rawEmail = match[1];
    const normalizedEmail = normalize(rawEmail);

    if (!seen.has(normalizedEmail)) {
      const member = members.find(
        (m) => normalize(m.email) === normalizedEmail,
      );
      if (member) {
        seen.add(normalizedEmail);
        targets.push({
          email: member.email,
          uid: member.uid || null,
          mentionLabel: rawEmail,
          messageFragment: buildMentionFragment(text, rawEmail),
        });
      }
    }
  }

  return targets;
};

const extractMentionTargetsFromComment = (comment = {}, members = []) => {
  const text = comment.text || "";
  const storedEmails = [
    ...new Set((comment.mentionedEmails || []).filter(Boolean)),
  ];

  const fromField = storedEmails.map((email) => {
    const member = members.find((m) => normalize(m.email) === normalize(email));
    const label = member?.displayName || email;
    return {
      email,
      uid: member?.uid || null,
      mentionLabel: label,
      messageFragment:
        buildMentionFragment(text, label) || truncateFragment(text),
    };
  });

  const fromText = extractMentionTargetsFromText(text, members);
  const merged = new Map();

  [...fromField, ...fromText].forEach((target) => {
    if (!target?.email) return;
    merged.set(normalize(target.email), target);
  });

  return [...merged.values()];
};

const extractNewMentionTargets = (
  beforeText = "",
  afterText = "",
  members = [],
) => {
  const beforeEmails = new Set(
    extractMentionTargetsFromText(beforeText, members).map((t) =>
      normalize(t.email),
    ),
  );

  return extractMentionTargetsFromText(afterText, members).filter(
    (target) => !beforeEmails.has(normalize(target.email)),
  );
};

module.exports = {
  extractMentionTargetsFromComment,
  extractMentionTargetsFromText,
  extractNewMentionTargets,
};
