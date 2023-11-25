import { Editor, MarkdownView, Notice, Plugin, requestUrl } from 'obsidian';
import { EnhanceYouTubeLinksSettingTab } from './settings';

/*
ToDos:
    - add the title of the video by default ?
    - Support other youtube patterns
    - Add support for finding link if more than link is selected
    - Separate settings from main. done
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
    combineChannelNameAndURL: false,// true?
    enableRibbonIcon: true,
    enableCommandPalette: true
}

let lineCount: number = 1
let indentLevel: number = 0
let leadingString: string = ''

export default class EnhanceYouTubeLinksPlugin extends Plugin {
    settings: EnhanceYouTubeLinksPluginSettings;
    ribbonIconEl!: HTMLElement | null;

    async onload() {
        await this.loadSettings();

        if (this.settings.enableRibbonIcon) {
            this.ribbonIconHandler() // code in a function to remove it from settings
        }

        if(this.settings.enableCommandPalette){
            this.addCommandHandler()
        }



        this.addSettingTab(new EnhanceYouTubeLinksSettingTab(this.app, this));
    }

    ribbonIconHandler(){
        // we put  addRibbonIcon() in a variable to delete it from settings 
        this.ribbonIconEl =this.addRibbonIcon('youtube', 'Get YouTube data' , (evt: MouseEvent) => {
            const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
            if(editor) this.processText(editor)
        })
    }

    addCommandHandler(){
        this.addCommand({
            id: 'enhance-youtube-links-process-text',
            name: 'Process Text',
            // with editor|Check|Callback → editor: provides active editor, check: if not checking command in palette 
            editorCheckCallback: (checking: boolean, editor: Editor, view: MarkdownView) => {
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!checking) // command is in palette
                    this.processText(editor)
                return !!markdownView && !!editor.somethingSelected() &&
                 editor.getSelection().contains("youtu"); // the condition to check. 'youtu' to cover links like https://youtu.be/abcdefghij
            },
        })
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

