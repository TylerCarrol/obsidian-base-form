import { Notice, Plugin } from 'obsidian';
import { BASE_FORM_VIEW_TYPE, BaseFormView } from './form/form-view';
import {
	DEFAULT_SETTINGS,
	MyPluginSettings,
	SampleSettingTab,
} from './settings';
import { getFormViewOptions } from './form/view-options';

export default class BaseFormPlugin extends Plugin {
	settings: MyPluginSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MyPluginSettings>,
		);

		this.addSettingTab(new SampleSettingTab(this.app, this));

		const registered = this.registerBasesView(BASE_FORM_VIEW_TYPE, {
			name: 'Form',
			icon: 'lucide-clipboard-list',
			factory: (controller, containerEl) =>
				new BaseFormView(controller, containerEl),
			options: getFormViewOptions,
		});

		if (!registered) {
			new Notice('Enable bases to use the form view.');
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
