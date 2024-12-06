/**
 * Credits: This base for the code is adapted from the HTML Tabs plugin.
 * Original source: https://github.com/ptournet/obsidian-html-tabs
 * Reference files:
 * - src/util/cache.ts
 * - src/util/parsing.ts
 */

import { App, CachedMetadata, CacheItem, EmbedCache, FootnoteCache, HeadingCache, LinkCache, Loc, MetadataCache, ReferenceCache, TAbstractFile, TagCache, TFile } from "obsidian";
import TabPanelsPlugin from "src/main";

export type DataCache = Record<string, CacheData>;

interface TabsCache {
    // Helps identify which cache is from this plugin, 
    // In case Obsidian returns the array with the previous items in the cache.
    isFromTabPanels: boolean;
}

interface TabsLinkCache extends LinkCache, TabsCache {}
interface TabsEmbedCache extends EmbedCache, TabsCache {}
interface TabsHeadingCache extends HeadingCache, TabsCache {}
interface TabsTagCache extends TagCache, TabsCache {}

// To add a new item to cache:
// 1. Create new function to parse item (Reference parseTagsByLine)
// 2. Call it in rebuildCacheMetadata()
// 3. Add updated cache to Obsidian cache, also in rebuildCacheMetadata()
// 4. Add cache from settings to Obsidian cache (called when plugin loads) in updateCacheFromSettings()

export interface CacheData {
    // Copied from Obsidian's CachedData
    links?: LinkCache[];
    embeds?: EmbedCache[];
    headings?: HeadingCache[];
    tags?: TagCache[];
    footnotes?: FootnoteCache[];

    // === NOT USING ===
    // sections?: SectionCache[];
    // listItems?: ListItemCache[];
    // frontmatter?: FrontMatterCache;
    // frontmatterPosition?: Pos;
    // frontmatterLinks?: FrontmatterLinkCache[];
    // blocks?: Record<string, BlockCache>;
}

// Update the cache from the data in settings
// Called onload
export async function updateCacheFromSettings(settingsData: DataCache, metadataCache: MetadataCache, app: App) {
    for (const path in settingsData) {
        const cachedMetadata = metadataCache.getCache(path);
        if (!cachedMetadata) {
            console.error("metadataCache.getCache(", path, ") = ", cachedMetadata)    
            continue;
        }
        
        // ===== Add the cached data in settings to Obsidian's cache =====
        // Add links
        const linkCache = settingsData[path].links;
        if (linkCache) {
            if (cachedMetadata.links)
                cachedMetadata.links.push(...linkCache);
            else
                cachedMetadata.links = linkCache;
        }

        // Add embeds
        const embedCache = settingsData[path].embeds;
        if (embedCache) {
            if (cachedMetadata.embeds)
                cachedMetadata.embeds.push(...embedCache);
            else 
                cachedMetadata.embeds = embedCache;
        }

        if (linkCache || embedCache) 
            rebuildResolvedLinks(cachedMetadata, metadataCache, path);

        // Add headings
        const headingsCache = settingsData[path].headings;
        if (headingsCache) {
            if (cachedMetadata.headings) {
                cachedMetadata.headings.push(...headingsCache);
                // Not sure why need to sort when other metadata don't need to sort
                // Order doesn't appear correctly in sidebar if never sort
                cachedMetadata.headings.sort(sortCacheByOffset);
            }
            else 
                cachedMetadata.headings = headingsCache;
        }

        // TODO: Add headings, embeds, etc to Obsidian's cache
        
        // Trigger Obsidian events to reload the UI and update any other plugin that uses the metadataCache
        const file = app.vault.getFileByPath(path);
        if (file) { 
            const markdown = await app.vault.cachedRead(file);
            metadataCache.trigger("changed", app.vault.getFileByPath(path), markdown);
            metadataCache.trigger("resolve", app.vault.getFileByPath(path));
        }
        else {
            console.error("Cannot find file.\n Path: ", path);
        }
    }
}

export async function updateCacheOnFileRename(plugin: TabPanelsPlugin, file: TAbstractFile, oldPath: string) {
    const settingsData = plugin.settings.dataCache;

    // Change the key by copying it over then deleting the old key
    if (settingsData[oldPath])
    {
        settingsData[file.path] = settingsData[oldPath];
        delete settingsData[oldPath];
        plugin.saveSettings();
    }
}

export async function updateCacheOnFileDelete(plugin: TabPanelsPlugin, file: TAbstractFile) {
    const settingsData = plugin.settings.dataCache;
    
    // Delete the entry if it exists
    if (settingsData[file.path])
    {
        delete settingsData[file.path];
        plugin.saveSettings(); 
    }
}

// Go through the whole vault and rebuild the whole cache in the settings.
// TODO
export async function rebuildVaultCache(settingsData: DataCache, plugin: TabPanelsPlugin) {
    plugin.settings.dataCache = {};
    const files = plugin.app.vault.getMarkdownFiles();
    for (const file of files) {
        const markdown = await plugin.app.vault.cachedRead(file);
        const cachedMetadata = plugin.app.metadataCache.getFileCache(file);
        if (!cachedMetadata) {
            console.error("Error gettings cache for file: " + file.path);
            continue;
        }
        updateCacheFromFile(plugin, file, markdown, cachedMetadata);
    }
    
    await plugin.saveSettings();
}

