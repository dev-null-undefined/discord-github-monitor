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
                    .addStringOption(option => option.setName('url').setDescription("Git repository url").setRequired(true).setAutocomplete(true)))
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
                break;
        }
        return Promise.resolve(undefined);
    }

    autoComplete(interaction: Discord.AutocompleteInteraction): Promise<void> {
        let focusedOption = interaction.options.getFocused(true);
        switch (focusedOption.name) {
            case "url":
                let choices = this._gitDatabase.listURLs();
                const filtered = choices.filter(choice => choice.startsWith(focusedOption.value));
                return interaction.respond(
                    filtered.map(choice => ({name: choice, value: choice})),
                );
        }
        return Promise.resolve(undefined);
    }
}
