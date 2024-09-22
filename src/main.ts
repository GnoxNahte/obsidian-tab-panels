import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, TabPanelsSettings, TabPanelsTab } from './settings-tab';
import { TabPanelsBuilder } from './tab-panels';

export default class TabPanelsPlugin extends Plugin {
	settings: TabPanelsSettings;
	tabPanelBuilder: TabPanelsBuilder;

	async onload() {
		await this.loadSettings();
		
		this.tabPanelBuilder = new TabPanelsBuilder(this);
		this.registerCodeBlock(this.settings.codeblockKeyword);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TabPanelsTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	registerCodeBlock(keyword: string) {
		this.registerMarkdownCodeBlockProcessor(keyword, (a,b,c)=>this.tabPanelBuilder.create(a,b,c));
	}
}
