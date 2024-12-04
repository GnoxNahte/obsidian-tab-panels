import { CachedMetadata, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, TabPanelsSettings, TabPanelsTab } from './settings-tab';
import { TabPanelsBuilder } from './tab-panels';
import { updateCacheFromSettings, updateCacheFromFile } from './utility/cache';

export default class TabPanelsPlugin extends Plugin {
	settings: TabPanelsSettings;
	tabPanelBuilder: TabPanelsBuilder;
	onMetadataCacheChangedHandler = this.onMetadataCacheChanged.bind(this);

	async onload() {
		console.log("Loading tab panels plugin")
		await this.loadSettings();

		this.tabPanelBuilder = new TabPanelsBuilder(this);
		this.registerMarkdownCodeBlockProcessor(
			this.settings.codeblockKeyword, 
			(src, el, ctx)=>this.tabPanelBuilder.create(src, el, ctx)
		);

		// Caching
		if (this.settings.enableCaching) {
			this.app.workspace.onLayoutReady(async () => updateCacheFromSettings(this.settings.cacheData, this.app.metadataCache, this.app));
			this.app.metadataCache.on("changed", this.onMetadataCacheChangedHandler);
			
			// this.app.metadataCache.off("changed", this.onMetadataCache)
		}

		// Debug caching 
		this.app.metadataCache.on("changed", async (file, data, cache) => 
			console.log("Cache:\n", this.app.metadataCache.getCache(file.path), 
						"\nResolved links", this.app.metadataCache.resolvedLinks, 
						"\nUnresolved ", this.app.metadataCache.unresolvedLinks)
		);

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TabPanelsTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload(): void {
		console.log("Unloading tab panels plugin")
		this.app.metadataCache.off("changed", this.onMetadataCacheChangedHandler);
	}

	async onMetadataCacheChanged(file: TFile, data: string, cache: CachedMetadata) {
		await updateCacheFromFile(this, file, data);
	}
}
