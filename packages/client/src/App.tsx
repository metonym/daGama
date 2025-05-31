import Chat from "@components/Chat";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Query from "./components/Query";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Chat />
      <Query />
    </QueryClientProvider>
  );
}
