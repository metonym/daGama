import { useDataAnalysis } from "@/hooks/useDataAnalysis";
import { cx } from "@/utils/cx";
import { type JsonSchema, inferJsonSchema } from "@/utils/schema-inference";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataInsights } from "./DataInsights";
import { JsonViewer } from "./JsonViewer";
import { ProactiveDataAnalysis } from "./ProactiveDataAnalysis";
import { SchemaInspector } from "./SchemaInspector";
import { Label } from "./typography";

interface FileDropProps {
  onFileProcessed?: (data: unknown, schema: JsonSchema) => void;
  onQuestionSelect?: (
    question: string,
    data: Array<Record<string, unknown>>,
  ) => void;
  className?: string;
}

interface ProcessedFile {
  name: string;
  data: unknown;
  schema: JsonSchema;
  size: number;
  objectCount: number;
}

interface ParseProgress {
  progress: number;
  processed: number;
  total: number;
  isStreaming?: boolean;
  currentCount?: number;
}

export const FileDrop = ({
  onFileProcessed,
  onQuestionSelect,
  className,
}: FileDropProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseProgress, setParseProgress] = useState<ParseProgress | null>(
    null,
  );
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Add AI analysis hook
  const {
    insights,
    loading: analyzeLoading,
    error: analyzeError,
    analyzeSchema,
    clearInsights,
  } = useDataAnalysis();

  // Initialize worker
  useEffect(() => {
    if (typeof Worker !== "undefined") {
      workerRef.current = new Worker(
        new URL("../workers/jsonParser.worker.ts", import.meta.url),
        { type: "module" },
      );

      workerRef.current.onmessage = (event) => {
        const {
          type,
          progress,
          processed,
          total,
          data,
          count,
          error: workerError,
        } = event.data;

        switch (type) {
          case "progress":
            setParseProgress({
              progress,
              processed,
              total,
              isStreaming: false,
            });
            break;

          case "partial":
            setParseProgress((prev) => ({
              ...(prev || { progress: 0, processed: 0, total: 0 }),
              isStreaming: true,
              currentCount: count,
            }));

            // For streaming arrays, we can start showing partial results
            if (Array.isArray(data) && data.length > 0) {
              // You could update UI here to show partial data
              console.log(`Parsed ${count} items so far...`);
            }
            break;

          case "complete":
            setParseProgress(null);
            setIsProcessing(false);

            if (workerError) {
              setError(workerError);
            } else if (data) {
              try {
                const schema = inferJsonSchema(data);
                const objectCount = Array.isArray(data) ? data.length : 1;

                const processed: ProcessedFile = {
                  name: currentFileRef.current?.name || "Unknown",
                  data,
                  schema,
                  size: currentFileRef.current?.size || 0,
                  objectCount,
                };

                setProcessedFile(processed);
                onFileProcessed?.(data, schema);
              } catch (schemaError) {
                setError("Failed to infer schema from parsed data");
              }
            }
            break;
        }
      };

      workerRef.current.onerror = (error) => {
        console.error("Worker error:", error);
        setError("Failed to process file due to worker error");
        setIsProcessing(false);
        setParseProgress(null);
      };
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [onFileProcessed]);

  const currentFileRef = useRef<File | null>(null);

  const processJsonFile = useCallback(
    async (file: File) => {
      setIsProcessing(true);
      setError(null);
      setParseProgress({ progress: 0, processed: 0, total: file.size });
      currentFileRef.current = file;

      try {
        if (workerRef.current) {
          // Always use worker when available
          const text = await file.text();
          const isLikelyArray = text.trim().startsWith("[");

          workerRef.current.postMessage({
            type: "parse",
            fileContent: text,
            isArray: isLikelyArray,
          });
        } else {
          // Fallback to main thread only when workers are not supported
          const text = await file.text();
          let data: unknown;

          try {
            data = JSON.parse(text);
          } catch (parseError) {
            throw new Error("Invalid JSON format");
          }

          const schema = inferJsonSchema(data);
          const objectCount = Array.isArray(data) ? data.length : 1;

          const processed: ProcessedFile = {
            name: file.name,
            data,
            schema,
            size: file.size,
            objectCount,
          };

          setProcessedFile(processed);
          onFileProcessed?.(data, schema);
          setIsProcessing(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file");
        setIsProcessing(false);
        setParseProgress(null);
      }
    },
    [onFileProcessed],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const jsonFile = files.find(
        (file) =>
          file.type === "application/json" || file.name.endsWith(".json"),
      );

      if (!jsonFile) {
        setError("Please drop a JSON file");
        return;
      }

      processJsonFile(jsonFile);
    },
    [processJsonFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processJsonFile(file);
      }
    },
    [processJsonFile],
  );

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const clearFile = useCallback(() => {
    setProcessedFile(null);
    setError(null);
    setParseProgress(null);
    clearInsights(); // Clear analysis when clearing file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [clearInsights]);

  // Add function to handle AI analysis
  const handleAnalyzeData = useCallback(async () => {
    if (!processedFile) return;

    // Convert data to sample for analysis (take first few items if array)
    const sampleData = Array.isArray(processedFile.data)
      ? (processedFile.data.slice(0, 5) as Array<Record<string, unknown>>)
      : [processedFile.data as Record<string, unknown>];

    await analyzeSchema(processedFile.schema, sampleData, processedFile.name);
  }, [processedFile, analyzeSchema]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const formatProgress = (progress: ParseProgress) => {
    if (progress.isStreaming && progress.currentCount) {
      return `Streaming... ${progress.currentCount.toLocaleString()} items`;
    }
    return `${Math.round(progress.progress)}% (${formatBytes(progress.processed)} / ${formatBytes(progress.total)})`;
  };

  return (
    <div className={cx("w-full", className)}>
      {!processedFile ? (
        <div
          className={cx(
            "border-2 border-dashed py-12 px-4 text-center transition-colors",
            isDragOver ? "border-blue-400 bg-blue-50" : "border-gray-900/80",
            isProcessing && "opacity-50 cursor-not-allowed",
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <div className="text-center">
                <p className="text-gray-600 font-medium">
                  Processing JSON file...
                </p>
                {parseProgress && (
                  <div className="mt-2">
                    <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${parseProgress.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {formatProgress(parseProgress)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div>
                <p className="text-xl font-medium text-gray-900 mb-2">
                  Drop files here
                </p>
                <p className="max-w-lg text-gray-600 mb-4">
                  We'll automatically visualize the data and infer its schema.{" "}
                  {typeof Worker !== "undefined"
                    ? "Files will be processed in the background for optimal performance"
                    : "Note: Web Workers not supported - large files may cause temporary UI freezing"}
                </p>
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className={cx(
                    "px-4 py-2 bg-blue-600 text-white hover:bg-blue-700",
                    "transition-colors font-medium",
                  )}
                >
                  Browse files
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-20">
          <div className="flex items-center justify-between">
            <div>
              <Label>Files</Label>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {processedFile.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {processedFile.objectCount.toLocaleString()} objects •{" "}
                  {formatBytes(processedFile.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAnalyzeData}
                disabled={analyzeLoading}
                className={cx(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {analyzeLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Analyzing...
                  </div>
                ) : (
                  "Analyze with AI"
                )}
              </button>
              <button
                type="button"
                onClick={clearFile}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Schema and Raw Data - Show first */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label>Data Preview</Label>
              <JsonViewer
                data={processedFile.data}
                objectCount={processedFile.objectCount}
                fileSize={processedFile.size}
              />
            </div>
            <div>
              <Label>Schema</Label>
              <SchemaInspector schema={processedFile.schema} />
            </div>
          </div>

          {/* Proactive Data Analysis - Show second */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Instant Data Overview
            </h2>
            <ProactiveDataAnalysis
              data={
                Array.isArray(processedFile.data)
                  ? (processedFile.data as Array<Record<string, unknown>>)
                  : [processedFile.data as Record<string, unknown>]
              }
              fileName={processedFile.name}
            />
          </div>

          {/* AI Analysis Results - Show last */}
          {insights && (
            <div className="space-y-6">
              {/* AI Analysis - With analyze button */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    AI Data Analysis
                  </h2>
                  <button
                    type="button"
                    onClick={handleAnalyzeData}
                    disabled={analyzeLoading}
                    className={cx(
                      "px-4 py-2 rounded-lg font-medium",
                      analyzeLoading
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700",
                    )}
                  >
                    {analyzeLoading ? "Analyzing..." : "Analyze with AI"}
                  </button>
                </div>
                {(insights || analyzeLoading || analyzeError) && (
                  <DataInsights
                    insights={insights}
                    onFieldSelect={(field) => {
                      console.log("Selected field:", field);
                      // TODO: Implement field selection behavior
                    }}
                    onVisualizationSelect={(viz) => {
                      console.log("Selected visualization:", viz);
                      // TODO: Implement visualization generation
                    }}
                    onQuestionSelect={(question) => {
                      if (processedFile && onQuestionSelect) {
                        // Convert data to the format expected by the overlay
                        const dataArray = Array.isArray(processedFile.data)
                          ? (processedFile.data as Array<
                              Record<string, unknown>
                            >)
                          : [processedFile.data as Record<string, unknown>];
                        onQuestionSelect(question, dataArray);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Analysis Error */}
          {analyzeError && (
            <div>
              <Label>Analysis Error</Label>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{analyzeError}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};
