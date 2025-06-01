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
        "h-screen w-full flex items-center p-12 relative",
        "outline outline-gray-200 outline-offset-[-1rem]",
      )}
    >
      {/* Full width absolute background image */}
      <div
        className={cx(
          "absolute top-0 right-0",
          "w-[42%] h-full bg-cover bg-center bg-no-repeat",
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
      <div className="relative z-10 w-[58%]">
        <div
          className={cx(
            "w-full max-w-4xl my-12 mx-auto gap-1",
            "flex flex-col",
          )}
        >
          <h1
            className={cx(
              //"text-4xl font-medium",
              //"tracking-tighter",
              "text-gray-900",
              "text-8xl font-serif",
            )}
          >
            vasco
          </h1>
          <div className="text-2xl font-medium text-gray-900">
            Design from the shape of data
          </div>
        </div>
        {/*      <div
          className={cx(
            "grid grid-cols-4 gap-4",
            "w-full max-w-7xl my-12 mx-auto",
          )}
        >
          <div className={cx("text-2xl", "text-gray-700", "flex flex-col")}>
            <div className={cx("text-4xl", "text-gray-900")}>14k</div>
            <div className={cx("text-lg", "text-gray-700")}>Items</div>
          </div>
          <div className={cx("text-2xl", "text-gray-700", "flex flex-col")}>
            <div className={cx("text-4xl", "text-gray-900")}>14k</div>
            <div className={cx("text-lg", "text-gray-700")}>Items</div>
          </div>
          <div className={cx("text-2xl", "text-gray-700", "flex flex-col")}>
            <div className={cx("text-4xl", "text-gray-900")}>14k</div>
            <div className={cx("text-lg", "text-gray-700")}>Items</div>
          </div>
          <div className={cx("text-2xl", "text-gray-700", "flex flex-col")}>
            <div className={cx("text-4xl", "text-gray-900")}>14k</div>
            <div className={cx("text-lg", "text-gray-700")}>Items</div>
          </div>
        </div> */}
        <div className="w-full max-w-7xl my-12 mx-auto">
          <FileDrop onQuestionSelect={handleQuestionSelect} />
        </div>
      </div>
    </div>
  );
};
