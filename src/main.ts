import {Logger, DateDecoratorSettings, LogLevelDecoratorSettings} from "./logger.js";
import {Client} from "./client.js";
import {Settings} from "./settings.js";
import {GitControllerDatabase} from "./git/git.js";
import {StorageManager} from "./storage/storage.js";
import {TaskManager} from "./tasks/manager.js";
import {SimpleTask} from "./tasks/task.js";
import {SlashCommandBuilder} from "discord.js";

const begin = new Date();

const manager = new TaskManager();

const logger = Logger.getGlobalInstanceOrCreate();
// logger is required by addTask method

manager.addTask(new SimpleTask("LoggerSetup", begin, async () => {
    const logger = Logger.getGlobalInstanceOrCreate();
    logger.decorate(new DateDecoratorSettings());
    logger.decorate(new LogLevelDecoratorSettings());
}));

manager.addTask(new SimpleTask("LoadSettings", begin, async () => {
    Settings.getInstanceOrCreate();
}));

manager.addTask(new SimpleTask("StorageSetup", begin, async () => {
    StorageManager.configure(Settings.instance);
    StorageManager.getInstanceOrCreate();
}));

manager.addTask(new SimpleTask("GitSetup", begin, async () => {
    const git = GitControllerDatabase.getInstanceOrCreate(manager);
}));

manager.addTask(new SimpleTask("DiscordSetup", begin, async () => {
    const settings = Settings.instance;
    const client = new Client(settings.discord.token, Logger.globalInstance);
    client.login();

    await client.loggedInPromise;
    await client.readyPromise;

    await client.registerCommands();
}));

manager.executeLoop();
