import { MarkdownPostProcessorContext, MarkdownRenderer } from "obsidian";
import TabPanelsPlugin from "./main";


export class TabPanelsBuilder {
    plugin: TabPanelsPlugin;

    constructor(plugin: TabPanelsPlugin) {
        this.plugin = plugin;
    }

    create(markdown: string, container: HTMLElement, ctx: MarkdownPostProcessorContext) {
        container.classList.add("tab-panel-container");

        const tabScrollContainer = createEl("div", { cls: "tab-scroll-container", parent: container });
        const tabsContainer = createEl("ul", { cls: "tab-container", parent: tabScrollContainer });
        const contentContainer = createDiv({ cls: "content-container", parent: container });

        // Split the different tabs
        // 
        // Breakdown of the regex (Referenced from regex101.com)
        // 1. "^": Asserts start of line
        // 2. "[^\S\r\n]*": Matches zero and unlimited spaces, tabs and any other whitespace characters (e.g. \v, \f, Zero-width space - \u200B). 
        //                  Why never use \s: It matches \n and \r
        // 3. "---"
        // 4. "[^\S\r\n]*": Same as 2.
        // 5. "(.*)": Captures all characters (except line terminators like \n)
        //
        // Note got "[^\S\r\n]*" from https://stackoverflow.com/a/17752989
        const tabMatches = Array.from(markdown.matchAll(/^[^\S\r\n]*---[^\S\r\n]*(.*)/gm));
        
        if (tabMatches.length === 0) {
            tabScrollContainer.style.display = "none";

            const content = createDiv({ parent: contentContainer, cls: "selected" })
            MarkdownRenderer.render(this.plugin.app, markdown, content, ctx.sourcePath, this.plugin);
            
            if (!this.plugin.settings.hideNoTabWarning) {
                const warning = "> [!WARNING] No tabs created\n> To create tabs, use \`--- Tab Name\`. \n>For more info: [GitHub README](https://github.com/GnoxNahte/obsidian-tab-panels)\n>To hide this popup: Settings > Hide no tab warning"
                MarkdownRenderer.render(this.plugin.app, warning, content, ctx.sourcePath, this.plugin);
            }
            return;
        }
        
        let defaultTab = 0;

        for (let i = 0; i < tabMatches.length; i++) {
            const tabMatch = tabMatches[i];
            // Create tab
            let tabText = tabMatch[1];
            const getDefaultPosRegex = tabText.match(/\(default\)\s*$/i);
            if (getDefaultPosRegex) {
                defaultTab = i;
                tabText = tabText.substring(0, getDefaultPosRegex.index);
            }
            const tab = createEl("li", { cls: "tab", parent: tabsContainer });
            tab.addEventListener("click", () => this.switchTab(i, tabsContainer, contentContainer))

            createEl("span", { parent: tab, text: tabText.trim() })
            
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