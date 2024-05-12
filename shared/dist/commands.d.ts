export declare enum CommandPermissions {
    player = 0,
    dev = 1
}
interface CommandParameterSpecifications {
    readonly id: number;
    readonly prompt: string | null;
    readonly dataType: "string" | "number" | null;
}
export interface CommandSpecifications {
    readonly name: string;
    readonly parameters: ReadonlyArray<CommandParameterSpecifications>;
    readonly configurations: ReadonlyArray<CommandConfiguration>;
}
interface CommandConfiguration {
    readonly parameterConfigurations: ReadonlyArray<number>;
    readonly permissions: CommandPermissions;
}
type Commands = ReadonlyArray<CommandSpecifications>;
export declare const COMMANDS: Commands;
export declare function userHasCommandPermissions(requiredPermissions: CommandPermissions, permissions: CommandPermissions): boolean;
export declare function commandComponentMatchesParameter(commandComponent: string | number, parameter: CommandParameterSpecifications): boolean;
export declare function findParameterSpecifications(commandSpecifications: CommandSpecifications, parameterID: number): CommandParameterSpecifications | null;
/**
 * Parses a console command into its components.
 * @param command The command to parse.
 * @returns The command's components.
 */
export declare function parseCommand(command: string): Array<string | number>;
/**
 * Checks whether the given command is valid or not.
 * @param commandComponents
 * @param permissions
 * @returns
 */
export declare function commandIsValid(command: string, permissions: CommandPermissions): boolean;
export {};
