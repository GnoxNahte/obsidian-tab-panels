## [1.1.1](https://github.com/GnoxNahte/obsidian-auto-embed/tree/1.1.1) (2024-12-07)

**New Features & Improvements:**
- Introduced a new setting allowing you to define your syntax for marking a tab.<br>
_(Default syntax: ---)_
- **(Experimental)** Added [caching](../../#cache-experimental).<br>
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

<!-- Template
DO THIS, DON'T COPY: 
- REPLACE 1.0.x (link title and url tree link) AND DATE

Template to copy:
## [1.0.x](https://github.com/GnoxNahte/obsidian-auto-embed/tree/1.0.x) (2024-xx-xx)

**New Features & Improvements:**
- 

**Bugs Fixed:**
- 
-->
