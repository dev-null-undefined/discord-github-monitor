import {Logger, LogLevel} from "../logger.js";

export enum EnumStatus {
    CREATED,
    STARTED,
    FINISHED,
    FAILED = -1,
}

export class Status {

    private _status: EnumStatus;

    constructor(status: EnumStatus) {
        this._status = status;
    }

    get status(): EnumStatus {
        return this._status;
    }

    set status(status: EnumStatus) {
        this._status = status;
    }
}

let TaskCounter = 0;


export abstract class Task {
    id: number;
    name: string;
    status: Status;
    dueDate: Date;
    priority: number;

    protected constructor(name: string, dueDate: Date, priority: number = 100) {
        this.id = ++TaskCounter;
        this.name = name;
        this.dueDate = dueDate;
        this.priority = priority;
        this.status = new Status(EnumStatus.CREATED);
    }

    abstract execute(): Promise<void>;

    isPriorTo(task: Task, date = new Date()): boolean {
        let thisDiff = this.dueDate.getTime() - date.getTime();
        let otherDiff = task.dueDate.getTime() - date.getTime();

        // TODO:
        // if there is task with low priority that should have been already executed,
        // but there is a task with high priority that should be executed later,
        // it would be safer to wait for the high priority task to be executed first in case
        // the low priority task fails or takes a long time to execute
        thisDiff *= this.priority;
        otherDiff *= task.priority;

        if (thisDiff < otherDiff) {
            return true;
        } else if (thisDiff == otherDiff) {
            if (this.priority > task.priority) {
                return true;
            } else if (this.priority == task.priority) {
                return this.id < task.id;
            }
        }
        return false;
    }
}

export class SimpleTask extends Task {

    private _executeFunction: () => Promise<void>;

    constructor(name: string, dueDate: Date, exec: () => Promise<void>, priority: number = 100) {
        super(name, dueDate, priority);
        this._executeFunction = exec;
    }

    execute(): Promise<void> {
        return this._executeFunction().then(() => {
            this.status.status = EnumStatus.FINISHED;
            Logger.globalInstance.log("Task " + this.name + " finished.", LogLevel.INFO);
        }).catch((error) => {
            this.status.status = EnumStatus.FAILED;
            Logger.globalInstance.log("Task " + this.name + " failed." + error.message, LogLevel.ERROR);
            return Promise.reject(error);
        });
    }
}

export function simpleTaskAfter(name: string, seconds: number, exec: () => Promise<void>, priority: number = 100): SimpleTask {
    return new SimpleTask(name, new Date(new Date().getTime() + seconds * 1000), exec, priority);
}

export class RepeatingTask extends SimpleTask {
    private _interval: Date;

    constructor(name: string, dueDate: Date, exec: () => Promise<void>, interval: Date, priority: number = 100) {
        super(name, dueDate, exec, priority);
        this._interval = interval;
    }

    execute(): Promise<void> {
        return super.execute().then(() => {
            this.dueDate = new Date(this.dueDate.getTime() + this._interval.getTime());
            this.status.status = EnumStatus.CREATED;
        });
    }
}