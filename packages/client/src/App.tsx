import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Intro } from "./components/Intro";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Intro />
    </QueryClientProvider>
  );
}
