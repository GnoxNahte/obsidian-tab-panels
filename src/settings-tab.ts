import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import TabPanelsPlugin from "./main";
import { rebuildVaultCache } from "./utility/cache";

export interface TabPanelsSettings {
	codeblockKeyword: string;
    tabMarkerSyntax: string;
    showNoTabWarning: boolean;
    enableEditableTabs: boolean;
    enterToExitEditing: boolean;

    // Styling
    highlightSelectedTabName: boolean;
    // animation

    // Cache
    enableCaching: boolean;
}

export const DEFAULT_SETTINGS: TabPanelsSettings = {
	codeblockKeyword: 'tabs',
    tabMarkerSyntax: '---',
    showNoTabWarning: true,
    enableEditableTabs: false,
    enterToExitEditing: true,

    // Styling
    highlightSelectedTabName: true,

    // Cache
    enableCaching: false,
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
                .setPlaceholder("tabs")
                .onChange(async (value) => {
                    settings.codeblockKeyword = value.trim();
                    await this.plugin.saveSettings();
                })
            )

        const tabMarkerDesc = new DocumentFragment();

        const getSampleSyntaxText = () => `${settings.tabMarkerSyntax || '---'} New Tab`;

        tabMarkerDesc.detach();
        tabMarkerDesc.appendText("Set the marker format that defines a new tab in your markdown");
        tabMarkerDesc.appendChild(createEl("br"))
        tabMarkerDesc.appendText("Example: ")
        const sampleCode = createEl("code", {text: getSampleSyntaxText()});
        tabMarkerDesc.appendChild(sampleCode);
        const tabMarkerNoInputWarning = createDiv({text: "No syntax detected. Default to ---", cls: "mod-warning"});
        tabMarkerDesc.appendChild(tabMarkerNoInputWarning);

        // Show warning if tabMarkerSyntax is falsy (e.g. empty)
        const updateTabMarkerWarningDisplay = () => tabMarkerNoInputWarning.style.display = settings.tabMarkerSyntax ? "none" : "block";
        
        updateTabMarkerWarningDisplay();

        new Setting(containerEl)
            .setName("Tab marker syntax")
            .setDesc(tabMarkerDesc)
            .addText(text => text
                .setValue(settings.tabMarkerSyntax)
                .setPlaceholder("---, ===, tabs:")
                .onChange(async (value) => {
                    settings.tabMarkerSyntax = value.trim();
                    await this.plugin.saveSettings();
                    
                    // === Update UI ===
                    sampleCode.textContent = getSampleSyntaxText();
                    updateTabMarkerWarningDisplay();
                })
            )

        new Setting(containerEl)
            .setName("Show no tab warning")
            .addToggle(toggle => toggle
                .setValue(settings.showNoTabWarning)
                .onChange(async (value) => {
                    settings.showNoTabWarning = value;
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
        
        const enableEditableTabsDescription = new DocumentFragment();
        enableEditableTabsDescription.appendText("Allows editing tabs by clicking on it.\n");
        enableEditableTabsDescription.appendChild(createEl("a", { text: " Learn more", href: "https://github.com/GnoxNahte/obsidian-tab-panels/tree/main#editable-tabs-experimental"}));
        enableEditableTabsDescription.appendChild(createEl("div", {text: "Since this feature will modify the vault and is experimental, it's recommended to have a backup of the vault.", cls: "mod-warning"}));
        enableEditableTabsDescription.appendChild(createEl("div", {text: "It generally works well but may behave unexpectedly depending on your plugins and theme.", cls: "mod-warning"}));

        new Setting(containerEl)
            .setName("Enable editable tabs")
            .setDesc(enableEditableTabsDescription)
            .addToggle(toggle => toggle
                .setValue(settings.enableEditableTabs)
                .onChange(async (value) => {
                    settings.enableEditableTabs = value;
                    new Notice("Reload the vault to see changes", 5000);
                    await this.plugin.saveSettings();
                    this.display();
                })
            )

        if (settings.enableEditableTabs) {
            new Setting(containerEl)
            .setName("Enter to exit editing")
            .setDesc("When enabled, the Enter key will close the text field. Use Shift + Enter for a new line.")
            .addToggle(toggle => toggle
                .setValue(settings.enterToExitEditing)
                .onChange(async (value) => {
                    settings.enterToExitEditing = value;
                    await this.plugin.saveSettings();
                })
            )
        }
        
        const enableCachingDescription = new DocumentFragment();
        enableCachingDescription.appendText("Add additional information to Obsidian's cache.\n")
        enableCachingDescription.appendChild(createEl("a", { text: " Learn more", href: "https://github.com/GnoxNahte/obsidian-tab-panels/tree/main#cache-experimental"}))
        enableCachingDescription.appendChild(createEl("br"))
        enableCachingDescription.appendText("This allows backlinks, outgoing links, headings, tags showing on the sidebar. Also supports renaming files, tags.")
        enableCachingDescription.appendChild(createEl("br"))
        enableCachingDescription.appendText("It should also allow other plugins that uses the cache like Dataview")
        
        const enableCachingWarning = createEl("div", {text: "Since this is this is still experimental. ", cls: "mod-warning", parent: enableCachingDescription});
        const enableCachingWarningList = createEl("ul", {parent: enableCachingWarning});
        const enableCachingReport = enableCachingWarningList.appendChild(createEl("li", { text: "Some things might not work as expected. Report issues "}))
        enableCachingReport.appendChild(createEl("a", {text: "here", href: "https://github.com/GnoxNahte/obsidian-tab-panels/issues/new/choose"}))
        enableCachingWarningList.appendChild(createEl("li", { text: "However, even if things go wrong, it shouldn't affect your files."}));
        enableCachingWarningList.appendChild(createEl("li", { text: "You can always revert it by disabling caching then reloading Obsidian"}));

        new Setting(containerEl)
            .setName("Enable caching")
            .setDesc(enableCachingDescription)
            .addToggle(toggle => toggle
                .setValue(settings.enableCaching)
                .onChange(async (value) => {
                    settings.enableCaching = value;
                    await this.plugin.saveSettings();
                    this.display();
                    if (settings.enableCaching) {
                        await this.plugin.loadCacheFromDb();
                        new Notice("Tab Panels: Loading cache...", 3000)
                    }
                })
            )

        if (settings.enableCaching) {
            const rebuildCacheWarning = new DocumentFragment();
            rebuildCacheWarning.appendText("This is rebuilds the cache if you encounter syncing issues. ");
            rebuildCacheWarning.appendChild(createEl("div", {text: "It might take sometime depending on the size of your vault", cls: "mod-warning"}));
        
            new Setting(containerEl)
                .setName("Rebuild cache")
                .setDesc(rebuildCacheWarning)
                .addButton(button => button
                    .setButtonText("Rebuild")
                    .setClass("mod-warning")
                    .onClick(async (evt) => {
                        await rebuildVaultCache(this.plugin);
                    })
                )
        }
        
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
