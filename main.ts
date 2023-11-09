import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';

/*
ToDos:
    - Support other youtube patterns
    - Add support for finding link if more than link is selected
    - Seperate settings from main
*/

interface EnhanceYouTubeLinksPluginSettings {
    includeExtraMetadata: boolean;
    includeChannelName: boolean;
    includeChannelURL: boolean;
    includeChannelThumbnail: boolean;
    combineChannelNameAndURL: boolean;
    enableRibbonIcon: boolean;
    enableCommandPalette: boolean;
}

const DEFAULT_SETTINGS: EnhanceYouTubeLinksPluginSettings = {
    includeExtraMetadata: false,
    includeChannelName: true,
    includeChannelURL: true,
    includeChannelThumbnail: true,
    combineChannelNameAndURL: false,
    enableRibbonIcon: true,
    enableCommandPalette: true
}

let lineCount: number = 1
let indentLevel: number = 0
let leadingString: string = ''

export default class EnhanceYouTubeLinksPlugin extends Plugin {
    settings: EnhanceYouTubeLinksPluginSettings;

    async onload() {
        await this.loadSettings();

        const editor = this.app.workspace.activeEditor?.editor;
        if (editor) {
            if (this.settings.enableRibbonIcon) {
                this.addRibbonIcon('youtube', 'Get YouTube Data', (evt: MouseEvent) => {
                    this.processText(editor)
                })
            }
    
            if (this.settings.enableCommandPalette) {
                this.addCommand({
                    id: 'enhance-youtube-links-process-text',
                    name: 'Process Text',
                    editorCallback: (editor: Editor, view: MarkdownView) => {
                        this.processText(editor)

                    },
                })
            }
        }

        this.addSettingTab(new EnhanceYouTubeLinksSettingTab(this.app, this));
    }

    getBullet(text: string): void {
        if (text.match('^[\t]*[-]')) {
            leadingString = '- '
        }
        else {
            leadingString = ''
        }

    }

    async processText(editor: Editor) {

        const urlBase = 'https://www.youtube.com/oembed?url='

        const textSelected = editor.getSelection();

        if (textSelected.length > 0) {
            const line = editor.getCursor().line
            const lineSelected = editor.getLine(line)
            indentLevel = this.getIndentLevel(lineSelected)
            this.getBullet(lineSelected)

            if (textSelected?.startsWith('https://www.youtube.com') || textSelected?.startsWith('www.youtube.com') || textSelected?.startsWith('youtube.com')) {
                const urlFinal = urlBase + textSelected;
                const data = await this.getYouTubeData(urlFinal)

                if (data) {
                    let urlTitle: string = this.buildTitle(data, textSelected)
                    let result: string

                    result = lineSelected.replace(textSelected, urlTitle)

                    if (this.settings.includeExtraMetadata) {
                        result += this.buildMetadata(data)

                    }

                    editor.setLine(line, result)

                    if (this.settings.includeExtraMetadata) {
                        editor.setCursor(line + lineCount, 0)

                    }
                    else {
                        editor.setCursor(line, lineSelected.indexOf(textSelected) + urlTitle.length)
                    }
                }
            }
            else {
                new Notice('Text selected does not match YouTube URL pattern')
            }
        }
        else {
            new Notice('No text selected')
        }
    }

    async getYouTubeData(url: string) {
        try {
            const response = await requestUrl(url)
            const data = await response.json

            return data

        } catch (error) {
            new Notice('No result')
        }
    }

    resetVariables() {
        lineCount = 1
        indentLevel = 0
        leadingString = ''
    }

    getIndent(): string {
        if (indentLevel <= 0) {
            return ''
        }
        else {
            return '\t'.repeat(indentLevel)
        }
    }

    getIndentLevel(lineText: string): number {
        const matchString = '^\t*'
        const matches = lineText.match(matchString)

        if (matches && matches.length > 0) {
            return (matches[0].length)
        }
        else {
            return 0
        }
    }

