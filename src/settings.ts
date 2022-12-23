import * as fs from 'fs';
import {v4 as uuid} from 'uuid';

function copyValues(from: any, to: any) {
    for (let key in from) {
        if (to.hasOwnProperty(key)) {
            if(typeof from[key] === 'object') {
                copyValues(from[key], to[key]);
            } else {
                to[key] = from[key];
            }
        }
    }
}

function assertAllPropertiesAreSet(object: any) {
    for (let key in object) {
        if (object.hasOwnProperty(key)) {
            if (object[key] === undefined) {
                throw new Error("Property " + key + " is not set!");
            } else if (typeof object[key] === 'object') {
                object[key]._assertAllPropertiesAreSet();
            } else if (typeof object[key] === "string" && object[key] === Settings.unsetString) {
                throw new Error("Property " + key + " is not set!");
            }
        }
    }
}

export class Settings {
    private static instance: Settings;
    static readonly settingsPath = "./config/settings.json";

    static readonly unsetString: string = uuid();

    private constructor() {
        if (!fs.existsSync(Settings.settingsPath)) {
            fs.writeFileSync(Settings.settingsPath, JSON.stringify({}));
        }
        const rawData = fs.readFileSync(Settings.settingsPath);
        const jsonData = JSON.parse(rawData.toString());
        copyValues(jsonData, this);
        assertAllPropertiesAreSet(this);
    }


    static getInstance(): Settings {
        if (!Settings.instance) {
            Settings.instance = new Settings();
        }
        return Settings.instance;
    }

    token: string = Settings.unsetString;
    storagePath: string = Settings.unsetString;
}