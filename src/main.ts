import {Logger, DateDecoratorSettings, LogLevelDecoratorSettings} from "./logger.js";
import {Client} from "./client.js";
import {Settings} from "./settings.js";

const logger = Logger.globalInstance;
logger.decorate(new DateDecoratorSettings());
logger.decorate(new LogLevelDecoratorSettings());

const settings = Settings.instance;


async function start() {
    const client = new Client(settings.token, logger);
    client.login();

    await client.loggedInPromise;
    await client.readyPromise;

    logger.log("Discord bot is ready! Starting scheduler...");
}

start();
