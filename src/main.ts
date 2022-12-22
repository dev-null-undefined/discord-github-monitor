import {Logger,DecoratorSettings} from "./logger.js";
import config from "./config/config.json" assert {type: "json"};
import {Client} from "./client.js";


async function start() {
    const logger = new Logger();

    let dateDecoratorSettings = new DecoratorSettings();
    dateDecoratorSettings.prefixFunc = () => {
        return new Date().toLocaleString();
    };
    dateDecoratorSettings.prefix = " ["
    dateDecoratorSettings.suffix = "]"
    logger.decorate(dateDecoratorSettings);

    const client = new Client(config.token, logger);
    client.login();

    await client.loggedInPromise;
    await client.readyPromise;

    logger.log("Discord bot is ready! Starting scheduler...");
}

start();
