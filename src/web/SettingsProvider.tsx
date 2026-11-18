import { useCallback, useMemo, useState } from 'react';
import { SettingsContext } from './Settings'

const API_KEY_STORAGE = "apiKey";
const MODEL_STORAGE = "model";

export function SettingsProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const [apiKey, setApiKeyState] = useState(
		() => localStorage.getItem(API_KEY_STORAGE) ?? ""
	);
	const [model, setModelState] = useState(
		() => localStorage.getItem(MODEL_STORAGE) ?? "gpt-3.5-turbo"
	);

	const setApiKey = useCallback((value: string) => {
		setApiKeyState(value);
		localStorage.setItem(API_KEY_STORAGE, value);
	}, []);

	const setModel = useCallback((value: string) => {
		setModelState(value);
		localStorage.setItem(MODEL_STORAGE, value);
	}, []);

	const value = useMemo(
		() => ({
			settings: { apiKey, model },
			setApiKey,
			setModel,
		}),
		[apiKey, model, setApiKey, setModel]
	);

	return (
		<SettingsContext.Provider value={value}>
			{children}
		</SettingsContext.Provider>
	);
}
