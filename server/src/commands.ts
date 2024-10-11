import { PlayerCauseOfDeath, EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Biome } from "battletribes-shared/tiles";
import { Point, randItem, TileIndex } from "battletribes-shared/utils";
import { parseCommand } from "battletribes-shared/commands";
import { getTilesOfBiome } from "./census";
import Layer, { getTileX, getTileY } from "./Layer";
import { damageEntity, healEntity } from "./components/HealthComponent";
import { getRandomPositionInEntity } from "./Entity";
import { InventoryComponentArray, addItem } from "./components/InventoryComponent";
import { createItem } from "./items";
import { forceBuildPlans } from "./ai-tribe-building/ai-building-plans";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { forcePlayerTeleport, getPlayerFromUsername } from "./server/player-clients";
import { TribeComponentArray } from "./components/TribeComponent";
import { ItemType, getItemTypeFromString } from "battletribes-shared/items/items";
import { surfaceLayer } from "./world";

const ENTITY_SPAWN_RANGE = 200;

const killPlayer = (player: EntityID): void => {
   const hitPosition = getRandomPositionInEntity(player);
   damageEntity(player, null, 999999, PlayerCauseOfDeath.god, AttackEffectiveness.effective, hitPosition, 0);
}

const damagePlayer = (player: EntityID, damage: number): void => {
   const hitPosition = getRandomPositionInEntity(player);
   damageEntity(player, null, damage, PlayerCauseOfDeath.god, AttackEffectiveness.effective, hitPosition, 0);
}

const setTime = (time: number): void => {
   // @Incomplete
   // Board.time = time;
}

const giveItem = (player: EntityID, itemType: ItemType, amount: number): void => {
   if (amount === 0) {
      return;
   }

   const item = createItem(itemType, amount);
   addItem(InventoryComponentArray.getComponent(player), item);
}

const tp = (player: EntityID, x: number, y: number): void => {
   const newPosition = new Point(x, y);
   forcePlayerTeleport(player, newPosition);
}

// @Incomplete
// const tpBiome = (player: EntityID, biomeName: Biome): void => {
//    const potentialTiles = getTilesOfBiome(biomeName);
//    if (potentialTiles.length === 0) {
//       console.warn(`No available tiles of biome '${biomeName}' to teleport to.`);
//       return;
//    }

//    let numAttempts = 0;
//    let tileIndex: TileIndex;
//    do {
//       tileIndex = randItem(potentialTiles);
//       if (++numAttempts === 999) {
//          return;
//       }
//    } while (surfaceLayer.tileIsWalls[tileIndex] === 1);
   
//    const tileX = getTileX(tileIndex);
//    const tileY = getTileY(tileIndex);
//    const x = (tileX + Math.random()) * Settings.TILE_SIZE;
//    const y = (tileY + Math.random()) * Settings.TILE_SIZE;

//    const newPosition = new Point(x, y);
//    forcePlayerTeleport(player, newPosition);
// }

export function registerCommand(command: string, player: EntityID): void {
   const commandComponents = parseCommand(command);
   const numParameters = commandComponents.length - 1;

   switch (commandComponents[0]) {
      case "kill": {
         if (numParameters === 0) {
            killPlayer(player);
         } else if (numParameters === 1) {
            const targetPlayerName = commandComponents[1] as string;
            const player = getPlayerFromUsername(targetPlayerName);
            if (player !== null) {
               killPlayer(player);
            }
         }

         break;
      }
      case "damage": {
         if (numParameters === 1) {
            const damage = commandComponents[1] as number;
            damagePlayer(player, damage);
         } else if (numParameters === 2) {
            const username = commandComponents[1] as string;
            const damage = commandComponents[2] as number;

            const player = getPlayerFromUsername(username);
            if (player !== null) {
               damagePlayer(player, damage);
            }
         }

         break;
      }
      case "heal": {
         if (numParameters === 0) {
            healEntity(player, 99999, -1);
         } else if (numParameters === 1) {
            const healing = commandComponents[1] as number;
            healEntity(player, healing, -1);
         } else if (numParameters === 2) {
            const username = commandComponents[1] as string;
            const healing = commandComponents[2] as number;

            const player = getPlayerFromUsername(username);
            if (player !== null) {
               healEntity(player, healing, -1);
            }
         }

         break;
      }
      case "set_time": {
         setTime(commandComponents[1] as number);

         break;
      }
      case "give": {
         const itemTypeString = commandComponents[1];
         if (typeof itemTypeString === "number") {
            break;
         }

         const itemType = getItemTypeFromString(itemTypeString);
         if (itemType === null) {
            break;
         }

         if (numParameters === 1) {
            giveItem(player, itemType, 1);
         } else if (numParameters === 2) {
            const amount = commandComponents[2] as number;
            giveItem(player, itemType, amount);
         }
         
         break;
      }
      case "tp": {
         const x = commandComponents[1] as number;
         const y = commandComponents[2] as number;
         tp(player, x, y);
         break;
      }
      case "tpbiome": {
         const biomeName = commandComponents[1] as Biome;
         // tpBiome(player, biomeName);
         break;
      }
      case "unlockall": {
         const tribeComponent = TribeComponentArray.getComponent(player);
         tribeComponent.tribe.unlockAllTechs();
         
         break;
      }
      case "build": {
         const tribeComponent = TribeComponentArray.getComponent(player);
         forceBuildPlans(tribeComponent.tribe);
      }
   }
}