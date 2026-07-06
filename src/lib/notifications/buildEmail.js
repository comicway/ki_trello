const formatDate = (iso) => {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const EMAIL_THEME = {
  pageBg: "#f4f5f7",
  cardBg: "#ffffff",
  cardBorder: "#e2e8f0",
  headerBg: "#7c6dd8",
  headerText: "#ffffff",
  bodyText: "#44546f",
  headingText: "#172b4d",
  mutedText: "#6b778c",
  accent: "#e65100",
  accentSoft: "#fff4ec",
  quoteBg: "#f8f9fb",
  quoteBorder: "#7c6dd8",
  quoteText: "#374151",
  footerBorder: "#e2e8f0",
  footerText: "#6b778c",
  ctaBg: "#FF7900",
  ctaText: "#ffffff",
  ctaBorder: "#d96500",
};

const resolveMemberLabel = (members, email) => {
  if (!email) return "Sin asignar";
  const member = members?.find((m) => m.email === email);
  return member?.displayName || email;
};

const wrapEmail = ({ title, bodyHtml }) => `
<!DOCTYPE html>
<html lang="es">
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background:${EMAIL_THEME.pageBg};font-family:Arial,sans-serif;color:${EMAIL_THEME.bodyText};">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${EMAIL_THEME.pageBg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:560px;background:${EMAIL_THEME.cardBg};border:1px solid ${EMAIL_THEME.cardBorder};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:${EMAIL_THEME.headerBg};color:${EMAIL_THEME.headerText};font-size:18px;font-weight:600;">
                Ki Trello · ${title}
              </td>
            </tr>
            <tr>
              <td style="padding:28px;background:${EMAIL_THEME.cardBg};">${bodyHtml}</td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid ${EMAIL_THEME.footerBorder};font-size:12px;color:${EMAIL_THEME.footerText};background:${EMAIL_THEME.cardBg};">
                Notificación automática de Ki Trello. No respondas a este correo.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const boardButton = (boardUrl) =>
  boardUrl
    ? `<p style="margin:28px 0 0;"><a href="${boardUrl}" style="display:inline-block;padding:12px 20px;background:${EMAIL_THEME.ctaBg};color:${EMAIL_THEME.ctaText};border:1px solid ${EMAIL_THEME.ctaBorder};text-decoration:none;border-radius:8px;font-weight:600;">Ver board</a></p>`
    : "";

const introParagraph = (html) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:${EMAIL_THEME.bodyText};">${html}</p>`;

const itemHeading = (text) =>
  `<p style="margin:0 0 20px;font-size:20px;font-weight:600;color:${EMAIL_THEME.headingText};">${text || "Sin título"}</p>`;

const contextTable = (rows) =>
  `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:${EMAIL_THEME.bodyText};">${rows}</table>`;

const accentName = (name) =>
  `<strong style="color:${EMAIL_THEME.accent};">${name || "Un miembro"}</strong>`;

const quoteBlock = (text) =>
  `<blockquote style="margin:0 0 20px;padding:12px 16px;border-left:4px solid ${EMAIL_THEME.quoteBorder};background:${EMAIL_THEME.quoteBg};color:${EMAIL_THEME.quoteText};font-size:14px;line-height:1.5;">${text || "—"}</blockquote>`;

export function buildNotificationEmail(payload) {
  const {
    eventType,
    boardTitle,
    listTitle,
    itemTitle,
    itemType,
    assigneeEmail,
    completedBy,
    completedAt,
    actorName,
    messageFragment,
    mentionSource,
    fromListTitle,
    toListTitle,
    boardUrl,
    members = [],
  } = payload;

  const assigneeLabel = payload.assigneeLabel || resolveMemberLabel(members, assigneeEmail);
  const contextRows = [
    `<tr><td style="padding:6px 0;color:${EMAIL_THEME.bodyText};"><strong style="color:${EMAIL_THEME.headingText};">Board:</strong> ${boardTitle || "—"}</td></tr>`,
    `<tr><td style="padding:6px 0;color:${EMAIL_THEME.bodyText};"><strong style="color:${EMAIL_THEME.headingText};">Lista:</strong> ${listTitle || "—"}</td></tr>`,
    `<tr><td style="padding:6px 0;color:${EMAIL_THEME.bodyText};"><strong style="color:${EMAIL_THEME.headingText};">Tarea:</strong> ${itemTitle || "Sin título"}</td></tr>`,
  ].join("");

  if (eventType === "task_completed" || eventType === "subtask_completed") {
    const isSubtask = eventType === "subtask_completed" || itemType === "subtask";
    const title = isSubtask ? "Subtarea finalizada" : "Tarea finalizada";
    const subject = `[Ki Trello] ${title}: ${itemTitle}`;
    const bodyHtml = `
      ${introParagraph(`Se ha marcado como <strong style="color:${EMAIL_THEME.accent};">finalizada</strong> la siguiente ${isSubtask ? "subtarea" : "tarea"}:`)}
      ${itemHeading(itemTitle)}
      ${contextTable(`
        ${contextRows}
        <tr><td style="padding:6px 0;color:${EMAIL_THEME.bodyText};"><strong style="color:${EMAIL_THEME.headingText};">Responsable:</strong> ${assigneeLabel}</td></tr>
        <tr><td style="padding:6px 0;color:${EMAIL_THEME.bodyText};"><strong style="color:${EMAIL_THEME.headingText};">Finalizada por:</strong> ${completedBy || "—"}</td></tr>
        <tr><td style="padding:6px 0;color:${EMAIL_THEME.bodyText};"><strong style="color:${EMAIL_THEME.headingText};">Fecha:</strong> ${formatDate(completedAt)}</td></tr>
      `)}
      ${boardButton(boardUrl)}`;

    return {
      subject,
      html: wrapEmail({ title, bodyHtml }),
      text: [title, itemTitle, `Board: ${boardTitle}`, `Lista: ${listTitle}`, boardUrl].filter(Boolean).join("\n"),
    };
  }

  if (eventType === "salesforce_ready") {
    const subject = `[Ki Trello] Listo para Salesforce: ${itemTitle}`;
    const bodyHtml = `
      ${introParagraph(`${accentName(actorName)} marcó como listo para Salesforce:`)}
      ${itemHeading(itemTitle)}
      ${contextTable(contextRows)}
      ${boardButton(boardUrl)}`;

    return {
      subject,
      html: wrapEmail({ title: "Listo para Salesforce", bodyHtml }),
      text: [`Listo para Salesforce: ${itemTitle}`, `Board: ${boardTitle}`, boardUrl].filter(Boolean).join("\n"),
    };
  }

  if (eventType === "mention") {
    const sourceLabel = mentionSource === "description" ? "descripción" : "comentario";
    const subject = `[Ki Trello] Te mencionaron en una ${sourceLabel}`;
    const bodyHtml = `
      ${introParagraph(`${accentName(actorName)} te mencionó en la ${sourceLabel} de:`)}
      ${itemHeading(itemTitle)}
      ${quoteBlock(messageFragment)}
      ${contextTable(contextRows)}
      ${boardButton(boardUrl)}`;

    return {
      subject,
      html: wrapEmail({ title: "Nueva mención", bodyHtml }),
      text: [`Te mencionaron en ${sourceLabel}`, itemTitle, messageFragment, boardUrl].filter(Boolean).join("\n"),
    };
  }

  if (eventType === "status_changed") {
    const subject = `[Ki Trello] Cambio de estado: ${itemTitle}`;
    const bodyHtml = `
      ${introParagraph(`${accentName(actorName)} cambió el estado de la tarea:`)}
      ${itemHeading(itemTitle)}
      ${contextTable(`
        ${contextRows}
        <tr><td style="padding:6px 0;color:${EMAIL_THEME.bodyText};"><strong style="color:${EMAIL_THEME.headingText};">Estado anterior:</strong> ${fromListTitle || "—"}</td></tr>
        <tr><td style="padding:6px 0;color:${EMAIL_THEME.bodyText};"><strong style="color:${EMAIL_THEME.headingText};">Estado nuevo:</strong> ${toListTitle || "—"}</td></tr>
      `)}
      ${boardButton(boardUrl)}`;

    return {
      subject,
      html: wrapEmail({ title: "Cambio de estado", bodyHtml }),
      text: [`Cambio de estado: ${itemTitle}`, `${fromListTitle} → ${toListTitle}`, boardUrl].filter(Boolean).join("\n"),
    };
  }

  if (eventType === "assignee_changed") {
    const subject = `[Ki Trello] Te asignaron: ${itemTitle}`;
    const bodyHtml = `
      ${introParagraph(`${accentName(actorName)} te asignó como responsable de:`)}
      ${itemHeading(itemTitle)}
      ${contextTable(contextRows)}
      ${boardButton(boardUrl)}`;

    return {
      subject,
      html: wrapEmail({ title: "Nueva asignación", bodyHtml }),
      text: [`Te asignaron: ${itemTitle}`, `Board: ${boardTitle}`, boardUrl].filter(Boolean).join("\n"),
    };
  }

  throw new Error(`Unsupported notification event: ${eventType}`);
}

export { EMAIL_THEME };
