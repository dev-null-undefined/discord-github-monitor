import {EnumStatus, Task} from "./task.js";
import {ResolvablePromise} from "../client.js";
import {Logger, LogLevel} from "../logger.js";

export class TaskManager {
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

    executeLoop() {
        this.executeNext().then(() => {
            this.executeLoop();
        }).catch(error => {
            Logger.globalInstance.log("Failed executing task: " + error.message, LogLevel.ERROR);
        });
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
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(task);
                }, task.dueDate.getTime() - date.getTime());
            });
        }
        return Promise.resolve(task);
    }
}