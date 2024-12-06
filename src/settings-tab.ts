import { App, PluginSettingTab, Setting } from "obsidian";
import TabPanelsPlugin from "./main";
import { DataCache, rebuildVaultCache } from "./utility/cache";

export interface TabPanelsSettings {
	codeblockKeyword: string;
    hideNoTabWarning: boolean;

    // Styling
    highlightSelectedTabName: boolean;
    // animation

    // Cache
    enableCaching: boolean;
    dataCache: DataCache;
}

export const DEFAULT_SETTINGS: TabPanelsSettings = {
	codeblockKeyword: 'tab-panels',
    hideNoTabWarning: false,

    // Styling
    highlightSelectedTabName: true,

    // Cache
    enableCaching: false,
    dataCache: {},
}

export class TabPanelsTab extends PluginSettingTab {
	plugin: TabPanelsPlugin;

	constructor(app: App, plugin: TabPanelsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

        // To shorten the code
        const settings = this.plugin.settings;

		containerEl.empty();

        new Setting(containerEl)
            .setName("Codeblock keyword")
            .addText(text => text
                .setValue(settings.codeblockKeyword)
                .setPlaceholder("tab-panels")
                .onChange(async (value) => {
                    settings.codeblockKeyword = value.trim();
                    await this.plugin.saveSettings();
                })
            )

        new Setting(containerEl)
            .setName("Hide no tab warning")
            .addToggle(toggle => toggle
                .setValue(settings.hideNoTabWarning)
                .onChange(async (value) => {
                    settings.hideNoTabWarning = value;
                    await this.plugin.saveSettings();
                })
            )

        new Setting(containerEl)
            .setHeading()
            .setName("Styling");
        
        new Setting(containerEl)
            .setName("Highlight selected tab name")
            .addToggle(toggle => toggle
                .setValue(settings.highlightSelectedTabName)
                .onChange(async (value) => {
                    settings.highlightSelectedTabName = value;
                    await this.plugin.saveSettings();
                })
            )

        new Setting(containerEl)
            .setHeading()
            .setName("Experimental");
        
        const enableCachingDescription = new DocumentFragment();
        enableCachingDescription.appendText("Add additional information to Obsidian's cache. This allows backlinks and outgoing links. ")
        enableCachingDescription.appendChild(createEl("a", { text: "Learn more", href: "https://github.com/GnoxNahte/obsidian-tab-panels?tab=readme-ov-file#-caching"}))
        const enableCachingWarning = createEl("div", {text: "Since this is this is still experimental. ", cls: "mod-warning", parent: enableCachingDescription});
        const enableCachingWarningList = createEl("ul", {parent: enableCachingWarning});
        enableCachingWarningList.appendChild(createEl("li", { text: "It'll slightly increase load times"}))
        enableCachingWarningList.appendChild(createEl("li", { text: "Caching might get out of sync."}));
        enableCachingDescription.appendChild(createDiv({text: "To completely remove caching from this plugin, do the steps 1-3 in the rebuild instructions"}))
        // enableCachingDescription.appendChild(enableCachingWarning);
        // enableCachingDescription.appendChild(createEl("div", {text: "Since it's just released, there might be some bugs too.", cls: "mod-warning"}));

        new Setting(containerEl)
            .setName("Enable caching")
            .setDesc(enableCachingDescription)
            .addToggle(toggle => toggle
                .setValue(settings.enableCaching)
                .onChange(async (value) => {
                    settings.enableCaching = value;
                    await this.plugin.saveSettings();
                })
            )

        const rebuildCacheWarning = new DocumentFragment();
        rebuildCacheWarning.appendChild(createEl("div", {text: "This is rebuilds the cache if you encounter syncing issues. ", cls: "mod-warning"}));
        const rebuildCachingWarning = createEl("div", {text: "To do a full reset:", cls: "mod-warning", parent: rebuildCacheWarning});
        const rebuildCachingWarningList = createEl("ol", {parent: rebuildCachingWarning});
        rebuildCachingWarningList.appendChild(createEl("li", { text: "Disable caching"}))
        rebuildCachingWarningList.appendChild(createEl("li", { text: "Go to Obsidian's \"File and links\" section in the settings"}));
        rebuildCachingWarningList.appendChild(createEl("li", { text: "Click on rebuild"}));
        rebuildCachingWarningList.appendChild(createEl("li", { text: "Enable caching"}));
        rebuildCachingWarningList.appendChild(createEl("li", { text: "Click on the Rebuild button ->"}));
    
        new Setting(containerEl)
            .setName("Rebuild cache")
            .setDesc(rebuildCacheWarning)
            .addButton(button => button
                .setButtonText("Rebuild")
                .setClass("mod-warning")
                .onClick(async (evt) => {
                    await rebuildVaultCache(settings.dataCache, this.plugin);
                })
            )
            
        const additionalInfo = new DocumentFragment();
        additionalInfo.appendText("Reload the app to apply changes");
        additionalInfo.appendChild(createEl("br"))
        additionalInfo.appendChild(createEl("br"))
        additionalInfo.appendText("Found bugs or want a feature? ");
        additionalInfo.appendChild(createEl("a", {text: "Create a GitHub issue!", href: "https://github.com/GnoxNahte/obsidian-tab-panels/issues/new/choose"}))

        new Setting(containerEl)
            .setDesc(additionalInfo)
	}
}
