import { auth } from "@/firebase/firebase";

const getApiUrl = () => {
  if (typeof window === "undefined") return "/api/notifications/task-completed";
  return `${window.location.origin}/api/notifications/task-completed`;
};

export async function requestTaskCompletedNotification({
  boardId,
  listId,
  tareaId,
  itemType = "tarea",
  subtaskId = null,
}) {
  const user = auth?.currentUser;
  if (!user) {
    console.warn("Task notification skipped: user not authenticated");
    return;
  }

  try {
    const token = await user.getIdToken(true);
    const response = await fetch(getApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        source: "client",
        boardId,
        listId,
        tareaId,
        itemType,
        subtaskId,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Task notification failed:", response.status, body);
      return;
    }

    console.info("Task notification sent:", body);
  } catch (error) {
    console.error("Task notification error:", error);
  }
}
