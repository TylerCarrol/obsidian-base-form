import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian';
import MyPlugin from './main';

export interface BaseFormSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: BaseFormSettings = {
	mySetting: 'default',
};

export class BaseFormSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: 'Settings #1',
				desc: "It's a secret",
				control: {
					type: 'text',
					key: 'mySetting',
					placeholder: 'Enter your secret',
				},
			},
		];
	}
}
