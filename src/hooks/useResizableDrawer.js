import { useState, useCallback, useRef } from "react";

const MIN_WIDTH = 320;
const MAX_WIDTH = 900;

export default function useResizableDrawer(initialWidth = 520) {
  const [width, setWidth] = useState(initialWidth);
  const widthRef = useRef(initialWidth);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = widthRef.current;

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
      const delta = startX - moveEvent.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
      widthRef.current = next;
      setWidth(next);
    };

    const onMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  return [width, handleMouseDown];
}
