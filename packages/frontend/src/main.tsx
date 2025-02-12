import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { asyncQueryStorage } from "./persister.ts";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Provider } from "./components/ui/provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      gcTime: +Infinity,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: asyncQueryStorage,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister }}
    >
      <Provider>
        <App />
      </Provider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
