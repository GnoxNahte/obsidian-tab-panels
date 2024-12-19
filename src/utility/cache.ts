/**
 * Credits: This base for the code is adapted from the HTML Tabs plugin.
 * Original source: https://github.com/ptournet/obsidian-html-tabs
 * Reference files:
 * - src/util/cache.ts
 * - src/util/parsing.ts
 */

import * as localforage from "localforage";
import { App, CachedMetadata, CacheItem, EmbedCache, FootnoteCache, HeadingCache, LinkCache, Loc, MetadataCache, Notice, Pos, ReferenceCache, SectionCache, TAbstractFile, TagCache, TFile } from "obsidian";
import TabPanelsPlugin from "src/main";
import { headingRegex, inlineFootnoteRegex } from "./constants";

interface TabsCache {
    // Helps identify which cache is from this plugin, 
    // In case Obsidian returns the array with the previous items in the cache.
    isFromTabPanels: boolean;
}

interface TabsLinkCache extends LinkCache, TabsCache {}
interface TabsEmbedCache extends EmbedCache, TabsCache {}
interface TabsHeadingCache extends HeadingCache, TabsCache {}
interface TabsTagCache extends TagCache, TabsCache {}
interface TabsFootnoteCache extends FootnoteCache, TabsCache {}
interface TabsSectionFootnoteCache extends SectionFootnoteCache, TabsCache{}

interface SectionFootnoteCache extends SectionCache {
    footnoteId: string;
}

// To add a new item to cache:
// 1. Create new function to parse item (Reference parseTagsByLine())
// 2. Call it in rebuildCacheMetadata()
// 3. Add updated cache to Obsidian cache, addToMetadataCache()
// 4. Filter out cache from previous cache in filterOutPluginCache()

export interface CacheData {
    // Copied from Obsidian's CachedData
    links?: LinkCache[];
    embeds?: EmbedCache[];
    headings?: HeadingCache[];
    tags?: TagCache[];
    footnotes?: FootnoteCache[];
    // Used only for footnote definition
    sections?: SectionFootnoteCache[];

    // === NOT USING ===
    // listItems?: ListItemCache[];
    // frontmatter?: FrontMatterCache;
    // frontmatterPosition?: Pos;
    // frontmatterLinks?: FrontmatterLinkCache[];
    // blocks?: Record<string, BlockCache>;
}

// Update Obsidian's cache using data in db
// Called onload
export async function updateCacheFromDb(metadataCache: MetadataCache, app: App) {
    console.log("Tab Panels: Loading cache from Database");
    const loadCacheTimeLabel = "Tab Panels: Finished loading cache in "
    console.time(loadCacheTimeLabel);
    try {
        await localforage.iterate((cache: CacheData, path: string) => {
            const cachedMetadata = metadataCache.getCache(path);
            if (!cachedMetadata) {
                if (app.vault.getFileByPath(path)) {
                    console.error("Tab Panels: Cannot get cacheMetadata from file. Path: ", path);
                }
                else {
                    console.warn("Tab Panels: Cannot find file. Path: ", path, "\nRemoving cache from db");

                    // Use this instead of try catch as this function can't be async
                    localforage.removeItem(path)
                                .catch(error => console.error("Tab Panels: Error deleting cache from db. File path: ", path, "\nERROR: ", error));
                }

                return;
            }

            // Filter out plugin cache
            filterOutPluginCache(cachedMetadata);

            // Add the cached data to Obsidian's cache
            addToMetadataCache(cachedMetadata, cache);

            rebuildResolvedLinks(cachedMetadata, metadataCache, path);
 
            // Trigger Obsidian events to reload the UI and update any other plugin that uses the metadataCache
            const file = app.vault.getFileByPath(path);
            if (file) {
                // const markdown = await app.vault.cachedRead(file);
                // metadataCache.trigger("changed", app.vault.getFileByPath(path), markdown);
                metadataCache.trigger("resolve", app.vault.getFileByPath(path));
            }
            else {
                console.error("Tab Panels: Cannot find file.\n Path: ", path);
            }
        })
    } catch (error) {
        console.error("Tab Panels: Error loading cache from db to cachedMetadata. \nERROR: ", error);
        return;
    }
    console.timeEnd(loadCacheTimeLabel);
}

