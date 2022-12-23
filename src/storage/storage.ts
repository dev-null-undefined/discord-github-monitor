import * as fs from 'fs';
import {Logger, LogLevel} from "../logger.js";
import {Settings} from "../settings.js";
import {v4 as uuid} from 'uuid';

type Path = string;


class StorageData {

    private static readonly configPath = ".storage.json";

    readonly typeId: string;
    readonly path: Path;
    private _data: any;

    private constructor(path: Path, typeId?: string, data?: any) {
        this.path = path;
        if ((typeId === undefined) != (data === undefined)) {
            // this is simulation of overloaded constructor
            throw new Error("typeId and data must be provided together or not at all");
        }
        if (typeId === undefined) {
            const rawData = fs.readFileSync(this._configPath(), {encoding: "utf-8"});
            const json = JSON.parse(rawData.toString());
            this.typeId = json.typeId;
            this._data = json.data;
        } else {
            this.typeId = typeId;
            this._data = data;
            fs.writeFileSync(this._configPath(), this._stringify());
        }
    }

    private _configPath(): Path {
        return this.path + "/" + StorageData.configPath;
    }

    private _stringify(): string {
        return JSON.stringify({typeId: this.typeId, data: this._data});
    }

    get data(): any {
        return this._data;
    }

    set data(value: any) {
        this._data = value;
        fs.writeFileSync(this._configPath(), this._stringify());
    }

    static load(path: Path): StorageData {
        return new StorageData(path);
    }

    static save(path: Path, typeId: string, data: any): StorageData {
        return new StorageData(path, typeId, data);
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
    private static _storagePath: (Path | null) = null;

    private _objects: Map<Path, StorageData> = new Map();

    private constructor() {
        if (StorageManager._storagePath === null) {
            throw new Error("StorageManager not configured!");
        }
        const files = fs.readdirSync(StorageManager._storagePath);
        for (const file of files) {
            const stat = fs.statSync(StorageManager._storagePath + "/" + file);
            const logger = Logger.globalInstance;
            if (stat.isDirectory()) {
                logger.log(`Loading storage unit ${file}...`, LogLevel.DEBUG);
                this._objects.set(file, StorageData.load(StorageManager._storagePath + "/" + file));
            } else {
                logger.log("Found file in storage path: " + file, LogLevel.WARN);
            }
        }
    }

    private static set storagePath(path: Path) {
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
            if (value.typeId === typeId) {
                result.push(new StorageExposer<T>(value.data as T, value.path + "/data"));
            }
        });
        return result;
    }

    save<T>(typeId: string, data: T): Path {
        const logger = Logger.globalInstance;
        const id = uuid();
        logger.log(`Saving storage unit ${id}...`, LogLevel.DEBUG);
        let path = StorageManager._storagePath + "/" + id;
        fs.mkdirSync(path);
        const storageData = StorageData.save(path, typeId, data);
        this._objects.set(id, storageData);
        fs.mkdirSync(path + "/data");
        return path + "/data";
    }

    update<T>(typeId: string, data: T, path: Path) {
        const storeUnit = this._objects.get(path);
        if (storeUnit === undefined) {
            throw new Error("Path does not exist!");
        }
        if (storeUnit.data.typeId !== typeId) {
            throw new Error("Type id does not match!");
        }
        storeUnit.data.data = data;

    }
}