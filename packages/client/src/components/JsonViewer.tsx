import { useCallback, useMemo, useState } from "react";
import {
  ExpandButton,
  type TreeItem,
  TreeViewer,
  TypeBadge,
} from "./TreeViewer";

interface JsonViewerProps {
  data: unknown;
  maxHeight?: string;
  objectCount?: number;
  fileSize?: number;
}

interface JsonItem extends TreeItem {
  value: unknown;
  name?: string;
  type: string;
  childCount?: number;
}

const JsonItemComponent = ({
  item,
  onToggle,
}: { item: JsonItem; onToggle: (id: string) => void }) => {
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
    <div className="font-mono text-[10px] h-5 px-2 hover:bg-gray-50 border-b border-gray-100 flex items-center">
      <div className="flex items-start min-w-0 w-full">
        <div
          style={{ marginLeft: `${item.level * 12}px` }}
          className="flex items-center min-w-0 flex-1"
        >
          {item.hasChildren && (
            <ExpandButton
              isExpanded={item.isExpanded}
              onClick={toggleExpand}
            />
          )}

          {item.name && (
            <span className="text-blue-800 mr-2 flex-shrink-0">
              "{item.name}":
            </span>
          )}

          {isComplex ? (
            <div className="flex items-center min-w-0">
              <span className="text-gray-600 flex-shrink-0">
                {isArray ? "[" : "{"}
              </span>
              {!item.isExpanded && (
                <>
                  <span className="text-gray-500 ml-1 flex-shrink-0">
                    {getPreview()}
                  </span>
                  <span className="text-gray-600 ml-1 flex-shrink-0">
                    {isArray ? "]" : "}"}
                  </span>
                </>
              )}
            </div>
          ) : (
            <div className="min-w-0 truncate">{renderValue(item.value)}</div>
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
  <div className="font-mono text-[10px] h-5 px-2 border-b border-gray-100 flex items-center">
    <div
      style={{ marginLeft: `${level * 12}px` }}
      className="text-gray-600"
    >
      {isArray ? "]" : "}"}
    </div>
  </div>
);

export const JsonViewer = ({
  data,
  maxHeight = "320px",
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

  const getDepth = useCallback((value: unknown): number => {
    if (value === null || typeof value !== "object") {
      return 1;
    }

    let maxDepth = 1;

    if (Array.isArray(value)) {
      for (const item of value) {
        maxDepth = Math.max(maxDepth, 1 + getDepth(item));
      }
    } else {
      for (const val of Object.values(value as Record<string, unknown>)) {
        maxDepth = Math.max(maxDepth, 1 + getDepth(val));
      }
    }

    return maxDepth;
  }, []);

  const depth = useMemo(() => getDepth(data), [data, getDepth]);

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

  const renderItem = useCallback(
    (item: JsonItem, onToggle: (id: string) => void) => {
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
          onToggle={onToggle}
        />
      );
    },
    [items],
  );

  const headerContent =
    objectCount !== undefined || fileSize !== undefined ? (
      <div className="flex items-center gap-3 text-[10px] text-gray-600 font-mono">
        {fileSize !== undefined && (
          <div>
            <span className="font-medium">Size:</span> {formatBytes(fileSize)}
          </div>
        )}
        <div>
          <span className="font-medium">Type:</span>{" "}
          <TypeBadge type={Array.isArray(data) ? "array" : "object"} />
        </div>
        {objectCount !== undefined && (
          <div>
            <span className="font-medium">Count:</span>{" "}
            {objectCount.toLocaleString()}
          </div>
        )}
        <div>
          <span className="font-medium">Depth:</span> {depth}
        </div>
      </div>
    ) : undefined;

  const height = Number.parseInt(maxHeight.replace("px", "")) || 400;

  return (
    <TreeViewer
      items={items}
      renderItem={renderItem}
      onToggle={handleToggle}
      headerContent={headerContent}
      height={height}
    />
  );
};
