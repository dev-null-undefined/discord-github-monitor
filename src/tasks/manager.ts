import {EnumStatus, Task} from "./task.js";
import {ResolvablePromise} from "../client.js";
import {Logger, LogLevel} from "../logger.js";

export class TaskManager {

    static readonly SECONDS = 1000;
    static readonly MINUTE = 60 * TaskManager.SECONDS;
    static readonly HOUR = 60 * TaskManager.MINUTE;
    static readonly DAY = 24 * TaskManager.HOUR;

    private _tasks: Task[];
    private _addedNewTask: ResolvablePromise<void>;

    constructor() {
        this._tasks = [];
        this._addedNewTask = new ResolvablePromise<void>();
    }

    addTask(task: Task) {
        this._tasks.push(task);
        this._addedNewTask.resolve();
        this._addedNewTask = new ResolvablePromise<void>();
        Logger.globalInstance.log(`Added task ${task.name} to the task list, with expirity at ${task.dueDate}.`, LogLevel.DEBUG);
    }

    async executeLoop(exitOnFailure: boolean = true, exitOnEmpty: boolean = false) {
        while (!exitOnEmpty || this._tasks.length > 0) {
            const task = await this.getImportantTasks();
            try {
                Logger.globalInstance.log(`Executing task ${task.name}.`, LogLevel.DEBUG);
                const result = await task.execute();
                Logger.globalInstance.log("Task " + task.name + " finished.", LogLevel.INFO);
            } catch (error: any) {
                if (error instanceof Error) {
                    Logger.globalInstance.log("Failed executing task: " + error.message, LogLevel.ERROR);
                } else if (typeof error === "string") {
                    Logger.globalInstance.log("Failed executing task: " + error, LogLevel.ERROR);
                } else {
                    Logger.globalInstance.log("Failed executing task.", LogLevel.ERROR);
                }
                if (exitOnFailure) {
                    break;
                }
            }
        }
    }

    executeNext(): Promise<void> {
        return this.getImportantTasks().then(task => {
            return task.execute();
        });
    }

    getImportantTasks(): Promise<Task> {
        this._tasks = this._tasks.filter(t => {
            if (t.status.status != EnumStatus.FINISHED && t.status.status != EnumStatus.FAILED) {
                return true;
            }
            Logger.globalInstance.log("Task " + t.name + " is " + (t.status.status === EnumStatus.FAILED ? "failed" : "finished") + ". Removing it from the task list.", LogLevel.DEBUG);
            return false;
        });

        const availableTasks = this._tasks.filter(t => t.status.status == EnumStatus.CREATED);
        if (availableTasks.length == 0) {
            Logger.globalInstance.log("No tasks available. Waiting for new tasks.", LogLevel.DEBUG);
            return new Promise((resolve) => {
                this._addedNewTask.promise.then(() => {
                    resolve(this.getImportantTasks());
                });
            });
        }

        let date = new Date();
        let task = availableTasks.reduce((mostImportantTask: Task, task: Task) => {
            if (task.isPriorTo(mostImportantTask, date)) {
                return task;
            }
            return mostImportantTask;
        }, availableTasks[0])

        if (task.dueDate.getTime() - date.getTime() > 0) {
            Logger.globalInstance.log(`Waiting for task ${task.name} to be due. (${task.dueDate.getTime() - date.getTime()} ms)`, LogLevel.DEBUG);
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(task);
                }, task.dueDate.getTime() - date.getTime());
            });
        }
        return Promise.resolve(task);
    }
}