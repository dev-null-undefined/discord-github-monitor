import {Task} from "./task.js";

export class TaskManager {
    private _tasks: Task[] = [];

    addTask(task: Task) {
        this._tasks.push(task);
    }

    getImportantTasks(): Promise<Task> {
        let date = new Date();
        let task = this._tasks.reduce((mostImportantTask: Task, task: Task) => {
            if (task.compare(mostImportantTask, date) < 0) {
                return task;
            }
            return mostImportantTask;
        }, this._tasks[0])

        this._tasks = this._tasks.filter(t => t.id !== task.id);

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