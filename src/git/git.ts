import {SimpleGit, simpleGit} from 'simple-git';
import {StorageManager} from "../storage/storage.js";

type url = string;
type path = string;

export class GitControllerSettings {

    static readonly typeId = "git-controller-settings-git-controller-settings-d2aed64a-495f-4923-ba97-7409cad1560e";

    readonly url: url;

    constructor(url: url) {
        this.url = url;
    }
}

export class GitController {

    readonly settings: GitControllerSettings;

    private _git: SimpleGit;
    private _path: path;

    constructor(settings: GitControllerSettings, path: path) {
        this.settings = settings;
        this._git = simpleGit(path);
        this._path = path;
    }
}

export class GitControllerDatabase {
        private static _instance: GitControllerDatabase;

        private _controllers: Map<url, GitController> = new Map<url, GitController>();

        readonly storage = StorageManager.getInstance();

        private constructor() {
            this.storage.getAll<GitControllerSettings>(GitControllerSettings.typeId).forEach(settings => {
                this._controllers.set(settings.data.url, new GitController(settings.data, settings.path));
            });
        }

        static getInstance(): GitControllerDatabase {
            if (this._instance === undefined) {
                this._instance = new GitControllerDatabase();
            }
            return this._instance;
        }

        getController(url: url): GitController {
            if (this._controllers.has(url)) {
                return this._controllers.get(url)!;
            } else {
                const settings = new GitControllerSettings(url);
                const path = this.storage.save(GitControllerSettings.typeId, settings);
                const controller = new GitController(settings, path);
                this._controllers.set(url, controller);
                return controller;
            }
        }
}
