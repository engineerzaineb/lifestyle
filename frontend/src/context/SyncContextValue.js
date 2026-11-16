import { createContext } from "react";

// Contexte de synchronisation (séparé du Provider pour Fast Refresh)
export const SyncContext = createContext(null);
