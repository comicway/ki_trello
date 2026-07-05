const FINALIZADO = "finalizado";

const isFinalizadoTitle = (title) =>
  title?.trim().toLowerCase() === FINALIZADO;

const findNewlyCompletedSubtasks = (before, after) => {
  const beforeMap = new Map((before?.subtasks || []).map((s) => [s.id, s]));
  return (after?.subtasks || []).filter((s) => s.done && !beforeMap.get(s.id)?.done);
};

const wasTareaJustCompleted = (before, after) => !before?.done && !!after?.done;

const buildEvents = (before, after, listIsFinalizado) => {
  const events = [];

  const notifyTarea =
    wasTareaJustCompleted(before, after) ||
    (!before && (!!after?.done || listIsFinalizado));

  if (notifyTarea) {
    events.push({
      itemType: "tarea",
      itemTitle: after?.title || "Sin título",
      assigneeEmail: after?.assigneeEmail || null,
      completedBy: after?.doneBy || null,
      completedAt: after?.doneAt || new Date().toISOString(),
    });
  }

  findNewlyCompletedSubtasks(before, after).forEach((sub) => {
    events.push({
      itemType: "subtask",
      itemTitle: sub.title || "Subtarea sin título",
      assigneeEmail: sub.assigneeEmail || null,
      completedBy: sub.doneBy || after?.doneBy || null,
      completedAt: sub.doneAt || after?.doneAt || new Date().toISOString(),
      subtaskId: sub.id,
    });
  });

  return events;
};

module.exports = {
  isFinalizadoTitle,
  buildEvents,
};
