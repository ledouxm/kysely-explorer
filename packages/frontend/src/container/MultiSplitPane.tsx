import { useState, useCallback, type ReactNode } from "react";
import { styled } from "#styled-system/jsx";

type Panel = {
  content: ReactNode;
  initialWidth?: number;
};

export const MultiSplitPane = ({ panels }: { panels: Panel[] }) => {
  // Initialize panel widths, distributing remaining space evenly among panels without initialWidth
  const initializePanelWidths = () => {
    const totalInitialWidth = panels.reduce(
      (sum, panel) => sum + (panel.initialWidth || 0),
      0,
    );
    const remainingWidth = 100 - totalInitialWidth;
    const panelsWithoutWidth = panels.filter(
      (panel) => !panel.initialWidth,
    ).length;
    const defaultWidth = remainingWidth / panelsWithoutWidth;

    return panels.map((panel) => panel.initialWidth || defaultWidth);
  };

  const [widths, setWidths] = useState(initializePanelWidths);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const handleMouseDown = useCallback((index: number) => {
    setDraggingIndex(index);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingIndex === null) return;

      const container = e.currentTarget as HTMLDivElement;
      const containerRect = container.getBoundingClientRect();
      const position =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      setWidths((prevWidths) => {
        const newWidths = [...prevWidths];

        // Calculate the total width of panels before and after the divider
        const beforeWidth = newWidths[draggingIndex];
        const afterWidth = newWidths[draggingIndex + 1];

        // Calculate the new position relative to the sum of the two affected panels
        const totalWidth = beforeWidth + afterWidth;
        const relativePosition =
          position -
          newWidths.slice(0, draggingIndex).reduce((a, b) => a + b, 0);

        // Ensure minimum width of 20% of the combined width for each panel
        const minWidth = totalWidth * 0.2;
        const maxWidth = totalWidth * 0.8;

        const newBeforeWidth = Math.max(
          minWidth,
          Math.min(maxWidth, relativePosition),
        );
        const newAfterWidth = totalWidth - newBeforeWidth;

        newWidths[draggingIndex] = newBeforeWidth;
        newWidths[draggingIndex + 1] = newAfterWidth;

        return newWidths;
      });
    },
    [draggingIndex],
  );

  const handleMouseUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  return (
    <styled.div
      h="100%"
      w="100%"
      display="flex"
      flexDirection="row"
      overflow="hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {panels.map((panel, index) => (
        <styled.div key={index} display="flex" h="100%">
          <styled.div
            overflow="auto"
            h="100%"
            style={{ width: `${widths[index]}%` }}
          >
            {panel.content}
          </styled.div>

          {index < panels.length - 1 && (
            <styled.div
              // className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize active:bg-blue-600 transition-colors"
              bg="gray.200"
              cursor="col-resize"
              transition="background-color 0.2s"
              w="1"
              onMouseDown={() => handleMouseDown(index)}
            />
          )}
        </styled.div>
      ))}
    </styled.div>
  );
};
