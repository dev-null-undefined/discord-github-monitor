import fs from 'fs';
import chalk from 'chalk';

export enum LogLevel {
    INFO,
    WARN,
    ERROR,
    DEBUG
}

export class DecoratorSettings {
    level: LogLevel | null;
    levels: LogLevel[] | null;
    prefix: string;
    suffix: string;
    decorator: (message: string, level: LogLevel) => string;
    suffixFunc: () => string;
    prefixFunc: () => string;

    constructor() {
        this.level = null;
        this.levels = [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.DEBUG];
        this.prefix = "";
        this.suffix = "";
        this.decorator = (message: string, level: LogLevel) => message;
        this.suffixFunc = () => "";
        this.prefixFunc = () => "";
    }

    clone(): DecoratorSettings {
        const clone = new DecoratorSettings();
        clone.level = this.level;
        clone.levels = this.levels;
        clone.prefix = this.prefix;
        clone.suffix = this.suffix;
        clone.decorator = this.decorator;
        clone.suffixFunc = this.suffixFunc;
        clone.prefixFunc = this.prefixFunc;
        return clone;
    }
}

class CustomDecorator {
    private _settings: DecoratorSettings;

    constructor(decoratorSettings: DecoratorSettings) {
        if (!(decoratorSettings instanceof DecoratorSettings)) {
            throw new Error("DecoratorSettings expected");
        }
        if (decoratorSettings.levels !== null && decoratorSettings.level !== null) {
            throw new Error("Cannot set both level and levels");
        }
        this._settings = decoratorSettings;
    }

    decorate(text: string, level: LogLevel):string {
        if (this._settings.level !== null && level !== this._settings.level) {
            return text;
        }
        if (this._settings.levels !== null && !this._settings.levels.includes(level)) {
            return text;
        }
        return this._settings.decorator(this._settings.prefixFunc() + this._settings.prefix + text + this._settings.suffix + this._settings.suffixFunc(), level);
    }

    clone(): CustomDecorator {
        return new CustomDecorator(this._settings.clone());
    }
}

export class Logger {
    private _log: (message: string) => void;
    private _decorators: CustomDecorator[];

    constructor(output = console.log) {
        switch (typeof output) {
            case 'function':
                this._log = output;
                break;
            case 'string':
                this._log = (message) => {
                    fs.appendFile(output, message, {encoding: "utf-8", mode: 0o666, flag: "a"}, (err) => {
                        if (err) {
                            this._log = console.log;
                            this._log(chalk.red("Error writing to log file! (falling back to console)"));
                        }
                    });
                }
                break;
            default:
                throw new Error('Invalid output type');
        }
        this._decorators = [];
        this.decorate((message: string, level: LogLevel) => {
            switch (level) {
                case LogLevel.INFO:
                    return chalk.blue(message);
                case LogLevel.WARN:
                    return chalk.yellow(message);
                case LogLevel.ERROR:
                    return chalk.red(message);
                case LogLevel.DEBUG:
                    return chalk.green(message);
                default:
                    return message;
            }
        });
    }

    _addDecorator(decorator: CustomDecorator, prepend: boolean) {
        if (prepend) {
            this._decorators.unshift(decorator);
        } else {
            this._decorators.push(decorator);
        }
    }

    decorate(decorator: ((message: string, level: LogLevel) => string) | CustomDecorator | DecoratorSettings, prepend:boolean = false, level = null) {
        switch (typeof decorator) {
            case 'function':
                const decoratorSettings = new DecoratorSettings();
                decoratorSettings.decorator = decorator;
                decoratorSettings.level = level;
                const customDecorator = new CustomDecorator(decoratorSettings);
                this._addDecorator(customDecorator, prepend);
                break;
            case 'object':
                if (decorator instanceof CustomDecorator) {
                    this._addDecorator(decorator, prepend);
                } else if (decorator instanceof DecoratorSettings) {
                    this._addDecorator(new CustomDecorator(decorator), prepend);
                } else {
                    throw new Error('Invalid decorator type');
                }
                break;
            default:
                throw new Error('Invalid decorator type');
        }
    }

    log(message:string, level:LogLevel = LogLevel.INFO) {
        this._decorators.forEach(decorator => {
            message = decorator.decorate(message, level);
        });
        this._log(message);
    }

    clone(): Logger {
        const logger = new Logger();
        this._decorators.forEach(decorator => {
            logger._decorators.push(decorator.clone());
        });
        return logger;
    }
}