"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandIsValid = exports.parseCommand = exports.findParameterSpecifications = exports.commandComponentMatchesParameter = exports.userHasCommandPermissions = exports.COMMANDS = exports.CommandPermissions = void 0;
var CommandPermissions;
(function (CommandPermissions) {
    CommandPermissions[CommandPermissions["player"] = 0] = "player";
    CommandPermissions[CommandPermissions["dev"] = 1] = "dev";
})(CommandPermissions = exports.CommandPermissions || (exports.CommandPermissions = {}));
;
exports.COMMANDS = [
    /*
    Command to kill a player.
    */
    {
        name: "kill",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "string"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [],
                permissions: CommandPermissions.player
            },
            {
                parameterConfigurations: [1],
                permissions: CommandPermissions.dev
            }
        ]
    },
    /*
    Command to deal damage to a player.
    */
    {
        name: "damage",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "number"
            },
            {
                id: 2,
                prompt: null,
                dataType: "string"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [1],
                permissions: CommandPermissions.dev
            },
            {
                parameterConfigurations: [2, 1],
                permissions: CommandPermissions.dev
            }
        ]
    },
    /*
    Command to heal a player.
    */
    {
        name: "heal",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "number"
            },
            {
                id: 2,
                prompt: null,
                dataType: "string"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [],
                permissions: CommandPermissions.dev
            },
            {
                parameterConfigurations: [1],
                permissions: CommandPermissions.dev
            },
            {
                parameterConfigurations: [2, 1],
                permissions: CommandPermissions.dev
            }
        ]
    },
    /*
    Command to give an item to a player.
    */
    {
        name: "give",
        parameters: [
            {
                id: 2,
                prompt: null,
                dataType: "string"
            },
            {
                id: 3,
                prompt: null,
                dataType: "number"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [2],
                permissions: CommandPermissions.dev
            },
            {
                parameterConfigurations: [2, 3],
                permissions: CommandPermissions.dev
            }
        ]
    },
    /*
    Command to play a quack sound.
    */
    {
        name: "quack",
        parameters: [],
        configurations: [
            {
                parameterConfigurations: [],
                permissions: CommandPermissions.player
            }
        ]
    },
    /*
    Command to summon entities.
    */
    {
        name: "summon",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "string"
            },
            {
                id: 2,
                prompt: null,
                dataType: "number"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [1],
                permissions: CommandPermissions.dev
            },
            {
                parameterConfigurations: [1, 2],
                permissions: CommandPermissions.dev
            }
        ]
    },
    /*
    Sets the server time
    */
    {
        name: "set_time",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "number"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [1],
                permissions: CommandPermissions.dev
            }
        ]
    },
    // "lightspeed on" and "lightspeed off"
    {
        name: "lightspeed",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "string"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [1],
                permissions: CommandPermissions.dev
            }
        ]
    },
    // Teleports you to the specified coordinates
    {
        name: "tp",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "number"
            },
            {
                id: 2,
                prompt: null,
                dataType: "number"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [1, 2],
                permissions: CommandPermissions.dev
            }
        ]
    },
    // Teleports you to a random position in the specified biome type
    {
        name: "tpbiome",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "string"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [1],
                permissions: CommandPermissions.dev
            }
        ]
    },
    // Clears the terminal
    {
        name: "clear",
        parameters: [],
        configurations: [
            {
                parameterConfigurations: [],
                permissions: CommandPermissions.dev
            }
        ]
    },
    {
        name: "zoom",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "number"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [1],
                permissions: CommandPermissions.dev
            }
        ]
    },
    {
        name: "unlockall",
        parameters: [],
        configurations: [
            {
                parameterConfigurations: [],
                permissions: CommandPermissions.dev
            }
        ]
    },
    {
        name: "track",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "number"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [1],
                permissions: CommandPermissions.dev
            }
        ]
    },
    {
        name: "build",
        parameters: [],
        configurations: [
            {
                parameterConfigurations: [],
                permissions: CommandPermissions.dev
            }
        ]
    },
    {
        name: "tpcam",
        parameters: [
            {
                id: 1,
                prompt: null,
                dataType: "number"
            },
            {
                id: 2,
                prompt: null,
                dataType: "number"
            }
        ],
        configurations: [
            {
                parameterConfigurations: [1, 2],
                permissions: CommandPermissions.dev
            }
        ]
    }
];
function userHasCommandPermissions(requiredPermissions, permissions) {
    switch (permissions) {
        case CommandPermissions.dev:
            return true;
        case CommandPermissions.player:
            return requiredPermissions === CommandPermissions.player;
    }
}
exports.userHasCommandPermissions = userHasCommandPermissions;
function commandComponentMatchesParameter(commandComponent, parameter) {
    // Make sure the data type matches
    switch (parameter.dataType) {
        case "number":
            if (typeof commandComponent !== "number")
                return false;
            break;
        case "string":
            if (typeof commandComponent !== "string")
                return false;
            break;
    }
    return true;
}
exports.commandComponentMatchesParameter = commandComponentMatchesParameter;
function findParameterSpecifications(commandSpecifications, parameterID) {
    let parameter = null;
    // Find the corresponding parameter
    for (const currentParameter of commandSpecifications.parameters) {
        if (currentParameter.id === parameterID) {
            parameter = currentParameter;
            break;
        }
    }
    return parameter;
}
exports.findParameterSpecifications = findParameterSpecifications;
/**
 * Parses a console command into its components.
 * @param command The command to parse.
 * @returns The command's components.
 */
function parseCommand(command) {
    // Split the command
    let commandComponents = command.split(" ");
    // Number-ise any numbers
    commandComponents = commandComponents.map(component => !isNaN(Number(component)) ? Number(component) : component);
    // Remove any whitespace
    for (let i = commandComponents.length - 1; i >= 0; i--) {
        if (commandComponents[i] === "") {
            commandComponents.splice(i, 1);
        }
    }
    return commandComponents;
}
exports.parseCommand = parseCommand;
/**
 * Checks whether the given command is valid or not.
 * @param commandComponents
 * @param permissions
 * @returns
 */
function commandIsValid(command, permissions) {
    const commandComponents = parseCommand(command);
    // Find the command
    let commandSpecifications = null;
    for (const currentCommand of exports.COMMANDS) {
        if (currentCommand.name === commandComponents[0]) {
            commandSpecifications = currentCommand;
            break;
        }
    }
    // If there is no matching command, it isn't valid
    if (commandSpecifications === null)
        return false;
    // See if there is a configuration of parameters which matches the command
    for (const configuration of commandSpecifications.configurations) {
        // Skip if the user doesn't have the required permissions
        if (!userHasCommandPermissions(configuration.permissions, permissions))
            continue;
        if (configuration.parameterConfigurations.length !== commandComponents.length - 1) {
            continue;
        }
        let isValid = true;
        // Check each parameter in the command
        for (let i = 0; i < configuration.parameterConfigurations.length; i++) {
            const parameterID = configuration.parameterConfigurations[i];
            const parameterSpecifications = findParameterSpecifications(commandSpecifications, parameterID);
            if (parameterSpecifications === null)
                throw new Error("Couldn't find the corresponding parameter!");
            if (!commandComponentMatchesParameter(commandComponents[i + 1], parameterSpecifications)) {
                isValid = false;
                break;
            }
        }
        if (isValid)
            return true;
    }
    return false;
}
exports.commandIsValid = commandIsValid;
