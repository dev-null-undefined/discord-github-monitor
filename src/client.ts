import Discord, {ClientUser, GuildChannel, GuildTextBasedChannel} from "discord.js";
import {DecoratorSettings, Logger, LogLevel} from "./logger.js";

class ResolvablePromise<T> {
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (err?: any) => void;
    promise: Promise<T>;

    constructor() {
        this.resolve = () => {
        };
        this.reject = () => {
        };
        this.promise = new Promise((resolve: (value: T | PromiseLike<T>) => void, reject: (err?: any) => void) => {
            this.resolve = resolve;
            this.reject = reject;
        });
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

    private _logger: Logger;
    private _token: string;
    private readonly _intents: number[];
    private _client: Discord.Client;
    private _loggedIn: ResolvablePromise<void> | null;
    private _ready: ResolvablePromise<void> | null;

    private _decoratorSettings: DecoratorSettings;


    constructor(token: string, logger = new Logger()) {
        this._logger = logger.clone();
        this._decoratorSettings = new DecoratorSettings();
        this._decoratorSettings.prefix = "[Client {loading}] ";
        this._logger.decorate(this._decoratorSettings, true);

        this._token = token;
        this._intents = [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMembers, Discord.GatewayIntentBits.GuildBans, Discord.GatewayIntentBits.GuildEmojisAndStickers, Discord.GatewayIntentBits.GuildIntegrations, Discord.GatewayIntentBits.GuildWebhooks, Discord.GatewayIntentBits.GuildInvites, Discord.GatewayIntentBits.GuildVoiceStates, Discord.GatewayIntentBits.GuildPresences, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.GuildMessageReactions, Discord.GatewayIntentBits.GuildMessageTyping, Discord.GatewayIntentBits.DirectMessages, Discord.GatewayIntentBits.DirectMessageReactions, Discord.GatewayIntentBits.DirectMessageTyping, Discord.GatewayIntentBits.MessageContent];
        this._client = new Discord.Client({intents: this._intents});
        this._loggedIn = new ResolvablePromise();
        this._ready = new ResolvablePromise();

        this.readyPromise.then(() => {
            this._decoratorSettings.prefix = `[Client {${this._user.username}}] `;
        });

        this._client.on("ready", () => {
            if (!this._ready) {
                throw new Error("Client is ready but no ready promise was already resolved!");
            }
            this.state = States.READY;
            this._ready.resolve();
            this._ready = null;
            this._logger.log("Client is ready!");
            this._user.setActivity("git updates...", {type: Discord.ActivityType.Watching});
        });


        // TODO: remove
        this._client.on("messageCreate", (message) => {
            if (message.author.bot) return;
            // test if message is from guild and GuildTextBasedChannel
            if (message.guildId && (message.channel instanceof GuildChannel) && message.inGuild()) {
                this._logger.log(`Message received from ${message.author.username} in ${message.channel.name} in ${message.guild.name} "${message.content}"`);
            } else {
                this._logger.log(`Message received from ${message.author.username} "${message.content}"`);
            }
        });
    }

    _assertClient() {
        if (!this._client.user) {
            this._logger.log("Client has no user!", LogLevel.ERROR);
            this.state = States.FAILED;
        }
        this._assertOk();
    }

    _assertOk() {
        if (this.state === States.FAILED) {
            throw new Error("Client is in failed state");
        }
    }

    get _user(): Discord.ClientUser {
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
}