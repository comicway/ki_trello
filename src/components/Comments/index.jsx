import { useState, useEffect, useContext, useRef } from "react";
import moment from "moment";
import { db } from "../../firebase";
import { UserContext } from "../../providers/UserProvider";
import { extractMentionTargetsFromText } from "../../lib/notifications/mentions";
import { requestCommentMentionNotifications } from "../../lib/notifications/requestCommentMentionNotifications";
import MarkdownContent from "../MarkdownContent";
import MemberAvatar from "../MemberAvatar";
import {
  MessageIcon,
  EditIcon,
  DeleteIcon,
  CheckIcon,
  CloseIcon,
} from "../ui/icons";

// ─── URL helpers ──────────────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s]+/g;

const extractUrls = (text) =>
  [...(text?.matchAll(URL_RE) || [])].map((m) => m[0]);

// Renders text with clickable hyperlinks
function LinkedText({ text }) {
  if (!text) return null;
  const parts = text.split(URL_RE);
  const urls = extractUrls(text);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {urls[i] && (
            <a
              href={urls[i]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ki-purple underline hover:text-ki-pastel transition-colors break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {urls[i]}
            </a>
          )}
        </span>
      ))}
    </>
  );
}

// ─── LinkPreview ──────────────────────────────────────────────────────────────

