import { CachedMetadata, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, TabPanelsSettings, TabPanelsTab } from './settings-tab';
import { TabPanelsBuilder } from './tab-panels';
import { updateCacheFromDb, updateCacheFromFile, updateCacheOnFileRename, updateCacheOnFileDelete } from './utility/cache';
import * as localforage from 'localforage';

export default class TabPanelsPlugin extends Plugin {
	settings: TabPanelsSettings;
	tabPanelBuilder: TabPanelsBuilder;

	isCacheLoaded: boolean;

	// Event handlers
	// Do this to unsubscribe the event when unloading plugin
	onMetadataCacheChangedHandler = this.onMetadataCacheChanged.bind(this);
	loadCacheFromDbHandler = this.loadCacheFromDb.bind(this);
	debug_outputMetadataCacheHandler = this.debug_outputMetadataCache.bind(this);

	async onload() {
		this.isCacheLoaded = false;
		await this.loadSettings();

		this.tabPanelBuilder = new TabPanelsBuilder(this);
		this.registerMarkdownCodeBlockProcessor(
			this.settings.codeblockKeyword, 
			(src, el, ctx)=>this.tabPanelBuilder.create(src, el, ctx)
		);

		// Caching
		if (this.settings.enableCaching) {
			// AppId is a unique id for each vault. Undocumented but plugins like Dataview and OmniSearch use it as an identifier for the database, separating each vault.
			// NOTE: It's only available on Desktop (Not sure)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const id = (this.app as any).appId || "shared";
			// Setup db
			localforage.config({
				name: `tab-panels/cache/${id}`
			})

			this.app.workspace.onLayoutReady(this.loadCacheFromDbHandler);
			this.app.metadataCache.on("changed", this.onMetadataCacheChangedHandler);

			this.app.vault.on("rename", updateCacheOnFileRename);
			this.app.vault.on("delete", updateCacheOnFileDelete);
			
			// Debug caching 
			// this.app.metadataCache.on("changed", this.debug_outputMetadataCacheHandler);
		}

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TabPanelsTab(this.app, this));
	}

	async loadSettings() {
		const rawSetting = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		this.settings = rawSetting;
		
		// ===== Handle upgrading settings =====
		// Switch hideNoTabWarning to showNoTabWarning to make it clearer. Changed in 1.1.0
		if (rawSetting.hideNoTabWarning) {
			this.settings.showNoTabWarning = !rawSetting.hideNoTabWarning
		}

		await this.saveSettings();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload(): void {
		this.app.metadataCache.off("changed", this.onMetadataCacheChangedHandler);
		// this.app.metadataCache.off("changed", this.debug_outputMetadataCacheHandler);
		
		this.app.vault.off("rename", updateCacheOnFileRename);
		this.app.vault.off("delete", updateCacheOnFileDelete);
	}

	async loadCacheFromDb() {
		await updateCacheFromDb(this.app.metadataCache, this.app);
		this.isCacheLoaded = true;
	}

	async onMetadataCacheChanged(file: TFile, data: string, cache: CachedMetadata) {
		if (!this.isCacheLoaded)
			return;

		await updateCacheFromFile(this, file, data, cache);
	}

	debug_outputMetadataCache(file: TFile, data: string, cache: CachedMetadata) {
		console.log("File: ", file.path,
					"Cache:\n", this.app.metadataCache.getCache(file.path), 
					"\nResolved links", this.app.metadataCache.resolvedLinks, 
					"\nUnresolved ", this.app.metadataCache.unresolvedLinks)

		// localforage.iterate((cache, path) => {
		// 	console.log("PATH:", path, "\nCACHE:", cache)
		// })
		// console.log("RAW CACHE: ", JSON.stringify(cache, null, 2))
	}
}
