import Discord, {ClientEvents, Events, REST, Routes} from "discord.js";
import {DecoratorSettings, Logger, LogLevel} from "./logger.js";
import {Awaitable} from "@discordjs/util";
import {allCommands} from "./commands/all-commands.js";
import {Settings} from "./settings.js";
import {Command} from "./commands/command.js";

export class ResolvablePromise<T> {
    private _resolve: (value: T | PromiseLike<T>) => void;
    private _reject: (err?: any) => void;
    readonly promise: Promise<T>;

    constructor() {
        this._resolve = () => {
        };
        this._reject = () => {
        };
        this.promise = new Promise((resolve: (value: T | PromiseLike<T>) => void, reject: (err?: any) => void) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    get resolve(): (value: T | PromiseLike<T>) => void {
        return this._resolve;
    }

    get reject(): (err?: any) => void {
        return this._reject;
    }
}

export enum States {
    CREATED,
    LOGGED_IN,
    READY,
    CLOSED,

    FAILED = -1,
}


export class Client {

    state = States.CREATED;

    private _rest: REST;

    private _commands: Map<string, Command> = new Map<string, Command>();

    private _logger: Logger;
    private _token: string;
    private readonly _intents: number[];
    private _client: Discord.Client;
    private _loggedIn: ResolvablePromise<void> | null;
    private _ready: ResolvablePromise<void> | null;

    private _decoratorSettings: DecoratorSettings;


    constructor(token: string, logger = new Logger()) {
        this._rest = new REST({version: '10'}).setToken(token);

        allCommands.forEach((commandGenerator) => {
            const command = commandGenerator();
            this._commands.set(command.data.name, command);
        });

        this._logger = logger.clone();
        this._decoratorSettings = new DecoratorSettings();
        this._decoratorSettings.priority = 150;
        this._decoratorSettings.prefix = "[Client {loading}] ";
        this._logger.decorate(this._decoratorSettings);

        this._token = token;
        this._intents = [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMembers, Discord.GatewayIntentBits.GuildBans, Discord.GatewayIntentBits.GuildEmojisAndStickers, Discord.GatewayIntentBits.GuildIntegrations, Discord.GatewayIntentBits.GuildWebhooks, Discord.GatewayIntentBits.GuildInvites, Discord.GatewayIntentBits.GuildVoiceStates, Discord.GatewayIntentBits.GuildPresences, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.GuildMessageReactions, Discord.GatewayIntentBits.GuildMessageTyping, Discord.GatewayIntentBits.DirectMessages, Discord.GatewayIntentBits.DirectMessageReactions, Discord.GatewayIntentBits.DirectMessageTyping, Discord.GatewayIntentBits.MessageContent];
        this._client = new Discord.Client({intents: this._intents});
        this._loggedIn = new ResolvablePromise();
        this._ready = new ResolvablePromise();

        this.readyPromise.then(() => {
            this._decoratorSettings.prefix = `[Client {${this._user.username}}] `;
        });

        this._client.on(Events.ClientReady, () => {
            if (!this._ready) {
                throw new Error("Client is ready but no ready promise was already resolved!");
            }
            this.state = States.READY;
            this._ready.resolve();
            this._ready = null;
            this._logger.log("Client is ready!");
            this._user.setActivity("git updates...", {type: Discord.ActivityType.Watching});
        });
    }

    private _assertClient() {
        if (!this._client.user) {
            this._logger.log("Client has no user!", LogLevel.ERROR);
            this.state = States.FAILED;
        }
        this._assertOk();
    }

    private _assertOk() {
        if (this.state === States.FAILED) {
            throw new Error("Client is in failed state");
        }
    }

    private get _user(): Discord.ClientUser {
        this._assertClient();
        if (this._client.user) {
            return this._client.user;
        }
        throw new Error("unreachable");
    }

    login() {
        this._assertOk();
        this._client.login(this._token).then(() => {
            if (!this._loggedIn) {
                throw new Error("Client is logged in but no login promise was already resolved!");
            }
            this._logger.log(`Logged in as bot "${this._user.username}"`)
            this._loggedIn.resolve();
            this._loggedIn = null;
            this.state = States.LOGGED_IN;
        }).catch((err) => {
            if (!this._loggedIn) {
                throw new Error("Client failed login but and login promise was already resolved!");
            }
            this._logger.log("Error logging in!", LogLevel.ERROR)
            this._loggedIn.reject(err);
            this.state = States.FAILED;
        });
    }

    get loggedInPromise() {
        if (this._loggedIn === null) {
            return Promise.resolve();
        }
        return this._loggedIn.promise;
    }

    get readyPromise() {
        if (this._ready === null) {
            return Promise.resolve();
        }
        return this._ready.promise;
    }

    on<S extends string | symbol>(event: Exclude<S, keyof ClientEvents>, listener: (...args: any[]) => Awaitable<void>,): this {
        this._client.on(event, listener);
        return this;
    }

    async registerCommands() {
        this._assertOk();
        this._logger.log("Registering commands...");
        let commands: string[] = [];
        this._commands.forEach((command) => commands.push(command.data.toJSON()));
        await this._rest.put(
            Routes.applicationCommands(Settings.instance.discord.applicationId),
            {body: commands},
        );
        this._client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isAutocomplete() && !interaction.isChatInputCommand()) return;
            const command = this._commands.get(interaction.commandName);

            if (!command) {
                this._logger.log(`No command matching ${interaction.commandName} was found.`, LogLevel.ERROR);
                return;
            }
            if (interaction.isChatInputCommand()) {
                try {
                    await command.execute(interaction);
                } catch (error) {
                    this._logger.log(`Error while executing command (${interaction.commandName}): ${error}`, LogLevel.ERROR);
                }
            } else if (interaction.isAutocomplete()) {
                try {
                    if (!command.completer) {
                        this._logger.log(`This command does not support autocomplete ${interaction.commandName}.`, LogLevel.ERROR);
                        return;
                    }
                    await command.completer(interaction);
                } catch (error) {
                    this._logger.log(`Error while autocompleting (${interaction.commandName}): ${error}`, LogLevel.ERROR);
                }
            }
        })
    }
}