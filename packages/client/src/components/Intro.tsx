import bgImage from "@/assets/cover.jpg";
import { cx } from "@/utils/cx";
import { useState } from "react";
import { DynamicUIOverlay } from "./DynamicUIOverlay";
import { FileDrop } from "./FileDrop";

interface DataPoint {
  [key: string]: unknown;
}

export const Intro = () => {
  const [overlayState, setOverlayState] = useState<{
    question: string;
    data: DataPoint[];
  } | null>(null);

  const handleQuestionSelect = (question: string, data: DataPoint[]) => {
    setOverlayState({ question, data });
  };

  const handleCloseOverlay = () => {
    setOverlayState(null);
  };

  return (
    <div
      className={cx(
        "min-h-screen w-full p-12 relative",
        "outline outline-gray-200 outline-offset-[-1rem]",
      )}
    >
      {/* Full width absolute background image */}
      <div
        className={cx(
          "fixed top-0 right-0",
          "w-[28%] h-full bg-cover bg-center bg-no-repeat",
        )}
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      {/* Dynamic UI Overlay */}
      {overlayState && (
        <DynamicUIOverlay
          question={overlayState.question}
          data={overlayState.data}
          onClose={handleCloseOverlay}
        />
      )}

      {/* Content overlay */}
      <div className="relative z-10 w-[calc(72%-2rem)] py-12">
        <div className={cx("w-full max-w-7xl mx-auto gap-1", "flex flex-col")}>
          <h1 className={cx("text-gray-900", "text-8xl font-serif")}>vasco</h1>
          <div className="text-2xl font-medium text-gray-500 mb-12">
            Design from data, in code.
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto">
          <FileDrop onQuestionSelect={handleQuestionSelect} />
        </div>
      </div>
    </div>
  );
};
