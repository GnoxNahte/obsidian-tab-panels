import { App, PluginSettingTab, Setting } from "obsidian";
import TabPanelsPlugin from "./main";

export interface TabPanelsSettings {
	codeblockKeyword: string;
    hideNoTabWarning: boolean;

    // Styling
    highlightSelectedTabName: boolean;
    // animation
}

export const DEFAULT_SETTINGS: TabPanelsSettings = {
	codeblockKeyword: 'tab-panels',
    hideNoTabWarning: false,

    // Styling
    highlightSelectedTabName: true,
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
                    settings.codeblockKeyword = value;
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
            
        const additionalInfo = new DocumentFragment();
        additionalInfo.appendText("Reload the app to apply changes");
        additionalInfo.appendChild(createEl("br"))
        additionalInfo.appendChild(createEl("br"))
        additionalInfo.appendText("Found bugs or want a feature? ");
        additionalInfo.appendChild(createEl("a", {text: "Create a GitHub issue!", href: "https://github.com/GnoxNahte/obsidian-tab-panels/issues/new"}))

        new Setting(containerEl)
            .setDesc(additionalInfo)
	}
}
