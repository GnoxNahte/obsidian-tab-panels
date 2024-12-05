/**
 * Credits: This code is adapted from the HTML Tabs plugin.
 * Original source: https://github.com/ptournet/obsidian-html-tabs
 * Reference files:
 * - src/util/cache.ts
 * - src/util/parsing.ts
 */

import { App, CachedMetadata, LinkCache, Loc, MetadataCache, TAbstractFile, TFile } from "obsidian";
import TabPanelsPlugin from "src/main";

export interface CacheData {
    data: Record<string, LinkCache[]>;
}

// Update the cache from the data in settings
// Called onload
export async function updateCacheFromSettings(data: CacheData, metadataCache: MetadataCache, app: App) {
    for (const path in data.data) {
        const cachedMetadata = metadataCache.getCache(path);
        if (!cachedMetadata) {
            console.error("metadataCache.getCache(", path, ") = ", cachedMetadata)    
            continue;
        }
        
        // Add the cache from settings to Obsidian's cached metadata
        const linkCache = data.data[path];
        if (cachedMetadata.links)
            cachedMetadata.links?.push(...linkCache);
        else
            cachedMetadata.links = linkCache;

        rebuildResolvedLinks(cachedMetadata, 
            metadataCache, 
            metadataCache.resolvedLinks[path],
            metadataCache.unresolvedLinks[path]);
        
        const file = app.vault.getFileByPath(path);
        if (file) { 
            const markdown = await app.vault.cachedRead(file);
            metadataCache.trigger("changed", app.vault.getFileByPath(path), markdown);
        }
        else {
            console.error("Cannot find file.\n Path: ", path);
        }

        metadataCache.trigger("resolve", app.vault.getFileByPath(path));
    }
}

export async function updateCacheOnFileRename(plugin: TabPanelsPlugin, file: TAbstractFile, oldPath: string) {
    const settingsData = plugin.settings.cacheData;

    // Change the key by copying it over then deleting the old key
    if (settingsData.data[oldPath])
    {
        settingsData.data[file.path] = settingsData.data[oldPath];
        delete settingsData.data[oldPath];
        plugin.saveSettings();
    }
}

export async function updateCacheOnFileDelete(plugin: TabPanelsPlugin, file: TAbstractFile) {
    const settingsData = plugin.settings.cacheData;
    
    // Change the key by copying it over then deleting the old key
    if (settingsData.data[file.path])
    {
        delete settingsData.data[file.path];
        plugin.saveSettings();
    }
}

// Also saves settings
// TODO
export async function rebuildVaultCache(data: CacheData, plugin: TabPanelsPlugin) {
    data.data = {};
    
    await plugin.saveSettings();
}

