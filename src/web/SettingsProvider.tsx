import { useCallback, useMemo, useState } from 'react';
import { loadAIConfig, saveAIConfig, type AIConfig } from './ai-providers';
import { SettingsContext } from './Settings'

export function SettingsProvider({
	children,
}: {
	children: React.ReactNode
}) {
	// 配置以 JSON 形式保存在本机 localStorage，首次渲染时读取一次。
	const [settings, setSettings] = useState<AIConfig>(loadAIConfig);

	const saveConfig = useCallback((config: AIConfig) => {
		saveAIConfig(config);
		setSettings(config);
	}, []);

	const value = useMemo(
		() => ({ settings, saveConfig }),
		[settings, saveConfig],
	);

	return (
		<SettingsContext.Provider value={value}>
			{children}
		</SettingsContext.Provider>
	);
}
