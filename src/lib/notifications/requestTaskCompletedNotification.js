import { firebase } from "@/firebase/firebase";

export async function requestTaskCompletedNotification({
  boardId,
  listId,
  tareaId,
  itemType = "tarea",
  subtaskId = null,
}) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/notifications/task-completed", {
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

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.error("Task notification failed:", response.status, body);
    }
  } catch (error) {
    console.error("Task notification error:", error);
  }
}
