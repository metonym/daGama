import { trpcClient } from "@/api-client";
import { useQuery } from "@tanstack/react-query";

export default function Query() {
  const query = useQuery({
    queryKey: ["todos"],
    queryFn: () => trpcClient.greet.query("query"),
    staleTime: Number.POSITIVE_INFINITY,
  });

  return (
    <div
      className={[
        "font-semibold text-avocado-600",
        query.isPending && "text-avocado-500",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {query.isPending ? (
        <p>Loading...</p>
      ) : query.isError ? (
        <p>Error: {query.error.message}</p>
      ) : query.isSuccess ? (
        query.data.message
      ) : null}
    </div>
  );
}
