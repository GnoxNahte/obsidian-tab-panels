/**
 * Credits: This code is adapted from the HTML Tabs plugin.
 * Original source: https://github.com/ptournet/obsidian-html-tabs
 * Reference files:
 * - src/util/cache.ts
 * - src/util/parsing.ts
 */

import { App, CachedMetadata, EmbedCache, FootnoteCache, HeadingCache, LinkCache, Loc, MetadataCache, ReferenceCache, TAbstractFile, TagCache, TFile } from "obsidian";
import TabPanelsPlugin from "src/main";

export type DataCache = Record<string, CacheData>;

interface TabsCache {
    isFromTabPanels: boolean;
}

export interface TabsLinkCache extends LinkCache, TabsCache {}
export interface TabsEmbedCache extends EmbedCache, TabsCache {}

export interface CacheData {
    // Copied from Obsidian's CachedData
    links?: LinkCache[];
    embeds?: EmbedCache[];
    tags?: TagCache[];
    headings?: HeadingCache[];
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
        
        // Add the cached links in settings to Obsidian's cache
        const linkCache = settingsData[path].links;
        if (linkCache) {
            if (cachedMetadata.links)
                cachedMetadata.links.push(...linkCache);
            else
                cachedMetadata.links = linkCache;

            // rebuildResolvedLinks(cachedMetadata, 
            //     metadataCache, 
            //     metadataCache.resolvedLinks[path],
            //     metadataCache.unresolvedLinks[path]);
        }

        const embedCache = settingsData[path].embeds;
        if (embedCache) {
            if (cachedMetadata.embeds)
                cachedMetadata.embeds.push(...embedCache);
            else 
                cachedMetadata.embeds = embedCache;
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
    settingsData = {};
    
    await plugin.saveSettings();
}

// Parses the markdown, update the Obsidian's metadataCache and saves the result in settings
export async function updateCacheFromFile(plugin: TabPanelsPlugin, file: TFile, markdown: string, cachedMetadata: CachedMetadata) {
    const metadataCache = plugin.app.metadataCache;

    // Sometimes it'll return the previous cache. So to prevent adding new data to the previous data, filter out all the data from this plugin
    if (cachedMetadata.links) {
        cachedMetadata.links = cachedMetadata.links.filter((value) => !(value as TabsLinkCache).isFromTabPanels)
    }

    const settingsCacheData = plugin.settings.dataCache;
    
    // ===== Reset =====
    // cachedMetadata.links = [];
    settingsCacheData[file.path] = {};
    // if (settingsCacheData[file.path]) {
    //     settingsCacheData[file.path].links = [];
    // }
    // Links
    // metadataCache.resolvedLinks[file.path] = {};
    // metadataCache.unresolvedLinks[file.path] = {};

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
        const hasItemsInCache = updateCache(metadataCache, cachedMetadata, file.path, codeblockMarkdown, locOffset, settingsCacheData[file.path]);
        if (hasItemsInCache)
            hasItemsToCache = true;
    }

    // If there's no items in the file, delete it from the cache
    if (!hasItemsToCache && settingsCacheData[file.path]) {
        delete settingsCacheData[file.path];
    } 
 
    await plugin.saveSettings();
}

// Returns true if it has items to put in the cache
export function updateCache(metadataCache: MetadataCache, cachedMetadata: CachedMetadata, path: string, markdown: string, locOffset: Loc, outSettingsCacheData: CacheData): boolean {
    
    const hasItemsToCache = rebuildCacheMetadata(cachedMetadata, markdown, locOffset, outSettingsCacheData);
    
    // TODO: Not sure if need to update??
    // if (hasItemsToCache){
    //     rebuildResolvedLinks(cachedMetadata, metadataCache,
    //                     metadataCache.resolvedLinks[path],
    //                     metadataCache.unresolvedLinks[path]);
    // }

    return hasItemsToCache;
}

//#region Rebuilding CacheMetadata (From metadataCache.getFileCache)
// Rebuilds the cache data, modifying outSettingsCacheData
// Returns true if it has items to put in the cache
function rebuildCacheMetadata(cachedMetadata: CachedMetadata, markdown: string, locOffset: Loc, outSettingsCacheData: CacheData): boolean {
    parseLinks(markdown, locOffset, outSettingsCacheData);

    // If it didn't change anything,
    if (!outSettingsCacheData || Object.keys(outSettingsCacheData).length === 0)
        return false;

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

    return true;
}

function parseLinks(markdown: string, locOffset: Loc, outCacheData: CacheData) {
    const lines = markdown.split("\n");
    let offset = 0;
    lines.forEach((line, lineNumber) => {
        parseLinksByLine(line, locOffset.line + lineNumber, locOffset.offset + offset, outCacheData);
        offset += line.length + 1;
    })
}

function parseLinksByLine(markdown: string, lineNumber: number, offset: number, outCacheData: CacheData)  {
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
//#endregion

// Rebuilding resolved and unresolved links (metadataCache.resolvedLinks and metadataCache.unresolvedLinks)
// Adds the links to the outResolvedLinks and outUnresolvedLinks arrays.
// function rebuildResolvedLinks(cachedMetadata: CachedMetadata, metadataCache: MetadataCache, outResolvedLinks: Record<string, number>, outUnresolvedLinks: Record<string, number>) {
//     const links = cachedMetadata.links;

//     if (!links)
//         return;

//     links.forEach((linkCache) => {
//         const link = linkCache.link;
//         const file = metadataCache.getFirstLinkpathDest(link, "");
//         let path = "";
//         let linksRef: Record<string, number>;

//         // If can't find file, add to unresolvedLinks
//         if (file === null) {
//             linksRef = outUnresolvedLinks;
//             path = link;
//         }
//         // If can find file, add to resolved links
//         else {
//             linksRef = outResolvedLinks;
//             path = file.path;
//         }

//         if (linksRef[path] === undefined) 
//             console.warn("Reset")
//         if (linksRef[path] === undefined) 
//             linksRef[path] = 0;
        
//         linksRef[path]++;
//     })
// }
