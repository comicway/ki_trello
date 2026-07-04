import { useState, useCallback, useEffect } from "react";

const MIN_WIDTH = 320;
const MAX_WIDTH = 900;

/**
 * Returns [width, handleMouseDown] for a resizable right-side drawer.
 * Attach handleMouseDown to the left edge drag handle.
 */
export default function useResizableDrawer(initialWidth = 520) {
  const [width, setWidth] = useState(initialWidth);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent) => {
      const delta = startX - moveEvent.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      setWidth(next);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [width]);

  return [width, handleMouseDown];
}