export async function updateCacheOnFileRename(file: TAbstractFile, oldPath: string) {
    let dbData: CacheData | null;
    
    try {
        dbData = await localforage.getItem(oldPath);

        // Change the key by copying it over then deleting the old key
        if (dbData)
        {
            await localforage.setItem(file.path, dbData);
            await localforage.removeItem(oldPath);
        }
    } catch (error) {
        console.error("Tab Panels: Error updating from db. File path: ", file.path, "\nERROR: ", error);
        return;
    }
}

export async function updateCacheOnFileDelete(file: TAbstractFile) {
    try {
        // Delete the entry
        await localforage.removeItem(file.path);
    } catch (error) {
        console.error("Tab Panels: Error deleting cache from db. File path: ", file.path, "\nERROR: ", error);
        return;
    }
}

// Go through the whole vault and rebuild the whole cache in the db.
export async function rebuildVaultCache(plugin: TabPanelsPlugin) {
    new Notice("Tab Panels: Rebuilding cache...", 3000)
    const timeBuildTimeString = "Tab Panels: Build time";
    console.time(timeBuildTimeString)
    try {
        const app = plugin.app;
        localforage.clear();

        const files = plugin.app.vault.getMarkdownFiles();
        for (const file of files) {
            const markdown = await plugin.app.vault.cachedRead(file);
            const cachedMetadata = plugin.app.metadataCache.getFileCache(file);
            if (!cachedMetadata) {
                console.error("Tab Panels: Error getting cache for file: " + file.path);
                continue;
            }
            updateCacheFromFile(plugin, file, markdown, cachedMetadata);
            
            // app.metadataCache.trigger("changed", app.vault.getFileByPath(file.path), markdown);
            app.metadataCache.trigger("resolve", app.vault.getFileByPath(file.path));
        }
    } catch (error) {
        console.error("Tab Panels: Error rebuilding vault cache.\nERROR: ", error);
        new Notice("Tab Panels: Error rebuilding vault cache. Error:" + error)
        console.timeEnd(timeBuildTimeString)
        return;
    }
    console.timeEnd(timeBuildTimeString)
    new Notice("Tab Panels: Finished building cache", 3000)
}

