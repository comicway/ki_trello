import { useState, useCallback, useRef } from "react";

const MIN_WIDTH = 320;

export default function useResizableDrawer(initialWidth = 520) {
  const [width, setWidth] = useState(initialWidth);
  const widthRef = useRef(initialWidth);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = widthRef.current;

    // Dynamically calculate MAX_WIDTH based on screen size
    const MAX_WIDTH = Math.min(900, window.innerWidth * 0.95);

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    let animationFrameId;

    const onMouseMove = (moveEvent) => {
      moveEvent.preventDefault();

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      const delta = startX - moveEvent.clientX;
      // Fluid calculation respecting screen bounds and fixed limits
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));

      animationFrameId = requestAnimationFrame(() => {
        widthRef.current = next;
        setWidth(next);
        animationFrameId = null;
      });
    };

    const onMouseUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: false });
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  return [width, handleMouseDown];
}
