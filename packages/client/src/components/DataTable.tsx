import type { ReactNode } from "react";

interface DataTableColumn {
  id: string;
  header: string;
  span: number; // Grid column span (out of 12)
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: DataTableColumn[];
  data: T[];
  renderRow: (item: T, index: number) => ReactNode[];
  keyExtractor: (item: T, index: number) => string;
  sortFn?: (a: T, b: T) => number;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
}

// Helper function to get the correct col-span class
const getColSpanClass = (span: number): string => {
  switch (span) {
    case 1:
      return "col-span-1";
    case 2:
      return "col-span-2";
    case 3:
      return "col-span-3";
    case 4:
      return "col-span-4";
    case 5:
      return "col-span-5";
    case 6:
      return "col-span-6";
    case 7:
      return "col-span-7";
    case 8:
      return "col-span-8";
    case 9:
      return "col-span-9";
    case 10:
      return "col-span-10";
    case 11:
      return "col-span-11";
    case 12:
      return "col-span-12";
    default:
      return "col-span-1";
  }
};

export function DataTable<T>({
  columns,
  data,
  renderRow,
  keyExtractor,
  sortFn,
  onRowClick,
  className = "",
}: DataTableProps<T>) {
  const sortedData = sortFn ? [...data].sort(sortFn) : data;

  const handleRowClick = (item: T, index: number) => {
    onRowClick?.(item, index);
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent,
    item: T,
    index: number,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick?.(item, index);
    }
  };

  return (
    <div className={`bg-white border border-gray-200 ${className}`}>
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2">
        <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-700 uppercase tracking-wide">
          {columns.map((column) => (
            <div
              key={column.id}
              className={`${
                column.span > 0
                  ? getColSpanClass(column.span)
                  : "absolute right-3"
              } ${
                column.align === "right"
                  ? "text-right"
                  : column.align === "center"
                    ? "text-center"
                    : "text-left"
              }`}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-100">
        {sortedData.map((item, index) => {
          const cells = renderRow(item, index);
          const isClickable = !!onRowClick;
          const rowKey = keyExtractor(item, index);

          return (
            <div
              key={rowKey}
              className={`px-3 py-2 relative ${
                isClickable ? "cursor-pointer transition-colors" : ""
              }`}
              onClick={() => handleRowClick(item, index)}
              onKeyDown={(event) => handleRowKeyDown(event, item, index)}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {cells.map((cell, cellIndex) => (
                  <div
                    key={`${rowKey}-cell-${columns[cellIndex].id}`}
                    className={`${
                      columns[cellIndex].span > 0
                        ? getColSpanClass(columns[cellIndex].span)
                        : "absolute right-3"
                    } ${
                      columns[cellIndex].align === "right"
                        ? "flex justify-end"
                        : columns[cellIndex].align === "center"
                          ? "flex justify-center"
                          : ""
                    }`}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
