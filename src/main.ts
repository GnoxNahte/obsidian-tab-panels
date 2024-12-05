import { CachedMetadata, Plugin, TAbstractFile, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, TabPanelsSettings, TabPanelsTab } from './settings-tab';
import { TabPanelsBuilder } from './tab-panels';
import { updateCacheFromSettings, updateCacheFromFile, updateCacheOnFileRename, updateCacheOnFileDelete } from './utility/cache';

export default class TabPanelsPlugin extends Plugin {
	settings: TabPanelsSettings;
	tabPanelBuilder: TabPanelsBuilder;

	// Event handlers
	onMetadataCacheChangedHandler = this.onMetadataCacheChanged.bind(this);
	onFileRenamedHandler = this.onFileRenamed.bind(this);
	onFileDeleteHandler = this.onFileDelete.bind(this);
	debug_outputMetadataCacheHandler = this.debug_outputMetadataCache.bind(this);

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

			this.app.vault.on("rename", this.onFileRenamedHandler);
			this.app.vault.on("delete", this.onFileDeleteHandler);
			
			// Debug caching 
			this.app.metadataCache.on("changed", this.debug_outputMetadataCacheHandler);
		}

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
		this.app.metadataCache.off("changed", this.debug_outputMetadataCacheHandler);
		
		this.app.vault.off("rename", this.onFileRenamedHandler);
		this.app.vault.off("delete", this.onFileDeleteHandler);
	}

	async onMetadataCacheChanged(file: TFile, data: string, cache: CachedMetadata) {
		await updateCacheFromFile(this, file, data);
	}

	async onFileRenamed(file: TAbstractFile, oldPath: string) {
		console.log("FILE RENAMED:\nOLD:", oldPath, "\nNew: ", file.path, "\n", file);
		updateCacheOnFileRename(this, file, oldPath);
	}

	async onFileDelete(file: TAbstractFile) {
		console.log("FILE DELETED:\nFile:", file.path, "\n", file);
		updateCacheOnFileDelete(this, file)
	}

	debug_outputMetadataCache(file: TFile) {
		console.log("Cache:\n", this.app.metadataCache.getCache(file.path), 
					"\nResolved links", this.app.metadataCache.resolvedLinks, 
					"\nUnresolved ", this.app.metadataCache.unresolvedLinks)
	}
}
