import { cx } from "@/utils/cx";
import { FileDrop } from "./FileDrop";

export const Intro = () => {
  return (
    <div className="h-screen w-full p-12">
      <div
        className={cx("w-full max-w-7xl my-12 mx-auto gap-1", "flex flex-col")}
      >
        <h1
          className={cx(
            "text-4xl font-medium",
            "tracking-tighter",
            "text-gray-900",
          )}
        >
          vascodex
        </h1>
        <div className="text-2xl text-gray-600">Design data explorer</div>
      </div>
      <div
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
      </div>
      <div className="w-full max-w-7xl my-12 mx-auto">
        <FileDrop />
      </div>
    </div>
  );
};
