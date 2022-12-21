import Discord from "discord.js";
import Git from "simple-git";
import {Logger, LogLevel,DecoratorSettings,CustomDecorator} from "./logger.mjs";
import config from "../config/config.json" assert {type: "json"};


function start() {
    const logger = new Logger();

    let dateDecoratorSettings = new DecoratorSettings();
    dateDecoratorSettings.prefixFunc = () => {
        return new Date().toLocaleString();
    };
    dateDecoratorSettings.prefix = " ["
    dateDecoratorSettings.suffix = "]"
    logger.decorate(dateDecoratorSettings);

    const client = new Discord.Client({
        intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMembers, Discord.GatewayIntentBits.GuildBans, Discord.GatewayIntentBits.GuildEmojisAndStickers, Discord.GatewayIntentBits.GuildIntegrations, Discord.GatewayIntentBits.GuildWebhooks, Discord.GatewayIntentBits.GuildInvites, Discord.GatewayIntentBits.GuildVoiceStates, Discord.GatewayIntentBits.GuildPresences, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.GuildMessageReactions, Discord.GatewayIntentBits.GuildMessageTyping, Discord.GatewayIntentBits.DirectMessages, Discord.GatewayIntentBits.DirectMessageReactions, Discord.GatewayIntentBits.DirectMessageTyping, Discord.GatewayIntentBits.MessageContent]
    });

    client.on("ready", () => {
        // print current date
        logger.log("Bot started");
        client.user.setActivity("git updates...", {type: Discord.ActivityType.Watching});
    });

    client.on("messageCreate", (message) => {
        if (message.author.bot) return;
        if(message.guildId) {
            logger.log(`Message received from ${message.author.username} in ${message.channel.name} in ${message.guild.name} "${message.content}"`);
        } else {
            logger.log(`Message received from ${message.author.username} "${message.content}"`);
        }
    });

    client.login(config.token).then(r => logger.log(`Logged in as bot "${client.user.username}"`)).catch(e => logger.log("Error logging in!" + e, LogLevel.ERROR));
}

start();
