```tabs
--- Intro to Tab Panels
## Introduction
Thanks for using **Tab Panels**!

This plugin allows you to create tab panels to organize your content. It uses Obsidian's markdown renderer so all your favourite markdown and plugin works too!

--- How to use

## Syntax
`--- Tab Name`
`Content`

> [!Tip] Settings a tab to open by default
> Add `(default)` to the tab name
> Example: `--- Default tab (default)`
```

```tabs
--- Markdown support
## Obsidian markdown

The plugin supports Markdown! 
Here's some examples:
### Heading
**Formatting**: **Bold**, *Italic*, ~~Strikethrough~~, ==Highlight==
Links: [[Internal Links]], [External links](https://obsidian.md)
> Quotes
- List

~~~cpp
std::cout << "===== NOTE: =====\n"
<< "Use ~~~ instead when defining code blocks\n"
<< "Or use ~~~tabs to create the code block instead"
<< "This prevent conflicts with the 2 syntax: ~~~ and ```";
~~~

> [!INFO] Found a bug or have a question?
> **Feedback**: Create a GitHub issue - [Bug report](https://github.com/GnoxNahte/obsidian-tab-panels/issues/new?template=bug-report.yml) or [Feature request](https://github.com/GnoxNahte/obsidian-tab-panels/issues/new?template=feature-request.md)
> **Questions** (e.g. unsure how to use the plugin): [GitHub discussions](https://github.com/GnoxNahte/obsidian-tab-panels/discussions)

--- Plugin support - Dataview
## Dataview
Files created today:
~~~dataview
LIST
WHERE this.file.cday = date(today)
~~~
```