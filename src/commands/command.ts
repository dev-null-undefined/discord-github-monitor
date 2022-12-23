import Discord, {
    RESTPostAPIChatInputApplicationCommandsJSONBody
} from "discord.js";

export class CommandSettings {
    readonly name: string;
    readonly description: string;

    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }

    optionsBuilder<T extends Discord.SharedNameAndDescription & Discord.SharedSlashCommandOptions>(builder: T): T {
        return builder;
    }
}

export abstract class Command {

    protected _settings: CommandSettings;

    protected _subCommands: Map<string, Command> = new Map<string, Command>();

    protected constructor(settings: CommandSettings, subCommands: Command[] = []) {
        this._settings = settings;
        subCommands.forEach((command) => {
            this._subCommands.set(command._settings.name, command);
        });
    }

    addSubCommand(command: Command): void {
        this._subCommands.set(command._settings.name, command);
    }

    completer: ((interaction: Discord.AutocompleteInteraction) => Promise<void>) | null = null;

    abstract execute(interaction: Discord.ChatInputCommandInteraction): Promise<void>;

    private _build<T extends Discord.SharedNameAndDescription & Discord.SharedSlashCommandOptions>(builder: T): T {
        return this._settings.optionsBuilder(builder.setName(this._settings.name).setDescription(this._settings.description));
    }

    toDiscordSlashJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
        let builder = new Discord.SlashCommandBuilder();
        builder = this._build(builder);

        this._subCommands.forEach((command) => {
            builder.addSubcommand(subcommand => command._build(subcommand));
        });

        return builder.toJSON();
    }

    get name(): string {
        return this._settings.name;
    }
}

export abstract class SubCommand extends Command {
    protected _parent: Command;

    protected constructor(settings: CommandSettings, parent: Command) {
        super(settings);
        this._parent = parent;
    }
}