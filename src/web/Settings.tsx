import { createContext } from 'react';
import type { AIConfig } from './ai-providers';

export type SettingsContextValue = {
  settings: AIConfig;
  saveConfig: (config: AIConfig) => void;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);
