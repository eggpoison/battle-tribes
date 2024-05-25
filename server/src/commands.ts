import { PlayerCauseOfDeath, EntityType, getEntityTypeFromString } from "webgl-test-shared/dist/entities";
import { ItemType, getItemTypeFromString } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome } from "webgl-test-shared/dist/tiles";
import { Point, randItem } from "webgl-test-shared/dist/utils";
import { parseCommand } from "webgl-test-shared/dist/commands";
import { getTilesOfBiome } from "./census";
import Board from "./Board";
import Tile from "./Tile";
import { damageEntity, healEntity } from "./components/HealthComponent";
import Entity, { getRandomPositionInEntity } from "./Entity";
import { TribeComponentArray } from "./components/ComponentArray";
import { InventoryComponentArray, addItem } from "./components/InventoryComponent";
import { createEntity } from "./entity-creation";
import { createItem } from "./items";
import { forceBuildPlans } from "./ai-tribe-building/ai-building-plans";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { forcePlayerTeleport, getPlayerFromUsername } from "./server/player-clients";

const ENTITY_SPAWN_RANGE = 200;

const killPlayer = (player: Entity): void => {
   const hitPosition = getRandomPositionInEntity(player);
   damageEntity(player, null, 999999, PlayerCauseOfDeath.god, AttackEffectiveness.effective, hitPosition, 0);
}

const damagePlayer = (player: Entity, damage: number): void => {
   const hitPosition = getRandomPositionInEntity(player);
   damageEntity(player, null, damage, PlayerCauseOfDeath.god, AttackEffectiveness.effective, hitPosition, 0);
}

const setTime = (time: number): void => {
   Board.time = time;
}

const giveItem = (player: Entity, itemType: ItemType, amount: number): void => {
   if (amount === 0) {
      return;
   }

   const item = createItem(itemType, amount);
   addItem(InventoryComponentArray.getComponent(player.id), item);
}

const tp = (player: Entity, x: number, y: number): void => {
   const newPosition = new Point(x, y);
   forcePlayerTeleport(player, newPosition);
}

const tpBiome = (player: Entity, biomeName: Biome): void => {
   const potentialTiles = getTilesOfBiome(biomeName);
   if (potentialTiles.length === 0) {
      console.warn(`No available tiles of biome '${biomeName}' to teleport to.`);
      return;
   }

   let numAttempts = 0;
   let tile: Tile;
   do {
      tile = randItem(potentialTiles);
      if (++numAttempts === 999) {
         return;
      }
   } while (tile.isWall);
   
   const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
   const y = (tile.y + Math.random()) * Settings.TILE_SIZE;

   const newPosition = new Point(x, y);
   forcePlayerTeleport(player, newPosition);
}

const summonEntities = (player: Entity, entityType: EntityType, amount: number): void => {
   for (let i = 0; i < amount; i++) {
      const spawnPosition = player.position.copy();

      const spawnOffsetMagnitude = ENTITY_SPAWN_RANGE * (Math.random() + 1) / 2;
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      spawnPosition.x += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      spawnPosition.y += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createEntity(spawnPosition, entityType);
   }
}

export function registerCommand(command: string, player: Entity): void {
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
         tpBiome(player, biomeName);
         break;
      }
      case "summon": {
         const entityTypeString = commandComponents[1];
         if (typeof entityTypeString === "number") {
            break;
         }

         const entityType = getEntityTypeFromString(entityTypeString);
         if (entityType === null) {
            break;
         }
         
         if (numParameters === 1) {
            summonEntities(player, entityType, 1);
         } else {
            const amount = commandComponents[2] as number;
            summonEntities(player, entityType, amount);
         }
         break;
      }
      case "unlockall": {
         const tribeComponent = TribeComponentArray.getComponent(player.id);
         tribeComponent.tribe.unlockAllTechs();
         
         break;
      }
      case "build": {
         const tribeComponent = TribeComponentArray.getComponent(player.id);
         forceBuildPlans(tribeComponent.tribe);
      }
   }
}