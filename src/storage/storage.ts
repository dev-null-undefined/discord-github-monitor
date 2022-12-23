import * as fs from 'fs';
import {Logger, LogLevel} from "../logger.js";
import {Settings} from "../settings.js";
import {v4 as uuid} from 'uuid';

type Path = string;


class StorageData {

    static readonly configPath = ".storage.json";

    readonly typeId: string;
    readonly data: any;

    private constructor(path: string, typeId?: string, data?: any) {
        if ((typeId === undefined) != (data === undefined)) {
            // this is simulation of overloaded constructor
            throw new Error("typeId and data must be provided together or not at all");
        }
        if (typeId === undefined) {
            const rawData = fs.readFileSync(path, {encoding: "utf-8"});
            const json = JSON.parse(rawData.toString());
            this.typeId = json.typeId;
            this.data = json.data;
        } else {
            this.typeId = typeId;
            this.data = data;
            fs.writeFileSync(path, JSON.stringify(this));
        }
    }


    static load(path: string): StorageData {
        return new StorageData(path);
    }

    static save(path: string, typeId: string, data: any): StorageData {
        return new StorageData(path, typeId, data);
    }
}

export class StoreUnit {
    readonly path: string;
    readonly data: StorageData;

    private constructor(path: string, data?: StorageData) {
        this.path = path;
        if (data === undefined) {
            this.data = StorageData.load(path + "/" + StorageData.configPath);
        } else {
            this.data = data;
        }
    }

    static load(path: string): StoreUnit {
        return new StoreUnit(path);
    }

    static create(path: string, data: StorageData): StoreUnit {
        return new StoreUnit(path, data);
    }
}

class StorageExposer<T> {
    readonly data: T;
    readonly path: Path;

    constructor(data: T, path: Path) {
        this.data = data;
        this.path = path;
    }
}

export class StorageManager {
    private static _instance: StorageManager;
    private static _storagePath: (string | null) = null;

    private _objects: Map<string, StoreUnit> = new Map();

    private constructor() {
        if(StorageManager._storagePath === null) {
            throw new Error("StorageManager not configured!");
        }
        const files = fs.readdirSync(StorageManager._storagePath);
        for (const file of files) {
            const stat = fs.statSync(StorageManager._storagePath + "/" + file);
            const logger = Logger.globalInstance;
            if (stat.isDirectory()) {
                logger.log(`Loading storage unit ${file}...`, LogLevel.DEBUG);
                this._objects.set(file, StoreUnit.load(StorageManager._storagePath + "/" + file));
            } else {
                logger.log("Found file in storage path: " + file, LogLevel.WARN);
            }
        }
    }

    private static set storagePath(path: string) {
        if (StorageManager._instance) {
            throw new Error("StorageManager already initialized!");
        }

        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
            if (!fs.existsSync(path)) {
                throw new Error("Storage path does not exist! And could not be created!");
            }
        }
        StorageManager._storagePath = path;
    }

    static configure(settings: Settings) {
        StorageManager.storagePath = settings.storagePath;
    }

    static get instance(): StorageManager {
        if (!StorageManager._instance) {
            StorageManager._instance = new StorageManager();
        }
        return StorageManager._instance;
    }

    getAll<T>(typeId: string): Array<StorageExposer<T>> {
        const result: Array<StorageExposer<T>> = [];
        this._objects.forEach((value) => {
            if (value.data.typeId === typeId) {
                result.push(new StorageExposer<T>(value.data.data as T, value.path + "/data"));
            }
        });
        return result;
    }

    save<T>(typeId: string, data: T): string {
        const logger = Logger.globalInstance;
        const id = uuid();
        logger.log(`Saving storage unit ${id}...`, LogLevel.DEBUG);
        let path = StorageManager._storagePath + "/" + id;
        fs.mkdirSync(path);
        const storageData = StorageData.save(path + "/" + StorageData.configPath, typeId, data);
        const storeUnit = StoreUnit.create(path, storageData);
        this._objects.set(id, storeUnit);
        fs.mkdirSync(path + "/data");
        return path + "/data";
    }
}