import { createContext } from 'react';

type Settings = {
	apiKey: string;
	model: string;
};

type SettingsContextValue = {
  settings: Settings;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);