function LinkPreview({ url, onEdit, onDelete }) {
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();
  const faviconSrc = `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;

  return (
    <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-ki-black border border-border-ki rounded text-sm group">
      <img
        src={faviconSrc}
        alt=""
        className="w-4 h-4 flex-shrink-0"
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 text-ki-purple underline hover:text-ki-pastel transition-colors truncate"
        onClick={(e) => e.stopPropagation()}
      >
        {hostname}
      </a>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(url);
            }}
            title="Editar URL"
            className="p-1 rounded text-light-gray hover:text-pearl-white hover:bg-[#2c333a] border-none bg-transparent cursor-pointer transition-colors"
          >
            <EditIcon className="h-3 w-3" />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(url);
            }}
            title="Eliminar URL"
            className="p-1 rounded text-light-gray hover:text-alert-danger hover:bg-[#2c333a] border-none bg-transparent cursor-pointer transition-colors"
          >
            <DeleteIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mention helpers ──────────────────────────────────────────────────────────

const getMentionQuery = (value, cursorPos) => {
  const slice = value.slice(0, cursorPos);
  const match = slice.match(/@(\w*)$/);
  return match ? match[1] : null;
};

const insertMention = (value, cursorPos, name) => {
  const before = value.slice(0, cursorPos).replace(/@\w*$/, `@${name} `);
  const after = value.slice(cursorPos);
  return { newValue: before + after, newCursor: before.length };
};

// ─── MentionTextarea ──────────────────────────────────────────────────────────

function MentionTextarea({ value, onChange, onSubmit, members, placeholder }) {
  const [mentionQuery, setMentionQuery] = useState(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef(null);

  const filtered =
    mentionQuery !== null
      ? (members || []).filter((m) =>
          (m.displayName || m.email)
            .toLowerCase()
            .includes(mentionQuery.toLowerCase()),
        )
      : [];

  const handleChange = (e) => {
    const { value: val, selectionStart } = e.target;
    onChange(val);
    setMentionQuery(getMentionQuery(val, selectionStart));
    setMenuIndex(0);
  };

  const handleKeyDown = (e) => {
    if (filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && mentionQuery !== null) {
        e.preventDefault();
        selectMention(filtered[menuIndex]);
        return;
      }
      if (e.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const selectMention = (member) => {
    // Al seleccionar el usuario, se inserta su correo en lugar del nombre
    // para cumplir con las reglas de validación estricta de formato email.
    const identifier = member.email || member.displayName;
    const el = textareaRef.current;
    const { newValue, newCursor } = insertMention(
      value,
      el.selectionStart,
      identifier,
    );
    onChange(newValue);
    setMentionQuery(null);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsExpanded(true)}
        onBlur={() => setIsExpanded(false)}
        placeholder={placeholder}
        rows={isExpanded ? 4 : 2}
        className="w-full bg-ki-black text-pearl-white border border-border-ki hover:border-ki-purple focus:border-ki-purple rounded px-3 py-2 text-sm resize-none outline-none transition-colors"
      />
      {filtered.length > 0 && (
        <ul className="absolute z-50 left-0 bottom-full mb-1 w-56 bg-[#22272b] border border-border-ki rounded shadow-lg overflow-hidden">
          {filtered.map((m, i) => (
            <li
              key={m.email}
              onMouseDown={(e) => {
                e.preventDefault();
                selectMention(m);
              }}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${
                i === menuIndex
                  ? "bg-ki-purple text-pearl-white"
                  : "text-pearl-white hover:bg-ki-black"
              }`}
            >
              <MemberAvatar
                member={m}
                size={20}
                borderClass="border-ki-black"
              />
              <span className="truncate">{m.displayName || m.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── CommentItem ─────────────────────────────────────────────────────────────

function CommentItem({ comment, currentUser, members, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  const member = members?.find((m) => m.email === comment.authorEmail);
  const photo = member?.photoURL || comment.authorPhoto || null;
  const name = member?.displayName || comment.authorName || comment.authorEmail;
  const date = comment.createdAt
    ? moment(comment.createdAt).format("DD MMM YYYY, HH:mm")
    : "";
  const edited = !!comment.updatedAt;
  const isOwner = currentUser?.email === comment.authorEmail;
  const urls = extractUrls(comment.text);

  const handleEdit = () => {
    setEditText(comment.text);
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditText(comment.text);
  };

  const handleSave = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === comment.text) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(comment.id, trimmed);
      setEditing(false);
    } catch (err) {
      console.error("Error editando comentario:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditUrl = (url) => {
    const newUrl = window.prompt("Editar URL:", url);
    if (newUrl && newUrl !== url) {
      const newText = comment.text.replace(url, newUrl.trim());
      onSave(comment.id, newText);
    }
  };

  const handleDeleteUrl = (url) => {
    const newText = comment.text
      .replace(url, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    onSave(comment.id, newText);
  };

  return (
    <div className="flex gap-3">
      <MemberAvatar
        member={{
          photoURL: photo,
          displayName: name,
          email: comment.authorEmail,
        }}
        size={28}
        borderClass="border-ki-black"
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        {/* Author + date */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-pearl-white text-sm font-medium truncate">
            {name}
          </span>
          <span className="text-light-gray text-xs flex-shrink-0">
            {date}
            {edited && <span className="ml-1 italic">(editado)</span>}
          </span>
        </div>

        {/* Body */}
        {editing ? (
          <div className="flex flex-col gap-1">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
                if (e.key === "Escape") handleCancel();
              }}
              rows={2}
              className="w-full bg-ki-black text-pearl-white border border-ki-purple rounded px-3 py-2 text-sm resize-none outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1 bg-ki-purple text-pearl-white rounded text-xs font-medium hover:bg-ki-pastel transition-colors disabled:opacity-40 cursor-pointer border-none"
              >
                <CheckIcon className="h-3 w-3" /> Guardar
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1 bg-transparent border border-border-ki text-light-gray rounded text-xs font-medium hover:text-alert-danger hover:border-alert-danger transition-colors cursor-pointer"
              >
                <CloseIcon className="h-3 w-3" /> Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="group">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-pearl-white text-sm bg-ki-black border border-border-ki rounded px-3 py-2 break-words m-0">
                <MarkdownContent>{comment.text}</MarkdownContent>
              </p>
              {isOwner && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1">
                  <button
                    type="button"
                    onClick={handleEdit}
                    title="Editar comentario"
                    className="p-1 rounded text-light-gray hover:text-pearl-white hover:bg-ki-black border-none bg-transparent cursor-pointer transition-colors"
                  >
                    <EditIcon className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    title="Eliminar comentario"
                    className="p-1 rounded text-light-gray hover:text-alert-danger hover:bg-ki-black border-none bg-transparent cursor-pointer transition-colors"
                  >
                    <DeleteIcon className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            {/* Link previews */}
            {urls.length > 0 && (
              <div className="flex flex-col gap-1 mt-1 pl-0">
                {urls.map((url) => (
                  <LinkPreview
                    key={url}
                    url={url}
                    onEdit={isOwner ? handleEditUrl : null}
                    onDelete={isOwner ? handleDeleteUrl : null}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export default function Comments({
  boardKey,
  listKey,
  tareaKey,
  subtaskId = null,
  members,
}) {
  const currentUser = useContext(UserContext);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!boardKey || !listKey || !tareaKey) return;
    db.onceGetComments(boardKey, listKey, tareaKey, subtaskId)
      .then(setComments)
      .catch(console.error);
  }, [boardKey, listKey, tareaKey, subtaskId]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !currentUser) return;
    const mentionTargets = extractMentionTargetsFromText(
      trimmed,
      members || [],
    );
    const comment = {
      text: trimmed,
      authorEmail: currentUser.email,
      authorName: currentUser.displayName || currentUser.email,
      authorPhoto: currentUser.photoURL || null,
      mentionedEmails: mentionTargets.map((target) => target.email),
    };
    setSubmitting(true);
    try {
      const saved = await db.doAddComment(
        boardKey,
        listKey,
        tareaKey,
        comment,
        subtaskId,
      );
      setComments((prev) => [...prev, saved]);
      setText("");

      if (mentionTargets.length > 0) {
        requestCommentMentionNotifications({
          boardId: boardKey,
          listId: listKey,
          tareaId: tareaKey,
          commentId: saved.id,
          subtaskId,
          mentionedEmails: mentionTargets.map((target) => target.email),
        });
      }
    } catch (err) {
      console.error("Error al guardar comentario:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSave = async (commentId, newText) => {
    await db.doEditComment(
      boardKey,
      listKey,
      tareaKey,
      commentId,
      newText,
      subtaskId,
    );
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, text: newText, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
  };

  const handleDelete = async (commentId) => {
    await db.doDeleteComment(boardKey, listKey, tareaKey, commentId, subtaskId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div className="mt-8">
      <h4 className="flex items-center gap-2 text-pearl-white font-semibold mb-4">
        <MessageIcon className="h-4 w-4" />
        <span>Comentarios</span>
      </h4>

      <div className="flex flex-col gap-3 mb-4">
        {comments.length === 0 ? (
          <p className="text-light-gray text-sm italic">Sin comentarios aún.</p>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUser={currentUser}
              members={members}
              onSave={handleEditSave}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <div className="flex flex-col gap-2">
        <MentionTextarea
          value={text}
          onChange={setText}
          onSubmit={handleSubmit}
          members={members}
          placeholder="Escribe un comentario… usa @ para mencionar"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="self-start px-4 py-1.5 bg-ki-purple border border-border-ki text-pearl-white rounded text-sm font-medium hover:bg-ki-pastel transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Comentar
        </button>
      </div>
    </div>
  );
}
