export enum CommandPermissions {
   player = 0,
   dev = 1
};

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

export const COMMANDS: Commands = [
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
         { // Command for player to kill themselves
            parameterConfigurations: [],
            permissions: CommandPermissions.player
         },
         { // Command to kill a specific player
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
         { // Command for player to damage themselves
            parameterConfigurations: [1],
            permissions: CommandPermissions.dev
         },
         { // Command for player to damage a specific player
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
         { // Command for player to fully heal themselves
            parameterConfigurations: [],
            permissions: CommandPermissions.dev
         },
         { // Command for player to heal themselves
            parameterConfigurations: [1],
            permissions: CommandPermissions.dev
         },
         { // Command for player to heal a specific player
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
         { // Item type
            id: 2,
            prompt: null,
            dataType: "string"
         }, // Count
         {
            id: 3,
            prompt: null,
            dataType: "number"
         }
      ],
      configurations: [
         { // Command for player to give one of the item
            parameterConfigurations: [2],
            permissions: CommandPermissions.dev
         },
         { // Command for player to give any amount of the item
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
         { // Type of entity to summon
            id: 1,
            prompt: null,
            dataType: "string"
         },
         { // Number of entity to summon
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
         { // X coordinate
            id: 1,
            prompt: null,
            dataType: "number"
         },
         { // Y coordinate
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
         { // Biome name
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

export function userHasCommandPermissions(requiredPermissions: CommandPermissions, permissions: CommandPermissions): boolean {
   switch (permissions) {
      case CommandPermissions.dev:
         return true;
      case CommandPermissions.player:
         return requiredPermissions === CommandPermissions.player;
   }
}

export function commandComponentMatchesParameter(commandComponent: string | number, parameter: CommandParameterSpecifications): boolean {
   // Make sure the data type matches
   switch (parameter.dataType) {
      case "number":
         if (typeof commandComponent !== "number") return false;
         break;
      case "string":
         if (typeof commandComponent !== "string") return false;
         break;
   }

   return true;
}

export function findParameterSpecifications(commandSpecifications: CommandSpecifications, parameterID: number): CommandParameterSpecifications | null {
   let parameter: CommandParameterSpecifications | null = null;

   // Find the corresponding parameter
   for (const currentParameter of commandSpecifications.parameters) {
      if (currentParameter.id === parameterID) {
         parameter = currentParameter;
         break;
      }
   }

   return parameter;
}

/**
 * Parses a console command into its components.
 * @param command The command to parse.
 * @returns The command's components.
 */
export function parseCommand(command: string): Array<string | number> {
   // Split the command
   let commandComponents: Array<string | number> = command.split(" ");

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

/**
 * Checks whether the given command is valid or not.
 * @param commandComponents 
 * @param permissions 
 * @returns 
 */
export function commandIsValid(command: string, permissions: CommandPermissions): boolean {
   const commandComponents = parseCommand(command);
   
   // Find the command
   let commandSpecifications: CommandSpecifications | null = null;
   for (const currentCommand of COMMANDS) {
      if (currentCommand.name === commandComponents[0]) {
         commandSpecifications = currentCommand;
         break;
      }
   }

   // If there is no matching command, it isn't valid
   if (commandSpecifications === null) return false;

   // See if there is a configuration of parameters which matches the command
   for (const configuration of commandSpecifications.configurations) {
      // Skip if the user doesn't have the required permissions
      if (!userHasCommandPermissions(configuration.permissions, permissions)) continue;

      if (configuration.parameterConfigurations.length !== commandComponents.length - 1) {
         continue;
      }
      
      let isValid = true;
      
      // Check each parameter in the command
      for (let i = 0; i < configuration.parameterConfigurations.length; i++) {
         const parameterID = configuration.parameterConfigurations[i];

         const parameterSpecifications = findParameterSpecifications(commandSpecifications, parameterID);
         if (parameterSpecifications === null) throw new Error("Couldn't find the corresponding parameter!");

         if (!commandComponentMatchesParameter(commandComponents[i + 1], parameterSpecifications)) {
            isValid = false;
            break;
         }
      }

      if (isValid) return true;
   }
   
   return false;
}