import {GitCommand} from './git-command.js';
import {Command} from "./command.js";

export const allCommands: (() => Command)[] = [() => new GitCommand()];