const FRAGMENT_MAX = 50;

const normalize = (value = "") => value.trim().toLowerCase();

const memberCandidates = (member) => {
  const email = member.email || "";
  const localPart = email.includes("@") ? email.split("@")[0] : "";
  return [...new Set([member.displayName, email, localPart].filter(Boolean))];
};

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
  return truncateFragment(`${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`);
};

const extractMentionTargetsFromText = (text = "", members = []) => {
  if (!text || !members.length) return [];

  const targets = [];
  const seen = new Set();
  let index = 0;

  while (index < text.length) {
    if (text[index] !== "@") {
      index += 1;
      continue;
    }

    const slice = text.slice(index + 1);
    let best = null;

    for (const member of members) {
      if (!member.email) continue;

      for (const candidate of memberCandidates(member)) {
        const candidateNorm = normalize(candidate);
        const sliceNorm = slice.toLowerCase();
        if (!sliceNorm.startsWith(candidateNorm)) continue;

        const nextChar = slice[candidate.length];
        if (nextChar && !/[\s,.!?;:]/.test(nextChar)) continue;

        if (!best || candidate.length > best.label.length) {
          best = { member, label: candidate, length: candidate.length };
        }
      }
    }

    if (!best) {
      index += 1;
      continue;
    }

    const email = best.member.email;
    if (!seen.has(email)) {
      seen.add(email);
      targets.push({
        email,
        uid: best.member.uid || null,
        mentionLabel: best.label,
        messageFragment: buildMentionFragment(text, best.label),
      });
    }

    index += 1 + best.length;
  }

  return targets;
};

const extractMentionTargetsFromComment = (comment = {}, members = []) => {
  const fromField = (comment.mentionedEmails || [])
    .filter(Boolean)
    .map((email) => {
      const member = members.find((m) => normalize(m.email) === normalize(email));
      const label = member?.displayName || email;
      return {
        email,
        uid: member?.uid || null,
        mentionLabel: label,
        messageFragment: buildMentionFragment(comment.text, label) || truncateFragment(comment.text),
      };
    });

  if (fromField.length > 0) return fromField;
  return extractMentionTargetsFromText(comment.text, members);
};

const extractNewMentionTargets = (beforeText = "", afterText = "", members = []) => {
  const beforeEmails = new Set(
    extractMentionTargetsFromText(beforeText, members).map((t) => normalize(t.email))
  );

  return extractMentionTargetsFromText(afterText, members).filter(
    (target) => !beforeEmails.has(normalize(target.email))
  );
};

module.exports = {
  extractMentionTargetsFromComment,
  extractMentionTargetsFromText,
  extractNewMentionTargets,
};
