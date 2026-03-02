export enum CommandPermissions {
   player = 0,
   dev = 1
};

export enum CommandPartType {
   string,
   number,
   commandName
}

interface BaseCommandPart {
   readonly type: CommandPartType;
}

interface CommandPartString extends BaseCommandPart {
   readonly type: CommandPartType.string;
   readonly val: string;
}

interface CommandPartNumber extends BaseCommandPart {
   readonly type: CommandPartType.number;
   readonly val: number;
}

interface CommandPartCommandName extends BaseCommandPart {
   readonly type: CommandPartType.commandName;
   readonly val: string;
}

export type CommandPart = CommandPartString | CommandPartNumber | CommandPartCommandName;

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

interface CommandValidityQuery {
   readonly isValid: boolean;
   readonly errorMessage: string;
}

interface CommandParseQuery {
   readonly isValid: boolean;
   readonly errorMessage: string;
   readonly parts: ReadonlyArray<CommandPart>;
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
   },
   {
      name: "itemname",
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

const partMatchesParameter = (part: CommandPart, parameter: CommandParameterSpecifications): CommandValidityQuery => {
   switch (parameter.dataType) {
      case "number": {
         if (part.type !== CommandPartType.number) {
            return {
               isValid: false,
               errorMessage: "Expected a number, but got a string!"
            };
         }
         break;
      }
      case "string": {
         if (part.type !== CommandPartType.string) {
            return {
               isValid: false,
               errorMessage: "Expected a string, but got a number!"
            };
         }
         break;
      }
   }

   return {
      isValid: true,
      errorMessage: ""
   };
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

/** Parses a console command into its parts. */
export function parseCommand(command: string): CommandParseQuery {
   const parts = new Array<CommandPart>();
   let isInString = false;
   let currentPartChars = "";
   
   for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if (isInString) {
         if (char === '"') {
            // Complete the part
            isInString = false;
            parts.push({
               type: CommandPartType.string,
               val: currentPartChars
            });
            currentPartChars = "";
         } else {
            currentPartChars += char;
         }
      } else {
         if (char === " ") {
            // Complete the part
            const numberised = Number(currentPartChars);
            if (!isNaN(numberised)) {
               // Number!
               parts.push({
                  type: CommandPartType.number,
                  val: numberised
               });
            } else if (parts.length === 0) {
               // Command name
               parts.push({
                  type: CommandPartType.commandName,
                  val: currentPartChars
               });
            } else {
               return {
                  isValid: false,
                  errorMessage: "Strings must begin and end with double quotation marks!",
                  parts: []
               };
            }
            currentPartChars = "";
         } else if (char === '"') {
            // Begin a new string
            isInString = true;
         } else {
            currentPartChars += char;
         }
      }
   }
   
   if (isInString) {
      return {
         isValid: false,
         errorMessage: "Unclosed string!",
         parts: []
      };
   }

   if (currentPartChars !== "") {
      // Complete the part
      // @Copynpaste
      const numberised = Number(currentPartChars);
      if (!isNaN(numberised)) {
         // Number!
         parts.push({
            type: CommandPartType.number,
            val: numberised
         });
      } else if (parts.length === 0) {
         // Command name
         parts.push({
            type: CommandPartType.commandName,
            val: currentPartChars
         });
      } else {
         return {
            isValid: false,
            errorMessage: "Strings must begin and end with double quotation marks!",
            parts: []
         };
      }
   }

   return {
      isValid: true,
      errorMessage: "",
      parts: parts
   };
}

export function commandIsValid(command: string, permissions: CommandPermissions): CommandValidityQuery {
   const parseQuery = parseCommand(command);
   if (!parseQuery.isValid) {
      return {
         isValid: false,
         errorMessage: parseQuery.errorMessage
      };
   }
   
   const parts = parseQuery.parts;
   
   // Find the command
   const commandName = parts[0].val;
   let commandSpecifications: CommandSpecifications | null = null;
   for (const currentCommand of COMMANDS) {
      if (currentCommand.name === commandName) {
         commandSpecifications = currentCommand;
         break;
      }
   }

   // If there is no matching command, it isn't valid
   if (commandSpecifications === null) {
      return {
         isValid: false,
         errorMessage: `Unknown command '${commandName}'!`
      };
   }
      
   let result: CommandValidityQuery = {
      isValid: true,
      errorMessage: ""
   };

   // @BUG the logic for this is so bad and limited

   // See if there is a configuration of parameters which matches the command
   for (const configuration of commandSpecifications.configurations) {
      // Skip if the user doesn't have the required permissions
      if (!userHasCommandPermissions(configuration.permissions, permissions)) continue;

      if (configuration.parameterConfigurations.length !== parts.length - 1) {
         continue;
      }
      
      // Check each parameter in the command
      for (let i = 0; i < configuration.parameterConfigurations.length; i++) {
         const parameterID = configuration.parameterConfigurations[i];

         const parameterSpecifications = findParameterSpecifications(commandSpecifications, parameterID);
         if (parameterSpecifications === null) throw new Error("Couldn't find the corresponding parameter!");

         const currentResult = partMatchesParameter(parts[i + 1], parameterSpecifications);
         if (!currentResult.isValid) {
            result = currentResult;
            break;
         }
      }

      if (result.isValid) {
         return result;
      }
   }
   
   return result;
}