enum EnumStatus {
    CREATED,
    STARTED,
    FINISHED,
    FAILED= -1,
}

export class Status {

    private _status: EnumStatus;
    private _statusChangeCallbacks: Array<() => void> = [];

    constructor(status: EnumStatus) {
        this._status = status;
    }

    get status(): EnumStatus {
        return this._status;
    }

    set status(status: EnumStatus) {
        this._status = status;
        this._statusChangeCallbacks.forEach(callback => callback());
    }

    addStatusChangeCallback(callback: () => void) {
        this._statusChangeCallbacks.push(callback);
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

    onStatusChange(callback: (task: Task, status: Status) => void): void {
        this.status.addStatusChangeCallback(() => callback(this, this.status));
    }

    compare(task: Task, date = new Date()): number {
        let timeDiff = this.dueDate.getTime() - date.getTime();
        let otherTimeDiff = task.dueDate.getTime() - date.getTime();

        timeDiff *= this.priority;
        otherTimeDiff *= task.priority;

        return timeDiff - otherTimeDiff;
    }
}

export class SimpleTask extends Task {

    private _executeFunction: () => Promise<void>;

    constructor(name: string, dueDate: Date, exec: () => Promise<void>, priority: number = 100) {
        super(name, dueDate, priority);
        this._executeFunction = exec;
    }

    execute(): Promise<void> {
        this.status.status = EnumStatus.STARTED;
        return this._executeFunction().then(() => {
            this.status.status = EnumStatus.FINISHED;
        }).catch(() => {
            this.status.status = EnumStatus.FAILED;
        });
    }
}