// Parses the markdown, update the Obsidian's metadataCache and saves the result in db
export async function updateCacheFromFile(plugin: TabPanelsPlugin, file: TFile, markdown: string, cachedMetadata: CachedMetadata) {
    const metadataCache = plugin.app.metadataCache;
    const cacheData: CacheData = {};
    
    filterOutPluginCache(cachedMetadata);
    
    // Regex to get the markdown content
    // Note that there can be 3 or more backticks and the start and end backticks need to match
    // Regex101: https://regex101.com/r/OZVkPd/1
    // ===== Breakdown =====
    // ^: Start of string
    // <space>{0,3}: Match any spaces 0 to 3 times 
    // (`{3,}|~{3,}): 1st capture group (need to capture to match "\1" at the end)
    //      Matches: [` 3 or unlimited times] OR [~ 3 or unlimited times]
    // <space>*: Matches any spaces 0 to unlimited times
    // \n: Match new line
    // ([\s\S]*?): 2nd capture group (markdown content)
    //      Matches any character, including line breaks. As few times as possible, expanding as needed (Lazy)
    // \1: Matches the same text matched by the first capture group.
    // 
    // NOTE: Some of these might seem strange (Like accepting spaces before and after ```)
    // but obsidian seems to accept them so I've just allowed them.
    // Might have other weird combinations too that Obsidian accepts but this regex don't
    // 
    // Original regex:
    // const regex = /^ {0,3}(`{3,}|~{3,}) *tabs[ \w]*\n([\s\S]*?)\1/gm;
    // Changed it slightly to make it fit RegExp and the template literal (`${value}`). 
    // Added '\' before backticks (`) and slashes (\)
    const regex = new RegExp(`^ {0,3}(\`{3,}|~{3,}) *${plugin.settings.codeblockKeyword}[ \\w]*\n([\\s\\S]*?)\\1`, 'gm')

    const matches = [...markdown.matchAll(regex)];
    
    // Tracks the end of the last match to minimize the substring length for line counting
    let lastIndex = 0;
    let lineNumber = 1;

    let hasItemsToCache = false;

    for (const match of matches) {
        if (match.index === undefined) {
            console.error("Tab panels: Error when parsing markdown, splitting markdown blocks. Match index === undefined\nMatch:", match);
            return;
        }
        const textBefore = markdown.slice(lastIndex, match.index);
        lastIndex = match.index;
        // Add the line numbers. TODO: Optimise this? Split creates new array
        // Note don't need to add the line numbers inside the code block as the next iteration adds it.
        lineNumber += textBefore.split("\n").length - 1;
        
        const locOffset: Loc = {
            line: lineNumber,
            col: 0,
            // + Match[1]: Number of backticks (`) or tilde (~)
            // + 5: Not sure what it represents... Just tested it and it works
            offset: match.index + match[1].length + 5,
        }

        // Get second capture group and update the cache
        const codeblockMarkdown = match[2];
        const currHasItemsInCache = rebuildCacheMetadata(codeblockMarkdown, locOffset, cacheData);
        
        if (currHasItemsInCache) {
            hasItemsToCache = true;
        }
    }

    if (hasItemsToCache) {
        addToMetadataCache(cachedMetadata, cacheData);
        rebuildResolvedLinks(cachedMetadata, metadataCache, file.path)
    }

    // Inline footnotes are slightly different
    const hasFootnotes = rebuildInlineFootnotesCache(markdown, cachedMetadata, cacheData, matches);
    if (hasFootnotes) {
        hasItemsToCache = hasFootnotes;
    }

    // Update db
    try {
        if (hasItemsToCache) {
            await localforage.setItem(file.path, cacheData);
        } 
        // If there's no items in the file, delete it from the cache
        else {
            await localforage.removeItem(file.path);
        }
    } catch (error) {
        console.error("Tab Panels: Error updating cache in db. File path: ", file.path, "\nERROR: ", error);
        return;
    }
}

//#region Rebuilding CacheMetadata (From metadataCache.getFileCache)
// Rebuilds the cache data, modifying outPluginCacheData
// Returns true if it has items to put in the cache
function rebuildCacheMetadata(markdown: string, locOffset: Loc, outPluginCacheData: CacheData): boolean {
    const lines = markdown.split("\n");
    let offset = 0;
    lines.forEach((line, lineNumber) => {
        const currLineNum = locOffset.line + lineNumber;
        const currOffset = locOffset.offset + offset;
        parseLinksAndEmbedsByLine(line, currLineNum, currOffset, outPluginCacheData);
        parseHeadingsByLine(line, currLineNum, currOffset, outPluginCacheData);
        parseTagsByLine(line, currLineNum, currOffset, outPluginCacheData);
        offset += line.length + 1;
    })

    // Sections can be multi line so parse the whole markdown in one go.
    parseFootnoteSections(markdown, locOffset, outPluginCacheData);

    // If there's anything in outPluginCacheData
    return outPluginCacheData && Object.keys(outPluginCacheData).length > 0;
}

