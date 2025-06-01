import { cx } from "@/utils/cx";
import { useCallback, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";

interface JsonViewerProps {
  data: unknown;
  maxHeight?: string;
  objectCount?: number;
  fileSize?: number;
}

interface JsonItem {
  id: string;
  value: unknown;
  name?: string;
  level: number;
  isLast?: boolean;
  type: string;
  hasChildren: boolean;
  isExpanded: boolean;
  childCount?: number;
}

interface JsonItemProps {
  item: JsonItem;
  index: number;
  onToggle: (id: string) => void;
}

const JsonItemComponent = ({ item, onToggle }: JsonItemProps) => {
  const getValueType = (val: unknown): string => {
    if (val === null) return "null";
    if (Array.isArray(val)) return "array";
    if (typeof val === "object") return "object";
    return typeof val;
  };

  const renderValue = (val: unknown) => {
    const type = getValueType(val);

    switch (type) {
      case "string":
        return <span className="text-green-600">"{String(val)}"</span>;
      case "number":
        return <span className="text-blue-600">{String(val)}</span>;
      case "boolean":
        return <span className="text-purple-600">{String(val)}</span>;
      case "null":
        return <span className="text-gray-500">null</span>;
      default:
        return <span className="text-gray-800">{String(val)}</span>;
    }
  };

  const isObject = item.type === "object";
  const isArray = item.type === "array";
  const isComplex = isObject || isArray;

  const toggleExpand = () => onToggle(item.id);

  const getPreview = () => {
    if (isArray) {
      return `Array(${item.childCount || 0})`;
    }
    if (isObject) {
      return `Object(${item.childCount || 0})`;
    }
    return "";
  };

  return (
    <div className="font-mono text-sm py-1 px-2 hover:bg-gray-100">
      <div className="flex items-start">
        <div
          style={{ marginLeft: `${item.level * 20}px` }}
          className="flex items-center"
        >
          {item.hasChildren && (
            <button
              type="button"
              onClick={toggleExpand}
              className="mr-1 text-gray-500 hover:text-gray-700 w-4 h-4 flex items-center justify-center"
            >
              {item.isExpanded ? "▼" : "▶"}
            </button>
          )}

          {item.name && (
            <span className="text-blue-800 mr-2">"{item.name}":</span>
          )}

          {isComplex ? (
            <span>
              <span className="text-gray-600">{isArray ? "[" : "{"}</span>
              {!item.isExpanded && (
                <span className="text-gray-500 ml-1">{getPreview()}</span>
              )}
              {!item.isExpanded && (
                <span className="text-gray-600 ml-1">
                  {isArray ? "]" : "}"}
                </span>
              )}
            </span>
          ) : (
            renderValue(item.value)
          )}
        </div>
      </div>
    </div>
  );
};

const ClosingBracket = ({
  level,
  isArray,
}: { level: number; isArray: boolean }) => (
  <div className="font-mono text-sm py-1 px-2">
    <div
      style={{ marginLeft: `${level * 20}px` }}
      className="text-gray-600"
    >
      {isArray ? "]" : "}"}
    </div>
  </div>
);

export const JsonViewer = ({
  data,
  maxHeight = "400px",
  objectCount,
  fileSize,
}: JsonViewerProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const flattenData = useCallback(
    (value: unknown, name?: string, level = 0, path = "root"): JsonItem[] => {
      const getValueType = (val: unknown): string => {
        if (val === null) return "null";
        if (Array.isArray(val)) return "array";
        if (typeof val === "object") return "object";
        return typeof val;
      };

      const type = getValueType(value);
      const isObject = type === "object";
      const isArray = type === "array";
      const isComplex = isObject || isArray;

      let hasChildren = false;
      let childCount = 0;

      if (isComplex) {
        if (isArray) {
          childCount = (value as unknown[]).length;
          hasChildren = childCount > 0;
        } else if (isObject) {
          childCount = Object.keys(value as object).length;
          hasChildren = childCount > 0;
        }
      }

      const isExpanded = expandedItems.has(path) || level < 2; // Auto-expand first 2 levels
      const items: JsonItem[] = [];

      // Add the current item
      items.push({
        id: path,
        value,
        name,
        level,
        type,
        hasChildren,
        isExpanded,
        childCount,
      });

      // Add children if expanded
      if (isComplex && isExpanded && hasChildren) {
        if (isArray) {
          for (const [index, item] of (value as unknown[]).entries()) {
            const childPath = `${path}.${index}`;
            items.push(
              ...flattenData(item, String(index), level + 1, childPath),
            );
          }
        } else if (isObject) {
          for (const [key, val] of Object.entries(
            value as Record<string, unknown>,
          )) {
            const childPath = `${path}.${key}`;
            items.push(...flattenData(val, key, level + 1, childPath));
          }
        }

        // Add closing bracket
        items.push({
          id: `${path}_close`,
          value: null,
          level,
          type: "closing",
          hasChildren: false,
          isExpanded: false,
          childCount: 0,
        });
      }

      return items;
    },
    [expandedItems],
  );

  const items = useMemo(() => flattenData(data), [data, flattenData]);

  const handleToggle = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  return (
    <div
      className={cx(
        "bg-gray-50 border overflow-hidden h-96",
        "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100",
      )}
    >
      {(objectCount !== undefined || fileSize !== undefined) && (
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {objectCount !== undefined && (
              <div>
                <span className="font-medium">Objects:</span>{" "}
                {objectCount.toLocaleString()}
              </div>
            )}
            {fileSize !== undefined && (
              <div>
                <span className="font-medium">File Size:</span>{" "}
                {formatBytes(fileSize)}
              </div>
            )}
            <div>
              <span className="font-medium">Type:</span>{" "}
              <span className="ml-1 px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded">
                {Array.isArray(data) ? "array" : "object"}
              </span>
            </div>
          </div>
        </div>
      )}
      <Virtuoso
        data={items}
        style={{ height: Number.parseInt(maxHeight.replace("px", "")) || 400 }}
        itemContent={(index, item) => {
          if (item.type === "closing") {
            // Find the original item to determine if it's an array or object
            const originalItem = items.find(
              (i) => i.id === item.id.replace("_close", ""),
            );
            return (
              <ClosingBracket
                level={item.level}
                isArray={originalItem?.type === "array"}
              />
            );
          }

          return (
            <JsonItemComponent
              item={item}
              index={index}
              onToggle={handleToggle}
            />
          );
        }}
        className="p-2"
      />
    </div>
  );
};
