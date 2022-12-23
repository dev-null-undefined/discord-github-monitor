import {Logger, DateDecoratorSettings, LogLevelDecoratorSettings} from "./logger.js";
import {Client} from "./client.js";
import {Settings} from "./settings.js";
import {GitControllerDatabase} from "./git/git.js";
import {StorageManager} from "./storage/storage.js";
import {TaskManager} from "./tasks/manager.js";
import {SimpleTask} from "./tasks/task.js";

const begin = new Date();

const manager = new TaskManager();

manager.addTask(new SimpleTask("LoggerSetup", begin, async () => {
    const logger = Logger.globalInstance;
    logger.decorate(new DateDecoratorSettings());
    logger.decorate(new LogLevelDecoratorSettings());
}));

manager.addTask(new SimpleTask("LoadSettings", begin, async () => {
    Settings.instance;
}));

manager.addTask(new SimpleTask("StorageSetup", begin, async () => {
    StorageManager.configure(Settings.instance);
}));

manager.addTask(new SimpleTask("GitSetup", begin, async () => {
    const git = GitControllerDatabase.instance;
}));

manager.addTask(new SimpleTask("DiscordSetup", begin, async () => {
    const settings = Settings.instance;
    const client = new Client(settings.discord.token, Logger.globalInstance);
    client.login();

    await client.loggedInPromise;
    await client.readyPromise;
}));

manager.executeLoop();
