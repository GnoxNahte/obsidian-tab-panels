import { App, PluginSettingTab, Setting } from "obsidian";
import TabPanelsPlugin from "./main";

export interface TabPanelsSettings {
	codeblockKeyword: string;
    // animation
}

export const DEFAULT_SETTINGS: TabPanelsSettings = {
	codeblockKeyword: 'tab-panels'
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
	}
}
