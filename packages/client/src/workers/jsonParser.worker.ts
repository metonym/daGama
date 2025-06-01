interface ParseMessage {
  type: "parse";
  fileContent: string;
  isArray?: boolean;
  chunkSize?: number;
}

interface ProgressMessage {
  type: "progress";
  progress: number;
  processed: number;
  total: number;
}

interface CompleteMessage {
  type: "complete";
  data: unknown;
  error?: string;
}

interface PartialMessage {
  type: "partial";
  data: unknown[];
  count: number;
}

type WorkerMessage = ParseMessage;
type WorkerResponse = ProgressMessage | CompleteMessage | PartialMessage;

// Simple streaming parser for arrays
async function parseJsonStream(
  content: string,
  onProgress: (progress: number, processed: number, total: number) => void,
  onPartial?: (items: unknown[], count: number) => void
): Promise<unknown> {
  const total = content.length;
  let processed = 0;

  // Check if it's likely an array by looking at the trimmed start
  const trimmed = content.trim();
  if (trimmed.startsWith("[")) {
    return parseArrayStream(content, onProgress, onPartial);
  }

  // For non-arrays, parse normally with progress updates
  const chunkSize = 50000; // 50KB chunks
  let result: unknown;

  try {
    // Parse in chunks to provide progress feedback
    for (let i = 0; i < content.length; i += chunkSize) {
      processed = Math.min(i + chunkSize, content.length);
      const progress = (processed / total) * 80; // Reserve 20% for schema inference
      onProgress(progress, processed, total);

      // Small delay to allow progress updates
      if (i > 0) {
        // Use setTimeout to yield control back to event loop
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    result = JSON.parse(content);
    onProgress(100, total, total);
    return result;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

async function parseArrayStream(
  content: string,
  onProgress: (progress: number, processed: number, total: number) => void,
  onPartial?: (items: unknown[], count: number) => void
): Promise<unknown[]> {
  const total = content.length;
  let processed = 0;
  const items: unknown[] = [];

  try {
    // Remove outer brackets and split by commas at the top level
    const trimmed = content.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
      throw new Error("Not a valid JSON array");
    }

    const innerContent = trimmed.slice(1, -1).trim();
    if (!innerContent) {
      return []; // Empty array
    }

    // Find top-level commas to split array items
    const arrayItems: string[] = [];
    let currentItem = "";
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < innerContent.length; i++) {
      const char = innerContent[i];
      processed = i;

      if (i % 10000 === 0) {
        // Update progress every 10K characters
        const progress = (processed / total) * 70; // Reserve 30% for parsing items
        onProgress(progress, processed, total);
      }

      if (escapeNext) {
        escapeNext = false;
        currentItem += char;
        continue;
      }

      if (char === "\\" && inString) {
        escapeNext = true;
        currentItem += char;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
      }

      if (!inString) {
        if (char === "{") braceCount++;
        else if (char === "}") braceCount--;
        else if (char === "[") bracketCount++;
        else if (char === "]") bracketCount--;
        else if (char === "," && braceCount === 0 && bracketCount === 0) {
          // Top-level comma found
          arrayItems.push(currentItem.trim());
          currentItem = "";
          continue;
        }
      }

      currentItem += char;
    }

    // Add the last item
    if (currentItem.trim()) {
      arrayItems.push(currentItem.trim());
    }

    // Parse each item and provide partial updates
    const batchSize = Math.max(1, Math.floor(arrayItems.length / 10)); // Process in 10 batches

    for (let i = 0; i < arrayItems.length; i += batchSize) {
      const batch = arrayItems.slice(i, i + batchSize);
      const parsedBatch: unknown[] = [];

      for (const itemStr of batch) {
        try {
          const parsed = JSON.parse(itemStr);
          parsedBatch.push(parsed);
        } catch (error) {
          console.warn("Failed to parse array item:", error);
          // Continue with other items
        }
      }

      items.push(...parsedBatch);

      const progress = 70 + ((i + batch.length) / arrayItems.length) * 30;
      onProgress(progress, processed, total);

      // Send partial results for large arrays
      if (onPartial && items.length % (batchSize * 2) === 0) {
        onPartial([...items], items.length);
      }

      // Yield control to allow progress updates
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    onProgress(100, total, total);
    return items;
  } catch (error) {
    throw new Error(
      `Failed to parse JSON array: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, fileContent, isArray, chunkSize } = event.data;

  if (type === "parse") {
    try {
      const onProgress = (
        progress: number,
        processed: number,
        total: number
      ) => {
        self.postMessage({
          type: "progress",
          progress,
          processed,
          total,
        } as ProgressMessage);
      };

      const onPartial = (items: unknown[], count: number) => {
        self.postMessage({
          type: "partial",
          data: items,
          count,
        } as PartialMessage);
      };

      const data = await parseJsonStream(
        fileContent,
        onProgress,
        isArray ? onPartial : undefined
      );

      self.postMessage({
        type: "complete",
        data,
      } as CompleteMessage);
    } catch (error) {
      self.postMessage({
        type: "complete",
        data: null,
        error: error instanceof Error ? error.message : "Unknown parsing error",
      } as CompleteMessage);
    }
  }
};

export {};
