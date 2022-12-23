import {Command, CommandSettings, SubCommand} from "./command.js";
import Discord, {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
} from "discord.js";
import {GitControllerDatabase} from "../git/git.js";

export class GitListCommand extends SubCommand {
    completer = this.autoComplete;

    autoComplete(interaction: AutocompleteInteraction): Promise<void> {
        let focusedOption = interaction.options.getFocused(true);
        let choice: string[] = [];

        switch (focusedOption.name) {
            case "url":
                let urls = (this._parent as GitCommand).gitDatabase.listURLs();
                choice = urls.filter(choice => choice.startsWith(focusedOption.value));
                break;
        }
        return interaction.respond(
            choice.map(choice => ({name: choice, value: choice})),
        );
    }

    constructor(parent: Command) {
        class GitListCommandSettings extends CommandSettings {
            constructor() {
                super("list", "List all watched repositories and their branches");
            }

            override optionsBuilder<T extends Discord.SharedNameAndDescription & Discord.SharedSlashCommandOptions>(builder: T): T {
                return <T>builder.addStringOption(option => option.setName('url').setDescription("Optional filter by url").setRequired(false).setAutocomplete(true));
            }
        }

        super(new GitListCommandSettings(), parent);
    }

    execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const url = interaction.options.getString('url', false);
        const result = (this._parent as GitCommand).gitDatabase.listControllers(url);
        let content = "";
        result.forEach((value, key) => {
            content += key + ": " + value.reduce((accum, current) => accum += current + ",", "") + "\n";
        })
        return interaction.reply({content: content, ephemeral: true}).then();
    }
}

export class GitWatchCommand extends SubCommand {
    completer = this.autoComplete;

    autoComplete(interaction: AutocompleteInteraction): Promise<void> {
        let focusedOption = interaction.options.getFocused(true);
        let choice: string[] = [];

        switch (focusedOption.name) {
            case "url":
                if (focusedOption.value.split(":").length == 2) {
                    choice.push(`https://github.com/${focusedOption.value.replace(":", "/")}`);
                } else {
                    choice.push("https://github.com/" + focusedOption.value);
                }
                break;
            case "branch":
                if (focusedOption.value.indexOf("master,") === -1) choice.push("master," + focusedOption.value);
                if (focusedOption.value.indexOf("main,") === -1) choice.push("main," + focusedOption.value);
                break;
        }
        return interaction.respond(
            choice.map(choice => ({name: choice, value: choice})),
        );
    }

    constructor(parent: Command) {
        class GitWatchCommandSettings extends CommandSettings {
            constructor() {
                super("watch", "Watch a new repository");
            }

            override optionsBuilder<T extends Discord.SharedNameAndDescription & Discord.SharedSlashCommandOptions>(builder: T): T {
                return <T>builder.addStringOption(option => option.setName('url').setDescription("Url of the repository").setRequired(true).setAutocomplete(true))
                    .addStringOption(option => option.setName('branch').setDescription("Branch of the repository").setRequired(false).setAutocomplete(true));
            }
        }

        super(new GitWatchCommandSettings(), parent);
    }

    execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const newUrl = interaction.options.getString('url', true);
        const branch = interaction.options.getString('branch', false);
        (this._parent as GitCommand).gitDatabase.getController(newUrl, branch ? branch.split(",") : []);
        return interaction.reply({content: "Added new watcher for " + newUrl, ephemeral: true}).then();
    }
}


export class GitCommand extends Command {

    readonly gitDatabase;

    completer = this.autoComplete;

    constructor() {
        super(new CommandSettings("git", "Git commands"));
        this.addSubCommand(new GitListCommand(this));
        this.addSubCommand(new GitWatchCommand(this));

        this.gitDatabase = GitControllerDatabase.instance;
    }

    execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subCommand = this._subCommands.get(interaction.options.getSubcommand());
        if (subCommand && subCommand.completer) {
            return subCommand.execute(interaction);
        }
        return Promise.resolve(undefined);
    }

    autoComplete(interaction: Discord.AutocompleteInteraction): Promise<void> {
        const subCommand = this._subCommands.get(interaction.options.getSubcommand());
        if (subCommand && subCommand.completer) {
            return subCommand.completer(interaction);
        }
        return interaction.respond([]);
    }
}
