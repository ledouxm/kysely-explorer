import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { asyncQueryStorage } from "./persister.ts";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ColorModeProvider } from "./components/ui/color-mode.tsx";
import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { theme } from "./theme";

export const system = createSystem(defaultConfig, {
  theme,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
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
      <ChakraProvider value={system}>
        <ColorModeProvider defaultTheme="dark">
          <App />
        </ColorModeProvider>
      </ChakraProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
);
