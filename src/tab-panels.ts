import { MarkdownPostProcessorContext, MarkdownRenderer } from "obsidian";
import TabPanelsPlugin from "./main";


export class TabPanelsBuilder {
    plugin: TabPanelsPlugin;

    constructor(plugin: TabPanelsPlugin) {
        this.plugin = plugin;
    }

    create(markdown: string, container: HTMLElement, ctx: MarkdownPostProcessorContext) {
        container.classList.add("tab-panel-container");

        const tabsContainer = createEl("ul", { cls: "tab-container", parent: container });
        const contentContainer = createDiv({ cls: "content-container", parent: container });

        // Split the different tabs
        const tabMatches = Array.from(markdown.matchAll(/^\s*---\s*(.*\S)*/gm));

        let defaultTab = 0;
        
        for (let i = 0; i < tabMatches.length; i++) {
            const tabMatch = tabMatches[i];
            // Create tab
            let tabText = tabMatch[1];
            const isDefaultPos = tabText.indexOf("(default)");
            if (isDefaultPos != -1) {
                console.log("Hit: " + tabText + " | " + isDefaultPos)
                defaultTab = i;
                tabText = tabText.substring(0, isDefaultPos);
            }
            const tab = createEl("li", { cls: "tab", parent: tabsContainer, text: tabText.trim() });
            tab.addEventListener("click", () => this.switchTab(i, tabsContainer, contentContainer))

            
            const contentMarkdownEnd = (i < tabMatches.length - 1) ? tabMatches[i + 1].index : undefined;
            let contentMarkdown = markdown.substring(tabMatch.index, contentMarkdownEnd);
            contentMarkdown = contentMarkdown.substring(contentMarkdown.indexOf("\n"))
            
            const content = createDiv({ parent: contentContainer })
            MarkdownRenderer.render(this.plugin.app, contentMarkdown, content, ctx.sourcePath, this.plugin);
        }

        this.switchTab(defaultTab, tabsContainer, contentContainer);
    }

    switchTab(tabIndex: number, tabsContainer: HTMLUListElement, contentContainer: HTMLDivElement) {
        const selectedClass = "selected"

        // Set all tabs to be hidden
        const tabs = tabsContainer.children;
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            tab.classList.remove(selectedClass)
        }

        // Set all content to be hidden
        const contents = contentContainer.children;
        for (let i = 0; i < contents.length; i++) {
            const content = contents[i];
            content.classList.remove(selectedClass)
        }
        // Remove hidden from active tab
        tabs[tabIndex].classList.add(selectedClass);
        contents[tabIndex]?.classList.add(selectedClass);
    }
}