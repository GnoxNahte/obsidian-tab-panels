<!-- Template
DO THIS, DON'T COPY: 
- REPLACE 1.0.x (link title and url tree link) AND DATE

Template to copy:

## [1.1.x](https://github.com/GnoxNahte/obsidian-auto-embed/tree/1.1.x) (2025-xx-xx)

**New Features & Improvements:**
- 

**Bugs Fixed:**
- 
-->

## [1.1.4](https://github.com/GnoxNahte/obsidian-auto-embed/tree/1.1.4) (2024-12-27)

**Bugs Fixed:**
- Fix #14 and #11 Fix cache not updating when opening a note on a new tab and on startup

## [1.1.3](https://github.com/GnoxNahte/obsidian-auto-embed/tree/1.1.3) (2024-12-19)

**Bugs Fixed:**
- #11: Correct position in note when clicking on heading in Outline (Table of Content)

> [!WARNING]
> Note, these don't work and don't think it'll be fixed:
> - Scrolling on the page will highlight the wrong heading in Outline (Usually offsets by 1 heading)
> - It'll still position the page wrongly when using [[Note#Heading]]

Info on how this fix works any why it the stuff in the warning can't be fixed: [comment in #11](https://github.com/GnoxNahte/obsidian-tab-panels/issues/11#issuecomment-2551351202) - Check the "How it works"

## [1.1.2](https://github.com/GnoxNahte/obsidian-auto-embed/tree/1.1.2) (2025-12-11)

**New Features & Improvements:**
- #5: Added caching support for footnotes

## [1.1.1](https://github.com/GnoxNahte/obsidian-auto-embed/tree/1.1.1) (2024-12-07)

**New Features & Improvements:**
- #6 - Introduced a new setting allowing you to define your syntax for marking a tab.<br>
_(Default syntax: ---)_
- #3 - **(Experimental)** Added [caching](../../#cache-experimental).<br>
What caching does:
	- Enables Obsidian to process data inside the tabs panel, just like regular markdown.
	- Fully integrates **links, headings, and tags** within tab panels into Obsidian's core features (such as backlinks, outgoing links and graph view) and other plugins that use it like [Dataview](https://github.com/blacksmithgu/obsidian-dataview)
	- Supports renaming linked files inside tab panels

> [!TIP]
> **Enabling caching for the first time**
> 
> To update the cache on the file, do one of these
> - Edit the file. It can be anything, adding a space, deleting a character, etc. Note that this only updates the cache for the edited file only.
> - Running "Rebuild cache" from the settings. This goes through your whole vault, finds all the data inside the tab panel code blocks and adds it to Obsidian's cache.

> [!WARNING]
> Since it's quite a large feature, I've released it as an _experimental_ feature.
> If you find any bugs, please create an [issue](https://github.com/GnoxNahte/obsidian-tab-panels/issues/new?template=bug-report.yml).

Check the [README](../../#cache-experimental) for more info.

**Other changes**
- Change "Hide no tabs warning" to "Show no tabs warning" for better clarity. (You shouldn't need to modify it. It'll take your existing setting and base it on it)

## [1.0.2](https://github.com/GnoxNahte/obsidian-tab-panels/tree/1.0.2) (2024-11-15)

**Features**
- [#2](https://github.com/GnoxNahte/obsidian-tab-panels/issues/2) - Allow nesting tab panels.

## [1.0.1](https://github.com/GnoxNahte/obsidian-tab-panels/tree/1.0.1) (2024-11-14)

**Features**
- [#1](https://github.com/GnoxNahte/obsidian-tab-panels/issues/1) - Allow html & markdown formatting for tab names.

## [1.0.0](https://github.com/GnoxNahte/obsidian-tab-panels/tree/1.0.0) (2024-03-25) - First release!

**Features**
- Create tab panels to organise content
- Add ability to set default tabs 
- Scrolling through tab panels 

**Others**
- Add README
- Add issue templates