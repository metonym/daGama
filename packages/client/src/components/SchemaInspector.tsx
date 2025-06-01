import { cx } from "@/utils/cx";
import { useCallback, useMemo, useState } from "react";
import {
  ExpandButton,
  type TreeItem,
  TreeViewer,
  TypeBadge,
} from "./TreeViewer";

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

interface SchemaItem extends TreeItem {
  property: SchemaProperty;
  name?: string;
  childCount?: number;
  isArrayItems?: boolean;
}

const SchemaItemComponent = ({
  item,
  onToggle,
}: { item: SchemaItem; onToggle: (id: string) => void }) => {
  const toggleExpand = () => onToggle(item.id);

  return (
    <div className="font-mono text-[10px] py-0.5 px-2 hover:bg-gray-50 border-b border-gray-100">
      <div className="flex items-center">
        <div
          style={{ marginLeft: `${item.level * 12}px` }}
          className="flex items-center"
        >
          {item.hasChildren && (
            <ExpandButton
              isExpanded={item.isExpanded}
              onClick={toggleExpand}
            />
          )}

          {item.isArrayItems && (
            <span className="text-gray-600 text-[10px] mr-2">Items:</span>
          )}

          {item.name && !item.isArrayItems && (
            <span className="text-gray-800 mr-2 font-medium">{item.name}:</span>
          )}

          <TypeBadge type={item.property.type} />

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

  const renderItem = useCallback(
    (item: SchemaItem, onToggle: (id: string) => void) => {
      return (
        <SchemaItemComponent
          item={item}
          onToggle={onToggle}
        />
      );
    },
    [],
  );

  const headerContent = (
    <div className="flex items-center gap-3 text-[10px] text-gray-600 font-mono">
      <div>
        <span className="font-medium">Type:</span>
        <TypeBadge
          type={schema.type}
          className="ml-1"
        />
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
  );

  return (
    <TreeViewer
      items={items}
      renderItem={renderItem}
      onToggle={handleToggle}
      headerContent={headerContent}
      height={396}
    />
  );
};
