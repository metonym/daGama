import { cx } from "@/utils/cx";
import { useCallback, useMemo, useState } from "react";
import { Virtuoso } from "react-virtuoso";

interface SchemaProperty {
  type: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  nullable?: boolean;
  example?: unknown;
}

interface SchemaInspectorProps {
  schema: SchemaProperty;
}

interface SchemaItem {
  id: string;
  property: SchemaProperty;
  name?: string;
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  childCount?: number;
  isArrayItems?: boolean;
}

interface SchemaItemProps {
  item: SchemaItem;
  index: number;
  onToggle: (id: string) => void;
}

const getTypeColor = (type: string): string => {
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

const SchemaItemComponent = ({ item, onToggle }: SchemaItemProps) => {
  const toggleExpand = () => onToggle(item.id);

  return (
    <div className="font-mono text-[10px] py-0.5 px-2 hover:bg-gray-50 border-b border-gray-100">
      <div className="flex items-center">
        <div
          style={{ marginLeft: `${item.level * 12}px` }}
          className="flex items-center"
        >
          {item.hasChildren && (
            <button
              type="button"
              onClick={toggleExpand}
              className="mr-2 text-gray-500 hover:text-gray-700 w-3 h-3 flex items-center justify-center text-[10px]"
            >
              {item.isExpanded ? "▼" : "▶"}
            </button>
          )}

          {item.isArrayItems && (
            <span className="text-gray-600 text-[10px] mr-2">Items:</span>
          )}

          {item.name && !item.isArrayItems && (
            <span className="text-gray-800 mr-2 font-medium">{item.name}:</span>
          )}

          <span
            className={cx(
              "px-1 py-0.5 text-[10px] font-medium",
              getTypeColor(item.property.type),
            )}
          >
            {item.property.type}
          </span>

          {item.property.example !== undefined && (
            <span className="ml-2 text-gray-500 text-[10px]">
              e.g., {JSON.stringify(item.property.example)}
            </span>
          )}

          {item.hasChildren && !item.isExpanded && item.childCount && (
            <span className="ml-2 text-gray-500 text-[10px]">
              ({item.childCount}{" "}
              {item.childCount === 1 ? "property" : "properties"})
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const SchemaInspector = ({ schema }: SchemaInspectorProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const flattenSchema = useCallback(
    (
      property: SchemaProperty,
      name?: string,
      level = 0,
      path = "root",
      isArrayItems = false,
    ): SchemaItem[] => {
      const hasChildren = Boolean(
        (property.type === "object" && property.properties) ||
          (property.type === "array" && property.items),
      );

      let childCount = 0;
      if (property.type === "object" && property.properties) {
        childCount = Object.keys(property.properties).length;
      } else if (property.type === "array" && property.items) {
        childCount = 1; // Array has one items schema
      }

      const isExpanded = expandedItems.has(path) || level < 3; // Auto-expand first 3 levels
      const items: SchemaItem[] = [];

      // Add the current item
      items.push({
        id: path,
        property,
        name,
        level,
        hasChildren,
        isExpanded,
        childCount,
        isArrayItems,
      });

      // Add children if expanded
      if (hasChildren && isExpanded) {
        if (property.type === "object" && property.properties) {
          for (const [key, prop] of Object.entries(property.properties)) {
            const childPath = `${path}.${key}`;
            items.push(
              ...flattenSchema(prop, key, level + 1, childPath, false),
            );
          }
        } else if (property.type === "array" && property.items) {
          const childPath = `${path}.items`;
          items.push(
            ...flattenSchema(
              property.items,
              undefined,
              level + 1,
              childPath,
              true,
            ),
          );
        }
      }

      return items;
    },
    [expandedItems],
  );

  const items = useMemo(() => flattenSchema(schema), [schema, flattenSchema]);

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

  const getStats = (
    prop: SchemaProperty,
  ): { totalProperties: number; depth: number } => {
    let totalProperties = 0;
    let maxDepth = 0;

    const traverse = (p: SchemaProperty, currentDepth: number) => {
      maxDepth = Math.max(maxDepth, currentDepth);

      if (p.type === "object" && p.properties) {
        totalProperties += Object.keys(p.properties).length;
        for (const subProp of Object.values(p.properties)) {
          traverse(subProp, currentDepth + 1);
        }
      } else if (p.type === "array" && p.items) {
        traverse(p.items, currentDepth + 1);
      }
    };

    traverse(prop, 1);
    return { totalProperties, depth: maxDepth };
  };

  const stats = getStats(schema);

  return (
    <div className="bg-white border border-gray-200 overflow-hidden h-96">
      <div className="p-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-3 text-[10px] text-gray-600 font-mono">
          <div>
            <span className="font-medium">Type:</span>
            <span
              className={cx(
                "ml-1 px-1 py-0.5 text-[10px]",
                getTypeColor(schema.type),
              )}
            >
              {schema.type}
            </span>
          </div>
          {stats.totalProperties > 0 && (
            <div>
              <span className="font-medium">Properties:</span>{" "}
              {stats.totalProperties}
            </div>
          )}
          <div>
            <span className="font-medium">Depth:</span> {stats.depth}
          </div>
        </div>
      </div>

      <div style={{ height: "384px" }}>
        <Virtuoso
          data={items}
          style={{ height: 384 }}
          itemContent={(index, item) => (
            <SchemaItemComponent
              item={item}
              index={index}
              onToggle={handleToggle}
            />
          )}
          className="p-0"
        />
      </div>
    </div>
  );
};
