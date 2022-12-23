import {SimpleGit, simpleGit, FetchResult, LogResult} from 'simple-git';
import {StorageManager} from "../storage/storage.js";
import {Logger, LogLevel} from "../logger.js";

type url = string;
type path = string;

export class GitControllerSettings {

    static readonly typeId = "git-controller-settings-git-controller-settings-d2aed64a-495f-4923-ba97-7409cad1560e";

    readonly url: url;
    readonly branches: string[];

    constructor(url: url, branches: string[]) {
        this.url = url;
        this.branches = branches;
    }
}


function promiseAllOutOfOrder<T>(values: (T | PromiseLike<T>)[]): Promise<Awaited<T>[]> {
    return new Promise((resolve) => {
        let results = new Array<Awaited<T>>();
        let completed = 0;

        values.forEach((value) => {
            Promise.resolve(value).then(result => {
                results.push(result);
                completed += 1;

                if (completed == values.length) {
                    resolve(results);
                }
            }).catch(error => {
                Logger.globalInstance.log(error.message, LogLevel.ERROR);
                completed += 1;
            });
        });
    });
}

function promiseAllMap<K, T>(map: Map<K, T | PromiseLike<T>>): Promise<Map<K, T>> {
    return new Promise((resolve, reject) => {
        let results = new Map<K, T>();
        let completed = 0;

        map.forEach((value, index) => {
            Promise.resolve(value).then(result => {
                results.set(index, result);
                completed += 1;

                if (completed == map.size) {
                    resolve(results);
                }
            }).catch(error => {
                completed += 1;
                Logger.globalInstance.log(error.message, LogLevel.ERROR);
                return Promise.resolve(error);
            });
        });
    });
}

export class GitController {
    readonly settings: GitControllerSettings;

    private _git: SimpleGit;
    private _path: path;

    private constructor(settings: GitControllerSettings, path: path) {
        this.settings = settings;
        this._git = simpleGit(path);
        this._path = path;
    }

    static load(settings: GitControllerSettings, path: path): GitController {
        return new GitController(settings, path);
    }

    static create(settings: GitControllerSettings, path: path): GitController {
        let controller = new GitController(settings, path);
        controller._git.init();
        controller._git.addRemote("origin", controller.settings.url);
        return controller;
    }

    fetch(): Promise<FetchResult[]> {
        let promises: Promise<FetchResult>[] = [];
        for (let branch of this.settings.branches) {
            promises.push(this._git.fetch("origin", branch));
        }
        return promiseAllOutOfOrder(promises);
    }

    commits(): Promise<Map<string, LogResult>> {
        let commits: Map<string, Promise<LogResult>> = new Map();
        for (let branch of this.settings.branches) {
            commits.set(branch, this._git.log(["origin/" + branch, "-n 10"]));
        }
        return promiseAllMap(commits);
    }

    addBranch(branch: string) {
        this.settings.branches.push(branch);
        StorageManager.instance.update(GitControllerSettings.typeId, this.settings, this._path);
    }

    get branches(): string[] {
        return [...this.settings.branches]
    }
}

export class GitControllerDatabase {
    private static _instance: GitControllerDatabase;

    private _controllers: Map<url, GitController> = new Map<url, GitController>();

    private constructor() {
        StorageManager.instance.getAll<GitControllerSettings>(GitControllerSettings.typeId).forEach(settings => {
            this._controllers.set(settings.data.url, GitController.load(settings.data, settings.path));
        });
    }

    static get instance(): GitControllerDatabase {
        if (this._instance === undefined) {
            this._instance = new GitControllerDatabase();
        }
        return this._instance;
    }

    getController(url: url, branches: string[] = ["master", "main"]): GitController {
        if (this._controllers.has(url)) {
            return this._controllers.get(url)!;
        } else {
            const settings = new GitControllerSettings(url, branches);
            const path = StorageManager.instance.save(GitControllerSettings.typeId, settings);
            const controller = GitController.create(settings, path);
            this._controllers.set(url, controller);
            return controller;
        }
    }

    addBranch(url: url, branch: string) {
        if (this._controllers.has(url)) {
            this._controllers.get(url)!.addBranch(branch);
        } else {
            throw new Error("Controller not found!");
        }
    }

    listControllers(url?: string | null): Map<String, string[]> {
        let result = new Map<string, Array<string>>;
        if (url !== undefined && url !== null) {
            if (!this._controllers.has(url)) {
                throw new Error("No repository with that URL!");
            }
            result.set(url, this.getController(url).branches)
        } else {
            this._controllers.forEach((controller, url) => {
                result.set(url, controller.branches);
            })
        }
        return result;
    }

    listURLs(): string[] {
        return [...this._controllers.keys()];
    }
}