// Parses the markdown, update the Obsidian's metadataCache and saves the result in settings
export async function updateCacheFromFile(plugin: TabPanelsPlugin, file: TFile, markdown: string, cachedMetadata: CachedMetadata) {
    const metadataCache = plugin.app.metadataCache;
    
    // Sometimes it'll pass in the previous cache. So to prevent adding new data to the previous data, filter out all the data from this plugin
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
    // console.log("Raw headings", JSON.stringify(cachedMetadata, null, 2))
    const settingsCacheData = plugin.settings.dataCache;
    
    // Reset 
    settingsCacheData[file.path] = {};

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
        const textBefore = markdown.slice(lastIndex, match.index);
        lastIndex = match.index;
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
        const hasItemsInCache = rebuildCacheMetadata(codeblockMarkdown, locOffset, settingsCacheData[file.path]);
        if (hasItemsInCache) {
            rebuildResolvedLinks(cachedMetadata, metadataCache, file.path)
            hasItemsToCache = true;
        }
    }

    if (hasItemsToCache)
        addToMetadataCache(cachedMetadata, settingsCacheData[file.path]);

    // If there's no items in the file, delete it from the cache
    if (!hasItemsToCache && settingsCacheData[file.path]) {
        delete settingsCacheData[file.path];
    } 
 
    await plugin.saveSettings();
}

//#region Rebuilding CacheMetadata (From metadataCache.getFileCache)
// Rebuilds the cache data, modifying outSettingsCacheData
// Returns true if it has items to put in the cache
function rebuildCacheMetadata(markdown: string, locOffset: Loc, outSettingsCacheData: CacheData): boolean {
    const lines = markdown.split("\n");
    let offset = 0;
    lines.forEach((line, lineNumber) => {
        const currLineNum = locOffset.line + lineNumber;
        const currOffset = locOffset.offset + offset;
        parseLinksAndEmbedsByLine(line, currLineNum, currOffset, outSettingsCacheData);
        parseHeadingsByLine(line, currLineNum, currOffset, outSettingsCacheData);
        parseTagsByLine(line, lineNumber, currOffset, outSettingsCacheData);
        offset += line.length + 1;
    })

    // If there's anything in outSettingsCacheData
    return outSettingsCacheData && Object.keys(outSettingsCacheData).length > 0;
}

// Syntax for Links: [[Link]], [[Link|Display name]]
// Syntax for Embeds: ![[Embed]], [[Embed|Display name]]
// Links and embeds are similar. Only difference is embeds start with !
function parseLinksAndEmbedsByLine(markdown: string, lineNumber: number, offset: number, outCacheData: CacheData)  {
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
        
        if (outCacheData.links) 
            outCacheData.links.push(...links);
        else
            outCacheData.links = links;

        if (outCacheData.embeds)
            outCacheData.embeds.push(...embeds);
        else
            outCacheData.embeds = embeds;
	}
}

// Syntax for headings: # Heading, ## Heading 2
function parseHeadingsByLine(markdown: string, lineNumber: number, offset: number, outCacheData: CacheData) {
    // Regex101 tests: https://regex101.com/r/Tydzgd/1
    const headingRegex = /^[^\S\r\n]*(#{1,6}) +(.*)/m;
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
        console.log("Result: ", match)
        
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

        if (outCacheData.headings)
            outCacheData.headings.push(cache);
        else
        outCacheData.headings = [cache];
	}
}

// Syntax for tags: #tag
function parseTagsByLine(markdown: string, lineNumber: number, offset: number, outCacheData: CacheData)  {
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
        
        if (outCacheData.tags) 
            outCacheData.tags.push(...tags);
        else
            outCacheData.tags = tags;
	}
}

function addToMetadataCache(cachedMetadata: CachedMetadata, outSettingsCacheData: CacheData) {
    // ===== Add result to Obsidian's cache =====
    // TODO: Some code is repetitive, find a way to simplify it. Maybe add function with templates
    // Add links
    if (outSettingsCacheData.links && outSettingsCacheData.links.length > 0) {
        const tabsLinkCache: TabsLinkCache[] = outSettingsCacheData.links.map((cache) => ({ ...cache, isFromTabPanels: true }));
        if (!cachedMetadata.links){
            cachedMetadata.links = tabsLinkCache;
        }
        else {
            cachedMetadata.links?.push(...tabsLinkCache);
        }
    }

    // Add embeds
    if (outSettingsCacheData.embeds && outSettingsCacheData.embeds.length > 0) {
        const tabsEmbedCache: TabsEmbedCache[] = outSettingsCacheData.embeds.map((cache) => ({ ...cache, isFromTabPanels: true }));
        if (!cachedMetadata.embeds){
            cachedMetadata.embeds = tabsEmbedCache;
        }
        else {
            cachedMetadata.embeds?.push(...tabsEmbedCache);
        }
    }

    // Add headings
    if (outSettingsCacheData.headings && outSettingsCacheData.headings.length > 0) {
        const tabsHeadingCache: TabsHeadingCache[] = outSettingsCacheData.headings.map((cache) => ({ ...cache, isFromTabPanels: true }));
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

    if (outSettingsCacheData.tags && outSettingsCacheData.tags.length > 0) {
        const tabsTagsCache: TabsTagCache[] = outSettingsCacheData.tags.map((cache) => ({ ...cache, isFromTabPanels: true }));
        if (!cachedMetadata.tags){
            cachedMetadata.tags = tabsTagsCache;
        }
        else {
            cachedMetadata.tags?.push(...tabsTagsCache);
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
        console.warn("Heading with same offset");
        return 0;
    } 
}