// Syntax for Links: [[Link]], [[Link|Display name]]
// Syntax for Embeds: ![[Embed]], [[Embed|Display name]]
// Links and embeds are similar. Only difference is embeds start with !
function parseLinksAndEmbedsByLine(markdown: string, lineNumber: number, offset: number, outPluginCacheData: CacheData)  {
    const linkRegex = /!?\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
	const matches: RegExpMatchArray[] = [...markdown.matchAll(linkRegex)];
	if (matches.length > 0) {
        const links: LinkCache[] = [];
        const embeds: EmbedCache[] = [];
		matches.forEach((match: RegExpMatchArray) => {
			const col = match.index ? match.index : 0;
			const start: Loc = {
				line: lineNumber,
				col: col,
				offset: offset + col,
			};
            
            // Note: Pushing into links and embeds array which are LinkCache[] and EmbedCache[]. Both inherits from ReferenceCache
            const cache: ReferenceCache = {
                link: match[1],
                original: match[0],
                // Get display text (filename|display text). If there's no display text, assign the original text
                displayText: match[2] ?? match[1],
                position: {
                    start: start,
                    end: {
                        line: start.line,
                        col: start.col + match[0].length,
                        offset: start.offset + match[0].length,
                    },
                },
            };
            
            // If link
            if (match[0][0] !== "!")
                links.push(cache);
            // If embed
            else
                embeds.push(cache);
		});
        
        if (outPluginCacheData.links) 
            outPluginCacheData.links.push(...links);
        else
            outPluginCacheData.links = links;

        if (outPluginCacheData.embeds)
            outPluginCacheData.embeds.push(...embeds);
        else
            outPluginCacheData.embeds = embeds;
	}
}

// Syntax for headings: # Heading, ## Heading 2
function parseHeadingsByLine(markdown: string, lineNumber: number, offset: number, outPluginCacheData: CacheData) {
    // Regex101 tests: https://regex101.com/r/Tydzgd/1
    // match[0]: Full string
    // match[1]: Hashtags to count level
    // match[2]: Heading text
    const match = markdown.match(headingRegex);
	if (match) {
        const col = match.index ? match.index : 0;
        const start: Loc = {
            line: lineNumber,
            col: col,
            offset: offset + col,
        };
        
        const cache: HeadingCache = {
            // Shouldn't have any space at the start, just trim end
            heading: match[2].trimEnd(),
            level: match[1].length,
            position: {
                start: start,
                end: {
                    line: start.line,
                    col: start.col + match[0].length,
                    offset: start.offset + match[0].length,
                },
            },
        };

        if (outPluginCacheData.headings)
            outPluginCacheData.headings.push(cache);
        else
            outPluginCacheData.headings = [cache];
	}
}

// Syntax for tags: #tag
function parseTagsByLine(markdown: string, lineNumber: number, offset: number, outPluginCacheData: CacheData)  {
    const tagRegex = /#[^\s~!@#$%^&*()+={}|:;"'<>?`[\]\\,.]+/g;
	const matches: RegExpMatchArray[] = [...markdown.matchAll(tagRegex)];
	if (matches.length > 0) {
        const tags: TagCache[] = [];
		matches.forEach((match: RegExpMatchArray) => {
			const col = match.index ? match.index : 0;
			const start: Loc = {
				line: lineNumber,
				col: col,
				offset: offset + col,
			};
            
            const cache: TagCache = {
                tag: match[0],
                position: {
                    start: start,
                    end: {
                        line: start.line,
                        col: start.col + match[0].length,
                        offset: start.offset + match[0].length,
                    },
                },
            };
            tags.push(cache);
		});
        
        if (outPluginCacheData.tags) 
            outPluginCacheData.tags.push(...tags);
        else
            outPluginCacheData.tags = tags;
	}
}

