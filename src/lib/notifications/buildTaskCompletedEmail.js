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

export function buildTaskCompletedEmail({
  boardTitle,
  listTitle,
  itemType,
  itemTitle,
  assigneeLabel,
  completedBy,
  completedAt,
  boardUrl,
}) {
  const isSubtask = itemType === "subtask";
  const subject = isSubtask
    ? `[Ki Trello] Subtarea finalizada: ${itemTitle}`
    : `[Ki Trello] Tarea finalizada: ${itemTitle}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;padding:0;background:#1d2125;font-family:Arial,sans-serif;color:#e8eaf0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1d2125;padding:32px 16px;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width:560px;background:#303234;border:1px solid #2d3147;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#7c6dd8;color:#ffffff;font-size:18px;font-weight:600;">
                Ki Trello · ${isSubtask ? "Subtarea finalizada" : "Tarea finalizada"}
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#b6c2cf;">
                  Se ha marcado como <strong style="color:#FF7900;">finalizada</strong> la siguiente ${isSubtask ? "subtarea" : "tarea"}:
                </p>
                <p style="margin:0 0 20px;font-size:20px;font-weight:600;color:#ffffff;">${itemTitle || "Sin título"}</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#b6c2cf;">
                  <tr><td style="padding:6px 0;"><strong>Board:</strong> ${boardTitle || "—"}</td></tr>
                  <tr><td style="padding:6px 0;"><strong>Lista:</strong> ${listTitle || "—"}</td></tr>
                  <tr><td style="padding:6px 0;"><strong>Responsable:</strong> ${assigneeLabel || "Sin asignar"}</td></tr>
                  <tr><td style="padding:6px 0;"><strong>Finalizada por:</strong> ${completedBy || "—"}</td></tr>
                  <tr><td style="padding:6px 0;"><strong>Fecha:</strong> ${formatDate(completedAt)}</td></tr>
                </table>
                ${
                  boardUrl
                    ? `<p style="margin:28px 0 0;"><a href="${boardUrl}" style="display:inline-block;padding:12px 20px;background:#FF7900;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Ver board</a></p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #2d3147;font-size:12px;color:#9aa0b8;">
                Notificación automática de Ki Trello. No respondas a este correo.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    isSubtask ? "Subtarea finalizada" : "Tarea finalizada",
    itemTitle,
    `Board: ${boardTitle}`,
    `Lista: ${listTitle}`,
    `Responsable: ${assigneeLabel || "Sin asignar"}`,
    `Finalizada por: ${completedBy || "—"}`,
    `Fecha: ${formatDate(completedAt)}`,
    boardUrl ? `Ver board: ${boardUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
