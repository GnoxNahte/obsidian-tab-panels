import { MarkdownPostProcessorContext, MarkdownRenderer } from "obsidian";
import TabPanelsPlugin from "./main";

export class TabPanelsBuilder {
    plugin: TabPanelsPlugin;

    constructor(plugin: TabPanelsPlugin) {
        this.plugin = plugin;
    }

    create(markdown: string, container: HTMLElement, ctx: MarkdownPostProcessorContext) {
        container.classList.add("tab-panel-container");

        if (this.plugin.settings.highlightSelectedTabName) {
            container.classList.add("highlight-selected-tab-name");
        }

        const tabScrollContainer = createEl("div", { cls: "tab-scroll-container", parent: container });
        const tabsContainer = createEl("ul", { cls: "tab-container", parent: tabScrollContainer });
        const contentContainer = createDiv({ cls: "content-container", parent: container });

        // Split the different tabs
        // 
        // Breakdown of the regex (Referenced from regex101.com)
        // 1. "^": Asserts start of line
        // 2. "[^\S\r\n]*": Matches zero and unlimited spaces, tabs and any other whitespace characters (e.g. \v, \f, Zero-width space - \u200B). 
        //                  Why never use \s: It matches \n and \r
        // 3. "---": match "---"
        // 4. "[^\S\r\n]*": Same as 2.
        // 5. "(.*)": Captures all characters (except line terminators like \n)
        //
        // Note got "[^\S\r\n]*" from https://stackoverflow.com/a/17752989
        const getTabsRegex = new RegExp(`^[^\\S\r\n]*${this.plugin.settings.tabMarkerSyntax}[^\\S\r\n]*(.*)`, 'gm');
        const tabMatches = Array.from(markdown.matchAll(getTabsRegex));
        
        // If can't find any matches, 
        // Just render the content without any tabs and return
        if (tabMatches.length === 0) {
            tabScrollContainer.classList.add("hide-container")

            const content = createDiv({ parent: contentContainer, cls: "selected" })
            MarkdownRenderer.render(this.plugin.app, markdown, content, ctx.sourcePath, this.plugin);
            
            if (this.plugin.settings.showNoTabWarning) {
                const warning = "> [!WARNING] No tabs created\n> To create tabs, use `--- Tab Name`. \n>For more info: [GitHub README](https://github.com/GnoxNahte/obsidian-tab-panels)\n>To hide this popup: Settings > Hide no tab warning"
                MarkdownRenderer.render(this.plugin.app, warning, content, ctx.sourcePath, this.plugin);
            }
            return;
        }
        
        let defaultTab = 0;
        // Might be different from tabMatches.length as there might be nested tab panels
        // Incrementing at the start of the loop so start at -1.
        let tabIndex = -1; 

        for (let i = 0; i < tabMatches.length; i++) {
            ++tabIndex;

            // === Create tab ===
            // Get tab title
            let tabText = tabMatches[i][1];
            
            // Set default tab
            const getDefaultPosRegex = tabText.match(/\(default\)\s*$/i);
            if (getDefaultPosRegex) {
                defaultTab = tabIndex;
                tabText = tabText.substring(0, getDefaultPosRegex.index);
            }
            const tab = createEl("li", { cls: "tab", parent: tabsContainer });

            const currTabIndex = tabIndex; // If pass in tabIndex directly, it'll keep returning the number of tabs 
            tab.addEventListener("click", () => this.switchTab(currTabIndex, tabsContainer, contentContainer))
            MarkdownRenderer.render(this.plugin.app, tabText, tab, ctx.sourcePath, this.plugin);

            // === Create content ===
            const getMarkdown = (removeTab: boolean): string => {
                // Get where the content for this markdown ends
                // If 
                // - is NOT last tab, get the start of the next tab
                // - is last tab, get until the end of the string
                const contentMarkdownEnd = (i < tabMatches.length - 1) ? tabMatches[i + 1].index : markdown.length;
                const contentMarkdown = markdown.substring(tabMatches[i].index ?? 0, contentMarkdownEnd);
                // Remove the first line ("--- Tab Name")
                if (removeTab)
                    return contentMarkdown.substring(contentMarkdown.indexOf("\n"));
                else
                    return contentMarkdown;
            }
            
            let resultMarkdown = getMarkdown(true);

            // If codeblocks haven't complete, might be nesting tab panels
            let count = 0;
            do {
                ++count;
                // Check for any ``` OR ~~~, allowing any space before it.
                const codeblocks = resultMarkdown.match(/^ *~{3}|`{3}/gm);
                const hasTrailingCodeblocks = codeblocks !== null && codeblocks.length % 2 === 1;

                if (hasTrailingCodeblocks && i + 1 < tabMatches.length) {
                    ++i;
                    resultMarkdown += getMarkdown(false);
                    continue;
                }
                else {
                    break;
                }
            } while (count < 20)
            
            const content = createDiv({ parent: contentContainer });
            MarkdownRenderer.render(this.plugin.app, resultMarkdown, content, ctx.sourcePath, this.plugin);
        }

        this.switchTab(defaultTab, tabsContainer, contentContainer, true);
    }

    switchTab(tabIndex: number, tabsContainer: HTMLUListElement, contentContainer: HTMLDivElement, isSetup = false) {
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
        const selectedTab = tabs[tabIndex] as HTMLElement;
        // Remove hidden from active tab
        selectedTab.classList.add(selectedClass); 
        contents[tabIndex].classList.add(selectedClass);
        
        if (!isSetup || tabIndex === 0)
            return;

        // === Scroll to the default (selected) tab ===
        const scrollElement = tabsContainer.parentElement;
        if (scrollElement === null) {
            console.error("Tab Panels: Cannot find scroll element");
            return;
        }
        
        // TODO: Find a better solution than setting a timeout
        // Set the scroll pos
        function SetScrollPos() {
            // Need a timeout as sometimes it hasn't been fully loaded yet
            setTimeout(() => {
                if (tabsContainer.parentElement === null)
                    return;

                const targetedPos = selectedTab.offsetLeft;

                tabsContainer.parentElement.scrollLeft = targetedPos - 35;
                // When it hasn't been rendered, the scrollLeft value won't be set and stay at 0
                // Should have a better solution
                if (tabsContainer.parentElement.scrollLeft === 0) {
                    SetScrollPos();
                }
            }, 100);
        }

        SetScrollPos();
    }
}