function rebuildInlineFootnotesCache(fileMarkdown: string, cachedMetadata: CachedMetadata, outCacheData: CacheData, tabsMatches: RegExpMatchArray[]): boolean {
    // If no tab code blocks, return as no need to add to cache
    if (tabsMatches.length === 0) {
        return false; 
    }

    let currCodeBlockIndex = -1;
    let codeBlockStart = Number.MAX_SAFE_INTEGER, codeBlockEnd = Number.MAX_SAFE_INTEGER;

    const updateCodeBlock = (codeBlockIndex: number) => {
        currCodeBlockIndex = codeBlockIndex;

        const codeblock =  tabsMatches[codeBlockIndex];
        if (codeblock.index) {
            codeBlockStart = codeblock.index;
        }
        else {
            codeBlockStart = 0;
            console.error("Rebuilding inline footnotes, regex match.index === ", codeblock.index);
        }
        codeBlockEnd = codeBlockStart + codeblock.length;
    }
    
    const footnoteMatches = [...fileMarkdown.matchAll(inlineFootnoteRegex)];
    if (footnoteMatches.length === 0) {
        return false;
    }

    if (!cachedMetadata.footnotes) {
        cachedMetadata.footnotes = [];
    }

    if (!outCacheData.footnotes) {
        outCacheData.footnotes = [];
    }
    
    footnoteMatches.forEach((footnote, index) => {
        const footnotePosition = footnote.index ?? 0;
        // Loop through all of the tab code blocks to find a footnote that appears after the start of the code block.
        while (footnotePosition > codeBlockStart) {
            // To prevent infinite loops (Shouldn't happen but just in case)
            if (currCodeBlockIndex >= tabsMatches.length - 1) {
                console.error("Rebuilding footnote cache, While loop went over number of tab matches.\n", "Index: ", currCodeBlockIndex, " | Matches: ", tabsMatches.length);
                break;
            }

            updateCodeBlock(currCodeBlockIndex++);
        }

        // If footnote is inside codeblock. 
        // Don't need to check `footnote.index > codeBlockStart` as it's already check in the while loop above^
        if (footnotePosition < codeBlockEnd) {
			const start: Loc = {
				line: 0, // TODO: Add correct line number
				col: footnotePosition,
				offset: footnotePosition + 2,
			};

            const cache: FootnoteCache = {
                id: `[inline${index}`,
                position: {
                    start: start,
                    end: {
                        line: start.line,
                        col: start.col + footnote[0].length,
                        offset: start.offset + footnote[0].length - 3,
                    },
                },
            };
            
            outCacheData.footnotes?.push(cache);

            const cacheForObsidian: TabsFootnoteCache = { ...cache, isFromTabPanels: true };
            cachedMetadata.footnotes?.push(cacheForObsidian);
        }
    })

    return true;
}

