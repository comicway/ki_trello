import { EditIcon, DeleteIcon } from "../ui/icons";

const URL_RE = /https?:\/\/[^\s]+/g;

export const extractUrls = (text) =>
  [...(text?.matchAll(URL_RE) || [])].map((m) => m[0]);

export default function LinkPreviewList({ text, onEdit, onDelete }) {
  const urls = extractUrls(text);
  if (!urls.length) return null;

  return (
    <div className="mt-2 flex flex-col gap-1">
      {urls.map((url) => {
        const hostname = (() => {
          try { return new URL(url).hostname; } catch { return url; }
        })();
        const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;

        return (
          <div
            key={url}
            className="flex items-center gap-2 px-3 py-2 bg-ki-black border border-border-ki rounded hover:border-ki-purple transition-colors group"
          >
            <img
              src={favicon}
              alt=""
              className="w-4 h-4 flex-shrink-0"
              onError={(e) => { e.target.style.display = "none"; }}
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-ki-purple text-sm truncate hover:text-ki-pastel transition-colors no-underline"
            >
              {hostname}
            </a>
            {(onEdit || onDelete) && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(url); }}
                    title="Editar URL"
                    className="p-1 rounded text-light-gray hover:text-pearl-white hover:bg-[#2c333a] border-none bg-transparent cursor-pointer transition-colors"
                  >
                    <EditIcon className="h-3 w-3" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(url); }}
                    title="Eliminar URL"
                    className="p-1 rounded text-light-gray hover:text-alert-danger hover:bg-[#2c333a] border-none bg-transparent cursor-pointer transition-colors"
                  >
                    <DeleteIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
