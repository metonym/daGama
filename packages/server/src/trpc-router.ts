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

      const prompt = `You are a data visualization and UI design expert. Analyze this dataset schema and provide insights for creating clean, minimal, and highly functional data interfaces.

Dataset: ${fileName || "Unknown"}
Schema Analysis:
${fieldsList}
${sampleDataText}

EXPLICIT UI DESIGN RULES:
1. INFORMATION HIERARCHY: Structure suggestions from most to least important
2. MONOCHROMATIC DESIGN: Focus on grays, blacks, and whites only
3. COMPACT LAYOUTS: Prioritize information density over visual decoration
4. SEMANTIC FIELD NAMING: Use clear, human-readable labels
5. ACTIONABLE INSIGHTS: Every insight should lead to a specific action or exploration
6. DATA-DRIVEN TITLES: Chart types should be specific to the data (e.g., "Revenue by Quarter" not "Bar Chart")
7. PROGRESSIVE DISCLOSURE: Start with high-level patterns, allow drilling down
8. TIMESTAMP FORMATTING: Convert all time data to human-readable formats (e.g., "2h 30m" not "9000000ms")

VISUALIZATION QUALITY STANDARDS:
- Chart types must be appropriate for data types (don't suggest pie charts for continuous data)
- Field combinations should reveal meaningful relationships, not arbitrary pairings
- Rationales must explain WHY this visualization helps answer business questions
- Priority should reflect actual analytical value, not visual appeal

SUGGESTED QUESTIONS CRITERIA:
- Questions should be answerable with the available data
- Focus on business insights, patterns, and anomalies
- Use natural language that non-technical users understand
- Prioritize questions that reveal actionable insights

DATA QUALITY FOCUS:
- Identify missing data patterns that affect analysis
- Note data inconsistencies that impact visualization accuracy
- Suggest data cleaning steps when relevant

Provide comprehensive analysis including:
1. Semantic meaning of each field with business context
2. Data importance ranking based on analytical value
3. Visualization recommendations with specific implementation details
4. Key insights that drive decision-making
5. Data quality observations that affect reliability
6. Suggested questions that unlock business value

Focus on creating interfaces that help users discover meaningful patterns and make data-driven decisions efficiently.`;

      const result = await generateObject({
        model: openai("gpt-4o"),
        schema: DataInsightsSchema,
        prompt,
      });

      return result.object;
    }),
});

export type Router = typeof router;