// Note 1: Sections are different from the different cache types as they can be multi lines
// Note 2: This adds to BOTH cachedMetadata.footnotes AND cachedMetadata.sections (Not sure what Obsidian uses sections for though)
function parseFootnoteSections(markdown: string, locOffset: Loc, outPluginCacheData: CacheData) {
    // Tracks the end of the last match to minimize the substring length for line counting
    let lastIndex = 0;
    let lineNumber = locOffset.line;

    // Regex101: https://regex101.com/r/teKSkJ/2
    // Syntax: ^[footnote_name]: Footnote definition
    const namedFootnoteRegex = /^\[\^([^^`\n]+)]:([^^`\n]+(?:\n[^^`\n]+)?)$/gm;
	const matches: RegExpMatchArray[] = [...markdown.matchAll(namedFootnoteRegex)];
	if (matches.length > 0) {
        // NOTE: Obsidian doesn't add the footnote link - ^[name]
        //       But it adds the footnote definition (syntax diff is the end colon) - ^[name]: 
        //       It adds the footnote definition to BOTH cachedMetadata.footnotes AND cachedMetadata.sections (Not sure what Obsidian uses sections for though)
        //       Position for both are the same.
        const footnotes: FootnoteCache[] = [];
        const sectionFootnotes: SectionFootnoteCache[] = [];
		matches.forEach((match) => {
            if (!match.index) {
                console.error("Tab panels: Parsing sections for footnote definition. Unknown match index value: ", match.index, "\nMatch:", match);
                return;
            }

            // Similar to getting locOffset from updateCacheFromFile
            const textBefore = markdown.slice(lastIndex, match.index);
            lastIndex = match.index;
            lineNumber += textBefore.split("\n").length -1 ;

			const col = match.index ? match.index : 0;
			const start: Loc = {
				line: lineNumber,
				col: col,
				offset: match.index + locOffset.offset,
			};

            const position: Pos = {
                start: start,
                end: {
                    line: start.line,
                    col: start.col + match[0].length,
                    offset: start.offset + match[0].length,
                }
            };

            const footnoteCache: FootnoteCache = {
                id: match[1],
                position: position
            };
            footnotes.push(footnoteCache);

            // Similar to footnoteCache
            const sectionFootnoteCache: SectionFootnoteCache = {
                footnoteId: match[1], // Custom id, not in Obsidian
                type: "footnoteDefinition",
                position: position
            };
            sectionFootnotes.push(sectionFootnoteCache);
		});
        
        if (outPluginCacheData.footnotes) 
            outPluginCacheData.footnotes.push(...footnotes);
        else
            outPluginCacheData.footnotes = footnotes;
        
        if (outPluginCacheData.sections) 
            outPluginCacheData.sections.push(...sectionFootnotes);
        else
            outPluginCacheData.sections = sectionFootnotes;
	}
}

// Sometimes it'll pass in the previous cache. So to prevent adding new data to the previous data, filter out all the data from this plugin
function filterOutPluginCache(cachedMetadata: CachedMetadata) {
    if (cachedMetadata.links) {
        cachedMetadata.links = cachedMetadata.links.filter((value) => !(value as TabsLinkCache).isFromTabPanels)
    }
    if (cachedMetadata.embeds) {
        cachedMetadata.embeds = cachedMetadata.embeds.filter((value) => !(value as TabsEmbedCache).isFromTabPanels)
    }
    if (cachedMetadata.headings) {
        cachedMetadata.headings = cachedMetadata.headings.filter((value) => !(value as TabsHeadingCache).isFromTabPanels)
    }
    if (cachedMetadata.tags) {
        cachedMetadata.tags = cachedMetadata.tags.filter((value) => !(value as TabsTagCache).isFromTabPanels)
    }
    if (cachedMetadata.footnotes) {
        cachedMetadata.footnotes = cachedMetadata.footnotes.filter((value) => !(value as TabsFootnoteCache).isFromTabPanels)
    }
    if (cachedMetadata.sections) {
        cachedMetadata.sections = cachedMetadata.sections.filter((value) => !(value as TabsSectionFootnoteCache).isFromTabPanels)
    }
}

function addToMetadataCache(cachedMetadata: CachedMetadata, pluginCacheData: CacheData) {
    // ===== Add result to Obsidian's cache =====
    // TODO: Some code is repetitive, find a way to simplify it. Maybe add function with templates
    // Add links
    if (pluginCacheData.links && pluginCacheData.links.length > 0) {
        const tabsLinkCache: TabsLinkCache[] = pluginCacheData.links.map((cache) => ({ ...cache, isFromTabPanels: true }));
        if (!cachedMetadata.links){
            cachedMetadata.links = tabsLinkCache;
        }
        else {
            cachedMetadata.links?.push(...tabsLinkCache);
        }
    }

    // Add embeds
    if (pluginCacheData.embeds && pluginCacheData.embeds.length > 0) {
        const tabsEmbedCache: TabsEmbedCache[] = pluginCacheData.embeds.map((cache) => ({ ...cache, isFromTabPanels: true }));
        if (!cachedMetadata.embeds){
            cachedMetadata.embeds = tabsEmbedCache;
        }
        else {
            cachedMetadata.embeds?.push(...tabsEmbedCache);
        }
    }

    // Add headings
    if (pluginCacheData.headings && pluginCacheData.headings.length > 0) {
        const tabsHeadingCache: TabsHeadingCache[] = pluginCacheData.headings.map((cache) => ({ ...cache, isFromTabPanels: true }));
        if (!cachedMetadata.headings){
            cachedMetadata.headings = tabsHeadingCache;
        }
        else {
            cachedMetadata.headings?.push(...tabsHeadingCache);
        }

        // Not sure why need to sort when links don't need to sort
        // Order doesn't appear correctly in sidebar if never sort
        cachedMetadata.headings.sort(sortCacheByOffset)
    }

    // Add tags
    if (pluginCacheData.tags && pluginCacheData.tags.length > 0) {
        const tabsTagsCache: TabsTagCache[] = pluginCacheData.tags.map((cache) => ({ ...cache, isFromTabPanels: true }));
        if (!cachedMetadata.tags){
            cachedMetadata.tags = tabsTagsCache;
        }
        else {
            cachedMetadata.tags?.push(...tabsTagsCache);
        }
    }

    // Add footnotes
    if (pluginCacheData.footnotes && pluginCacheData.footnotes.length > 0) {
        const tabsFootnoteCache: TabsFootnoteCache[] = pluginCacheData.footnotes.map((cache) => ({ ...cache, isFromTabPanels: true }));
        if (!cachedMetadata.footnotes){
            cachedMetadata.footnotes = tabsFootnoteCache;
        }
        else {
            cachedMetadata.footnotes?.push(...tabsFootnoteCache);
        }

        cachedMetadata.footnotes.sort(sortCacheByOffset);
        let inlineCount = 0;
        cachedMetadata.footnotes.forEach((value, index) => {
            if (value.id.startsWith("[inline"))
                value.id = `[inline${inlineCount++}`
        });
    }

    // Add sections
    if (pluginCacheData.sections && pluginCacheData.sections.length > 0) {
        const tabsSectionsCache: TabsSectionFootnoteCache[] = pluginCacheData.sections.map((cache) => ({ ...cache, isFromTabPanels: true }));
        if (!cachedMetadata.sections){
            cachedMetadata.sections = tabsSectionsCache;
        }
        else {
            cachedMetadata.sections?.push(...tabsSectionsCache);
        }
    }
}

//#endregion

// Rebuilding resolved and unresolved links (metadataCache.resolvedLinks and metadataCache.unresolvedLinks)
// Adds the links to the outResolvedLinks and outUnresolvedLinks arrays.
function rebuildResolvedLinks(cachedMetadata: CachedMetadata, metadataCache: MetadataCache, path: string) {
    const links = cachedMetadata.links;
    const resolvedLinks = metadataCache.resolvedLinks[path];
    const unresolvedLinks = metadataCache.unresolvedLinks[path];

    if (!links)
        return;

    links.forEach((linkCache) => {
        const link = linkCache.link;
        const file = metadataCache.getFirstLinkpathDest(link, "");
        let filePath = "";
        let linksRef: Record<string, number>;

        // If can't find file, add to unresolvedLinks
        if (file === null) {
            linksRef = unresolvedLinks;
            filePath = link;
        }
        // If can find file, add to resolved links
        else {
            linksRef = resolvedLinks;
            filePath = file.path;
        }

        if (linksRef[filePath] === undefined) 
            linksRef[filePath] = 0;
        
        linksRef[path]++;
    })
}

function sortCacheByOffset(a: CacheItem, b: CacheItem): number {
    const aStartOffset = a.position.start.offset;
    const bStartOffset = b.position.start.offset;
    if (aStartOffset < bStartOffset)
        return -1;
    else if (aStartOffset > bStartOffset)
        return 1;
    // Shouldn't happen
    else {
        console.warn("Tab Panels: Cache item with same offset", "\nCache A:", a, "Cache B:", b);
        return 0;
    } 
}