import { auth } from "@/firebase/firebase";

export async function requestCommentMentionNotifications({
  boardId,
  listId,
  tareaId,
  commentId,
  subtaskId = null,
}) {
  const user = auth?.currentUser;
  if (!user) return;

  try {
    const token = await user.getIdToken();
    const response = await fetch(`${window.location.origin}/api/notifications/mention`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ boardId, listId, tareaId, commentId, subtaskId }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Comment mention notification failed:", response.status, body);
      return;
    }

    console.info("Comment mention notification:", body);
  } catch (error) {
    console.error("Comment mention notification error:", error);
  }
}
