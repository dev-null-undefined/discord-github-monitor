import * as fs from 'fs';
import {Logger, LogLevel} from "../logger.js";
import {Settings} from "../settings.js";
import {v4 as uuid} from 'uuid';


class StorageData {
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

    static save(path: string, typeId: string, data: any ): StorageData {
        return new StorageData(path, typeId, data);
    }
}

export class StoreUnit {
    private readonly _path: string;
    readonly data: StorageData;

    private constructor(path: string, data?: StorageData) {
        this._path = path;
        if (data === undefined) {
            this.data = StorageData.load(path + "/data.json");
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

export class StorageManager {
    private static instance: StorageManager;
    private static _storagePath: string;

    private _objects: Map<string, StoreUnit> = new Map();

    private constructor() {
        const files = fs.readdirSync(StorageManager._storagePath);
        for (const file of files) {
            const stat = fs.statSync(StorageManager._storagePath + "/" + file);
            const logger = Logger.getGlobalInstance();
            if (stat.isDirectory()) {
                logger.log(`Loading storage unit ${file}...`, LogLevel.DEBUG);
                this._objects.set(file, StoreUnit.load(StorageManager._storagePath + "/" + file));
            } else {
                logger.log("Found file in storage path: " + file, LogLevel.WARN);
            }
        }
    }

    private static set storagePath(path: string) {
        if (StorageManager.instance) {
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

    static getInstance(): StorageManager {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }

    getAll<T>(typeId: string): Array<T> {
        const result: Array<T> = [];
        this._objects.forEach((value) => {
            if (value.data.typeId === typeId) {
                result.push(value.data.data as T);
            }
        });
        return result;
    }

    save<T>(typeId: string, data: T) {
        const logger = Logger.getGlobalInstance();
        const id = uuid();
        logger.log(`Saving storage unit ${id}...`, LogLevel.DEBUG);
        fs.mkdirSync(StorageManager._storagePath + "/" + id);
        const storageData = StorageData.save(StorageManager._storagePath + "/" + id + "/data.json", typeId, data);
        this._objects.set(id, StoreUnit.create(StorageManager._storagePath + "/" + id, storageData));
    }
}