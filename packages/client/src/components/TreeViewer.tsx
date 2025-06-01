import { cx } from "@/utils/cx";
import type { ReactNode } from "react";
import { Virtuoso } from "react-virtuoso";

export interface TreeItem {
  id: string;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export interface TreeViewerProps<T extends TreeItem> {
  items: T[];
  renderItem: (item: T, onToggle: (id: string) => void) => ReactNode;
  onToggle: (id: string) => void;
  headerContent?: ReactNode;
  className?: string;
  height?: number;
}

export const getTypeColor = (type: string): string => {
  switch (type) {
    case "string":
      return "text-green-700 bg-gray-100";
    case "number":
    case "integer":
      return "text-blue-700 bg-gray-100";
    case "boolean":
      return "text-purple-700 bg-gray-100";
    case "array":
      return "text-orange-700 bg-gray-100";
    case "object":
      return "text-pink-700 bg-gray-100";
    case "null":
      return "text-gray-700 bg-gray-100";
    default:
      return "text-gray-700 bg-gray-100";
  }
};

export const TypeBadge = ({
  type,
  className,
}: { type: string; className?: string }) => (
  <span
    className={cx(
      "px-1 py-0.5 text-[10px] font-medium",
      getTypeColor(type),
      className,
    )}
  >
    {type}
  </span>
);

export const ExpandButton = ({
  isExpanded,
  onClick,
}: {
  isExpanded: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="mr-2 text-gray-500 hover:text-gray-700 w-3 h-3 flex items-center justify-center text-[10px]"
  >
    {isExpanded ? "▼" : "▶"}
  </button>
);

export function TreeViewer<T extends TreeItem>({
  items,
  renderItem,
  onToggle,
  headerContent,
  className,
  height = 396,
}: TreeViewerProps<T>) {
  return (
    <div
      className={cx(
        "bg-white border border-gray-200 overflow-hidden",
        "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100",
        className,
      )}
      style={{ height }}
    >
      {headerContent && (
        <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-2">
          {headerContent}
        </div>
      )}
      <Virtuoso
        data={items}
        style={{ height: headerContent ? height - 40 : height }}
        itemContent={(index, item) => renderItem(item, onToggle)}
        className="p-0"
      />
    </div>
  );
}
