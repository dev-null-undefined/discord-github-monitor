import {Command} from "./command.js";
import Discord, {ChatInputCommandInteraction, CommandInteraction, SlashCommandBuilder} from "discord.js";
import {GitControllerDatabase} from "../git/git.js";

export class GitCommand extends Command {

    completer = this.autoComplete;
    private readonly _gitDatabase;

    constructor() {
        super();
        this._gitDatabase = GitControllerDatabase.instance;
        this.data = new SlashCommandBuilder()
            .setName('git')
            .setDescription('Git watcher commands')
            .addSubcommand(subcommand =>
                subcommand
                    .setName('list')
                    .setDescription('List active git watchers')
                    .addStringOption(option => option.setName('url').setDescription("Optional filter by url").setRequired(false).setAutocomplete(true)))
            .addSubcommand(subcommand =>
                subcommand
                    .setName('watch')
                    .setDescription('Create new git watcher')
                    .addStringOption(option => option.setName('new-url').setDescription("Git repository url").setRequired(true).setAutocomplete(true))
                    .addStringOption(option => option.setName('branch').setDescription("Git branch").setRequired(false).setAutocomplete(true)));
    }

    execute(interaction: ChatInputCommandInteraction): Promise<void> {
        switch (interaction.options.getSubcommand()) {
            case "list":
                const url = interaction.options.getString('url', false);
                const result = this._gitDatabase.listControllers(url);
                let content = "";
                result.forEach((value, key) => {
                    content += key + ": " + value.reduce((accum, current) => accum += current + ",", "");
                })
                return interaction.reply({content: content, ephemeral: true}).then();
            case "watch":
                const newUrl = interaction.options.getString('new-url', true);
                const branch = interaction.options.getString('branch', false);
                this._gitDatabase.getController(newUrl, branch ? branch.split(",") : []);
                return interaction.reply({content: "Added new watcher for " + newUrl, ephemeral: true}).then();
        }
        return Promise.resolve(undefined);
    }

    autoComplete(interaction: Discord.AutocompleteInteraction): Promise<void> {
        let focusedOption = interaction.options.getFocused(true);
        let choice: string[] = [];
        switch (focusedOption.name) {
            case "url":
                let urls = this._gitDatabase.listURLs();
                choice = urls.filter(choice => choice.startsWith(focusedOption.value));
                break;
            case "new-url":
                if (focusedOption.value.split(":").length == 2) {
                    choice.push(`https://github.com/${focusedOption.value.replace(":", "/")}`);
                } else {
                    choice.push("https://github.com/" + focusedOption.value);
                }
                break;
            case "branch":
                if (focusedOption.value.indexOf("master,") === -1) choice.push("master," + focusedOption.value);
                if (focusedOption.value.indexOf("main,") === -1) choice.push("main," + focusedOption.value);
        }
        return interaction.respond(
            choice.map(choice => ({name: choice, value: choice})),
        );
    }
}
