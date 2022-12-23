import Discord, {ChatInputCommandInteraction} from "discord.js";

export abstract class Command {
    data: any; // TODO: specify type
    completer: ((interaction: Discord.AutocompleteInteraction) => Promise<void>) | null = null;

    abstract execute(interaction: Discord.ChatInputCommandInteraction): Promise<void>;
}
