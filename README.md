[![GitHub manifest version](https://img.shields.io/github/manifest-json/v/gnoxnahte/obsidian-tab-panels)](../../releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/gnoxnahte/obsidian-tab-panels)](../../commits/main/)
[![GitHub Open Issues](https://img.shields.io/github/issues/gnoxnahte/obsidian-tab-panels)](../../issues)
[![GitHub Closed Issues](https://img.shields.io/github/issues-closed/gnoxnahte/obsidian-tab-panels)](../../issues?q=is%3Aissue+is%3Aclosed)
[![GitHub License](https://img.shields.io/github/license/gnoxnahte/obsidian-tab-panels)](/LICENSE)
[![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&query=%24%5B%22tab-panels%22%5D.downloads&logo=obsidian&logoColor=a88bfa&label=downloads&color=a88bfa)](https://obsidian.md/plugins?id=tab-panels)

# obsidian-tab-panels
[Obsidian](https://obsidian.md/) plugin to easily create tab panels to organize content into sections.

Install link: https://obsidian.md/plugins?id=tab-panels

## Getting Started
### Preview

https://github.com/user-attachments/assets/0eff7ace-bea9-4c7d-9a24-18d1b08f3e9c

Left - How it looks when it's rendered out (Live Preview/Reading mode) <br>
Right - The markdown used to render it (Source mode)

[Markdown used in the video](/readme-assets/preview-markdown.md?plain=1). <br>
Try copying it to view how it looks like in your vault!

### Syntax 
````
```tabs
--- Tab 1
Content for tab 1

--- Tab 2
Content for tab 2
```
````

> [!Tip]
> Add `(default)` to the tab name to open it automatically <br>
> Example: `--- Default tab (default)`
> 

## Additional Features
### Cache (Experimental)
The cache feature enables Obsidian to process data inside the tab panels, just like it does for regular markdown content. This means that **links, headings, and tags** within tab panels are now fully integrated with Obsidian's core functionality.

What this enables (similar to Obsidian's standard behaviour, but **now works in tab panels**):
- [Backlinks](https://help.obsidian.md/Plugins/Backlinks) and [Outgoing links](https://help.obsidian.md/Plugins/Outgoing+links) works.
- [Renaming linked files](https://help.obsidian.md/Files+and+folders/Manage+notes#Rename+a+note) updates markdown links in tab panels automatically.
- Headings in tab panels appear in the [Outline](https://help.obsidian.md/Plugins/Outline) (Table of Contents).
- [Tags](https://help.obsidian.md/Editing+and+formatting/Tags) within tab panels are searchable and visible in the [Tags view](https://help.obsidian.md/Plugins/Tags+view).
- Plugins like [Dataview](https://github.com/blacksmithgu/obsidian-dataview) can query and use data within tab panels.

> [!WARNING]
> Experimental Feature
> This feature is marked as experimental due to its complexity and recent release. While testing has shown it works as intended, there may still be edge cases or unexpected issues.
> - If you encounter any problems, please report them [here](https://github.com/GnoxNahte/obsidian-tab-panels/issues/new?template=bug-report.yml).
> - This feature does not modify your files, so even if something goes wrong, your data is safe.

<!-- TODO: ## Styles -->

## Known Issues & Limitations

### Adding code blocks inside the tab contents
If you use ` ``` tabs` to define the code blocks, Obsidian will assume you would want to close the tab panels when you use ` ``` ` again when you want to open a markdown code block. 

To solve this, do one of these:
- Use a different number of backticks for each code block.
`````
```` tabs
--- Tab 1
``` python
print("Hello world!")
```
````
`````
- Switch between `~~~` and ` ``` ` for declaring the tab panels block and for the markdown code block inside the tab contents.

`````
~~~ tabs
--- Tab 1
``` python
print("Goodbye world!")
```
~~~
`````

### Editing tab content
The plugin will only display a read-only version of the notes. Any interactivity will be lost. For example, checking a checkbox will not work.

## Roadmap
- [ ] Add more settings to control styling

Please [suggest any features](../../issues/new/choose) you want!

## Feedback
Have some feedback? Create a GitHub issue: [Bug report](https://github.com/GnoxNahte/obsidian-tab-panels/issues/new?template=bug-report.yml) or [Feature request](https://github.com/GnoxNahte/obsidian-tab-panels/issues/new?template=feature-request.md)
Questions (e.g. unsure how to use the plugin): [GitHub discussions](https://github.com/GnoxNahte/obsidian-tab-panels/discussions)

## Credits
- [Syntax](#syntax) was inspired by [Obsidian HTML Tabs](https://github.com/ptournet/obsidian-html-tabs), made by [ptournet](https://github.com/ptournet)