interface SchemaProperty {
  type: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  nullable?: boolean;
  example?: unknown;
}

export interface JsonSchema {
  type: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
}

function getType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  return typeof value;
}

function inferPropertySchema(value: unknown): SchemaProperty {
  const type = getType(value);
  const schema: SchemaProperty = { type };

  if (type === "array" && Array.isArray(value)) {
    if (value.length > 0) {
      // Infer schema from first item (could be enhanced to merge all items)
      schema.items = inferPropertySchema(value[0]);
    } else {
      schema.items = { type: "unknown" };
    }
  } else if (type === "object" && value !== null && typeof value === "object") {
    schema.properties = {};
    for (const [key, val] of Object.entries(value)) {
      schema.properties[key] = inferPropertySchema(val);
    }
  }

  // Add example for primitive types
  if (["string", "number", "integer", "boolean"].includes(type)) {
    schema.example = value;
  }

  return schema;
}

export function inferJsonSchema(data: unknown): JsonSchema {
  return inferPropertySchema(data) as JsonSchema;
}
