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
      "px-1 py-0.5 text-[8px] font-medium",
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
    className="mr-2 text-gray-500 hover:text-gray-700 w-3 h-3 flex items-center justify-center text-[10px] flex-shrink-0"
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
  height = 320,
}: TreeViewerProps<T>) {
  return (
    <>
      <style>{`
        .tree-viewer-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }
        
        .tree-viewer-scrollbar:hover {
          scrollbar-color: rgb(156 163 175) transparent;
        }
        
        .tree-viewer-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .tree-viewer-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .tree-viewer-scrollbar::-webkit-scrollbar-thumb {
          background-color: transparent;
          transition: background-color 0.2s ease;
        }
        
        .tree-viewer-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgb(156 163 175);
        }
        
        .tree-viewer-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgb(107 114 128);
        }
        
        .tree-viewer-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
      <div
        className={cx(
          "bg-white border border-gray-200 overflow-hidden tree-viewer-scrollbar relative",
          className,
        )}
        style={{ height }}
      >
        {headerContent && (
          <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 p-2 overflow-hidden">
            <div className="overflow-hidden">{headerContent}</div>
          </div>
        )}
        <Virtuoso
          data={items}
          style={{ height: headerContent ? height - 40 : height }}
          itemContent={(index, item) => (
            <div className="overflow-hidden">{renderItem(item, onToggle)}</div>
          )}
          className="p-0"
        />
        {/* Gradient overlay at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none z-20" />
      </div>
    </>
  );
}
