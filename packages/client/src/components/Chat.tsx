import { useCompletion } from "@ai-sdk/react";

export default function Chat() {
  const {
    completion,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useCompletion({
    api: "/api/chat",
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">AI Chat</h1>

      <div className="bg-gray-50 border rounded-lg p-4 mb-4 min-h-[200px]">
        {completion ? (
          <div className="whitespace-pre-wrap text-gray-700">{completion}</div>
        ) : (
          <div className="text-gray-400 italic">
            Start a conversation by typing a message below...
          </div>
        )}

        {isLoading && (
          <div className="flex items-center mt-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
            AI is thinking...
          </div>
        )}

        {error && (
          <div className="mt-2 text-red-600 bg-red-50 p-2 rounded">
            Error: {error.message}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
