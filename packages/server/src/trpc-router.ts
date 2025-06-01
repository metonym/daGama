import { openai } from "@ai-sdk/openai";
import { initTRPC } from "@trpc/server";
import { generateObject } from "ai";
import { z } from "zod";

const trpc = initTRPC.create();
const procedure = trpc.procedure;

// Schema for the property structure coming from frontend
const SchemaPropertySchema: z.ZodType<{
  type: string;
  properties?: Record<string, unknown>;
  items?: unknown;
  nullable?: boolean;
  example?: unknown;
}> = z.object({
  type: z.string(),
  properties: z.record(z.unknown()).optional(),
  items: z.unknown().optional(),
  nullable: z.boolean().optional(),
  example: z.unknown().optional(),
});

// Schema for the LLM response
const DataInsightsSchema = z.object({
  semanticAnalysis: z.array(
    z.object({
      field: z.string(),
      semanticMeaning: z.string(),
      dataType: z.string(),
      importance: z.enum(["high", "medium", "low"]),
      category: z.string(), // e.g., 'identifier', 'temporal', 'categorical', 'numerical', 'metadata'
    })
  ),
  visualizationRecommendations: z.array(
    z.object({
      fieldCombination: z.array(z.string()),
      chartType: z.string(),
      rationale: z.string(),
      priority: z.enum(["high", "medium", "low"]),
    })
  ),
  keyInsights: z.array(z.string()),
  dataQualityNotes: z.array(z.string()),
  suggestedQuestions: z.array(z.string()),
});

interface FieldInfo {
  field: string;
  type: string;
  example?: unknown;
}

interface SchemaProperty {
  type: string;
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  nullable?: boolean;
  example?: unknown;
}

export const router = trpc.router({
  greet: procedure.input(z.string()).query(({ input }) => {
    return {
      message: `Hello, ${input}!`,
    };
  }),

  analyzeSchema: procedure
    .input(
      z.object({
        schema: SchemaPropertySchema,
        sampleData: z.array(z.record(z.unknown())).optional(),
        fileName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { schema, sampleData, fileName } = input;

      // Extract fields from schema for analysis
      const extractFields = (prop: SchemaProperty, path = ""): FieldInfo[] => {
        const fields: FieldInfo[] = [];

        if (prop.type === "object" && prop.properties) {
          for (const [key, value] of Object.entries(prop.properties)) {
            const fieldPath = path ? `${path}.${key}` : key;

            fields.push({
              field: fieldPath,
              type: value.type,
              example: value.example,
            });

            // Recursively extract nested fields
            if (value.type === "object" || value.type === "array") {
              fields.push(...extractFields(value, fieldPath));
            }
          }
        } else if (prop.type === "array" && prop.items) {
          fields.push(...extractFields(prop.items, `${path}[]`));
        }

        return fields;
      };

      const fields = extractFields(schema as SchemaProperty);

      const fieldsList = fields
        .map((f) => {
          const exampleText = f.example
            ? ` (e.g., ${JSON.stringify(f.example)})`
            : "";
          return `- ${f.field}: ${f.type}${exampleText}`;
        })
        .join("\n");

      const sampleDataText = sampleData
        ? `
Sample Data (first few records):
${JSON.stringify(sampleData.slice(0, 3), null, 2)}
`
        : "";

      const prompt = `You are a data analysis expert. Analyze this dataset schema and provide insights for data visualization and exploration.

Dataset: ${fileName || "Unknown"}
Schema Analysis:
${fieldsList}
${sampleDataText}
Please provide a comprehensive analysis including:
1. Semantic meaning of each field
2. Data importance and categorization
3. Visualization recommendations
4. Key insights about the dataset
5. Data quality observations
6. Suggested questions for exploration

Focus on practical insights that would help someone understand and visualize this data effectively.`;

      const result = await generateObject({
        model: openai("gpt-4o"),
        schema: DataInsightsSchema,
        prompt,
      });

      return result.object;
    }),
});

export type Router = typeof router;
