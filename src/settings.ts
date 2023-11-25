// settings in a news module to avoid to have to scroll to puch on the main...
// don't forget the export and to do all needed import (VSC helps...)
import { App, PluginSettingTab, Setting } from "obsidian";
import EnhanceYouTubeLinksPlugin from "./main";

export class EnhanceYouTubeLinksSettingTab extends PluginSettingTab {
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
                    if (this.plugin.settings.enableRibbonIcon){
                        this.plugin.ribbonIconHandler()// add ribbon
                    }
                    else{
                        this.plugin.ribbonIconEl?.remove();//del ribbon
                        this.plugin.ribbonIconEl = null;
                    }
                    await this.plugin.saveSettings();
                })
            })
            // .setDesc('Requires reload for change to reflect')
        
        // I don't think it's a good idea
        new Setting(containerEl)
            .setName('Enable command palette')
            .addToggle((cb) => {
                cb.setValue(this.plugin.settings.enableCommandPalette)
                cb.onChange(async (value) => {
                    this.plugin.settings.enableCommandPalette = value;
                    if(this.plugin.settings.enableCommandPalette){
                        this.plugin.addCommandHandler()
                    }
                    else{
                        await (this.app as any).commands.removeCommand("enhance-youtube-links:enhance-youtube-links-process-text")//command id found in app.commands.commands...
                    }
                    await this.plugin.saveSettings();
                })
            })
            .setDesc('Requires reload for change to reflect')
    }
}