    buildMetadata(data: any): string {
        let authorName: string
        let authorURL: string
        let thumbnailURL: string
        let result: string

        result = ''

        if (this.settings.includeChannelName && this.settings.includeChannelURL) {
            result += '\n' + this.getIndent() + '\t' + leadingString + 'Channel:'
            authorName = data.author_name
            authorURL = data.author_url
            result += '\n' + this.getIndent() + '\t\t' + leadingString + '[' + authorName + ']' + '(' + authorURL + ')'
            lineCount += 2
        }
        else {
            if (this.settings.includeChannelName) {
                result += '\n' + this.getIndent() + '\t' + leadingString + 'Channel:'
                authorName = data.author_name
                result += '\n' + this.getIndent() + '\t\t' + leadingString + authorName
                lineCount += 2
            }

            if (this.settings.includeChannelURL) {
                result += '\n' + this.getIndent() + '\t' + leadingString + 'Channel URL:'
                authorURL = data.author_url
                result += '\n' + this.getIndent() + '\t\t' + leadingString + authorURL
                lineCount += 2
            }
        }

        if (this.settings.includeChannelThumbnail) {
            result += '\n' + this.getIndent() + '\t' + leadingString + 'Thumbnail:'
            thumbnailURL = data.thumbnail_url
            result += '\n' + this.getIndent() + '\t\t' + leadingString + '![](' + thumbnailURL + ')'
            lineCount += 2
        }

        return result
    }

    buildTitle(data: any, url: string): string {
        let title: string
        let titleURL: string

        title = data.title

        titleURL = '[' + title.replace('[', '').replace(']', '') + '](' + url + ')'

        return titleURL
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class EnhanceYouTubeLinksSettingTab extends PluginSettingTab {
    plugin: EnhanceYouTubeLinksPlugin;

    constructor(app: App, plugin: EnhanceYouTubeLinksPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {

        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Add extra metadata')
            .setDesc('Channel name, channel URL, thumbnail')
            .addToggle((cb) => {
                cb.setValue(this.plugin.settings.includeExtraMetadata)
                cb.onChange(async (value) => {
                    this.plugin.settings.includeExtraMetadata = value;
                    await this.plugin.saveSettings();
                    this.display();

                })
            })

        if (this.plugin.settings.includeExtraMetadata) {

            new Setting(containerEl)

                .setName('Channel name')
                .addToggle((cb) => {
                    cb.setValue(this.plugin.settings.includeChannelName)
                    cb.onChange(async (value) => {
                        this.plugin.settings.includeChannelName = value;
                        await this.plugin.saveSettings();
                        this.display();
                    })


                })

            new Setting(containerEl)
                .setName('Channel URL')
                .addToggle((cb) => {
                    cb.setValue(this.plugin.settings.includeChannelURL)
                    cb.onChange(async (value) => {
                        this.plugin.settings.includeChannelURL = value;
                        await this.plugin.saveSettings();
                        this.display();
                    })
                })

            if (this.plugin.settings.includeChannelName && this.plugin.settings.includeChannelURL) {
                new Setting(containerEl)
                    .setName('Combine channel name and channel URL')
                    .addToggle((cb) => {
                        cb.setValue(this.plugin.settings.combineChannelNameAndURL)
                        cb.onChange(async (value) => {
                            this.plugin.settings.combineChannelNameAndURL = value;
                            await this.plugin.saveSettings();
                            this.display();
                        })
                    })
            }

            new Setting(containerEl)
                .setName('Thumbnail')
                .addToggle((cb) => {
                    cb.setValue(this.plugin.settings.includeChannelThumbnail)
                    cb.onChange(async (value) => {
                        this.plugin.settings.includeChannelThumbnail = value;
                        await this.plugin.saveSettings();
                    })
                })
        }

        new Setting(containerEl)
            .setName('Enable ribbon icon')
            .addToggle((cb) => {
                cb.setValue(this.plugin.settings.enableRibbonIcon)
                cb.onChange(async (value) => {
                    this.plugin.settings.enableRibbonIcon = value;
                    await this.plugin.saveSettings();
                })
            })
            .setDesc('Requires reload for change to reflect')

        new Setting(containerEl)
            .setName('Enable command palette')
            .addToggle((cb) => {
                cb.setValue(this.plugin.settings.enableCommandPalette)
                cb.onChange(async (value) => {
                    this.plugin.settings.enableCommandPalette = value;
                    await this.plugin.saveSettings();
                })
            })
            .setDesc('Requires reload for change to reflect')
    }
}