// Parses the markdown, update the Obsidian's metadataCache and saves the result in settings
export async function updateCacheFromFile(plugin: TabPanelsPlugin, file: TFile, markdown: string) {
    const metadataCache = plugin.app.metadataCache;
    const cachedMetadata = metadataCache.getFileCache(file);

    if (cachedMetadata === null) {
        console.warn("No cache");
        return;
    }

    const settingsCacheData = plugin.settings.cacheData;

    // ===== Reset =====
    cachedMetadata.links = [];
    settingsCacheData.data[file.path] = [];
    // Links
    metadataCache.resolvedLinks[file.path] = {};
    metadataCache.unresolvedLinks[file.path] = {};

    // Regex to get the markdown content
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
    // TODO: Make it dynamic for the codeblockKeyword.
    const regex = /^ {0,3}(`{3,}|~{3,}) *tabs[ \w]*\n([\s\S]*?)\1/gm;

    const matches = [...markdown.matchAll(regex)];
    
    // Tracks the end of the last match to minimize the substring length for line counting
    let lastIndex = 0;
    let lineNumber = 1;

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
        updateCache(metadataCache, cachedMetadata, settingsCacheData, file.path, match[2], locOffset);
    }

    const settingsCacheForFile = settingsCacheData.data[file.path];
    if (settingsCacheForFile && settingsCacheForFile.length === 0)  {
        delete settingsCacheData.data[file.path];
    }

    await plugin.saveSettings();
}

export function updateCache(metadataCache: MetadataCache, cachedMetadata: CachedMetadata, settingsCacheData: CacheData, path: string, markdown: string, locOffset: Loc) {
    
    rebuildCacheMetadata(cachedMetadata, settingsCacheData, path, markdown, locOffset);
    
    rebuildResolvedLinks(cachedMetadata, metadataCache,
                    metadataCache.resolvedLinks[path],
                    metadataCache.unresolvedLinks[path]);
}

// function getLinks(markdown: string): string[] {
//     return Array.from(
//         markdown.matchAll(/\[\[(.*?)\]\]/g),
//         value => value[1] // Remaps it, just returning the first capture group
//     );
// }

//#region Rebuilding CacheMetadata (From metadataCache.getFileCache)
function rebuildCacheMetadata(cachedMetadata: CachedMetadata, settingsCacheData: CacheData, path: string, markdown: string, locOffset: Loc) {
    const result = parseLinks(markdown, locOffset);

    if (!result || result.length === 0)
        return;

    if (!cachedMetadata.links)
        cachedMetadata.links = result;
    else 
        cachedMetadata.links?.push(...result);

    if (!settingsCacheData.data[path])
        settingsCacheData.data[path] = result;
    else 
        settingsCacheData.data[path].push(...result);
}

function parseLinks(markdown: string, locOffset: Loc): LinkCache[] {
    const lines = markdown.split("\n");
    let offset = 0;
    let linksCache: LinkCache[] = [];
    lines.forEach((line, lineNumber) => {
        linksCache = linksCache.concat(parseLinksByLine(line, locOffset.line + lineNumber, locOffset.offset + offset));
        offset += line.length + 1;
    })
    return linksCache;
}

function parseLinksByLine(markdown: string, lineNumber: number, offset: number): LinkCache[] {
    const linkRegex = /(?<!!)\[\[([^|\]]+)(\|([^\]]+))?\]\]/g;
	const matches: RegExpMatchArray[] = [...markdown.matchAll(linkRegex)];
	if (matches.length > 0) {
        const result: LinkCache[] = [];
		matches.forEach(function (match: RegExpMatchArray) {
			const col = match.index ? match.index : 0;
			const start: Loc = {
				line: lineNumber,
				col: col,
				offset: offset + col,
			};
			const linkCache: LinkCache = {
				link: match.groups ? match.groups.link : match[1],
				original: match[0],
				position: {
                    start: start,
					end: {
                        line: start.line,
						col: start.col + match[0].length,
						offset: start.offset + match[0].length,
					},
				},
			};

			if (match.groups && match.groups.display) {
				linkCache.displayText = match.groups.display;
			}

			result.push(linkCache);
		});

        return result;
	}

    return [];
}
//#endregion

// Rebuilding resolved and unresolved links (metadataCache.resolvedLinks and metadataCache.unresolvedLinks)
// Adds the links to the outResolvedLinks and outUnresolvedLinks arrays.
function rebuildResolvedLinks(cachedMetadata: CachedMetadata, metadataCache: MetadataCache, outResolvedLinks: Record<string, number>, outUnresolvedLinks: Record<string, number>) {
    const links = cachedMetadata.links;

    if (!links)
        return;

    links.forEach((linkCache) => {
        const link = linkCache.link;
        const file = metadataCache.getFirstLinkpathDest(link, "");
        let path = "";
        let linksRef: Record<string, number>;

        // If can't find file, add to unresolvedLinks
        if (file === null) {
            linksRef = outUnresolvedLinks;
            path = link;
        }
        // If can find file, add to resolved links
        else {
            linksRef = outResolvedLinks;
            path = file.path;
        }

        if (linksRef[path] === undefined)
            linksRef[path] = 0;
        
        linksRef[path]++;
    })
}
