import { DamageSource, Entity } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { parseCommand } from "battletribes-shared/commands";
import { damageEntity, healEntity } from "./components/HealthComponent";
import { InventoryComponentArray, addItem, getInventory } from "./components/InventoryComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { getPlayerFromUsername } from "./server/player-clients";
import { TribeComponentArray } from "./components/TribeComponent";
import { InventoryName, ItemType, getItemTypeFromString } from "battletribes-shared/items/items";
import { getRandomPositionInEntity, TransformComponentArray } from "./components/TransformComponent";
import { Biome } from "../../shared/src/biomes";
import { Hitbox } from "./hitboxes";
import { getHeldItem, InventoryUseComponentArray } from "./components/InventoryUseComponent";
import { createItem } from "./items";
import PlayerClient from "./server/PlayerClient";

const ENTITY_SPAWN_RANGE = 200;

const killPlayer = (player: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(player);
   const hitbox = transformComponent.hitboxes[0];
   
   const hitPosition = getRandomPositionInEntity(transformComponent);
   damageEntity(hitbox, null, 999999, DamageSource.god, AttackEffectiveness.effective, hitPosition, 0);
}

const damagePlayer = (player: Entity, damage: number): void => {
   const transformComponent = TransformComponentArray.getComponent(player);
   const hitbox = transformComponent.hitboxes[0];

   const hitPosition = getRandomPositionInEntity(transformComponent);
   damageEntity(hitbox, null, damage, DamageSource.god, AttackEffectiveness.effective, hitPosition, 0);
}

const setTime = (time: number): void => {
   // @Incomplete
   // Board.time = time;
}

const giveItem = (player: Entity, itemType: ItemType, amount: number, nickname: string, namer: string): void => {
   if (amount === 0) {
      return;
   }

   addItem(player, InventoryComponentArray.getComponent(player), createItem(itemType, amount, nickname, namer));
}

const tp = (player: Entity, x: number, y: number): void => {
   // const newPosition = new Point(x, y);
   // forcePlayerTeleport(player, newPosition);
}

// @Incomplete
// const tpBiome = (player: Entity, biomeName: Biome): void => {
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

export function registerCommand(command: string, playerClient: PlayerClient): void {
   const player = playerClient.instance;

   const parseQuery = parseCommand(command);
   
   const parts = parseQuery.parts;
   const numParameters = parts.length - 1;

   switch (parts[0].val) {
      case "kill": {
         if (numParameters === 0) {
            killPlayer(player);
         } else if (numParameters === 1) {
            const targetPlayerName = parts[1].val as string;
            const player = getPlayerFromUsername(targetPlayerName);
            if (player !== null) {
               killPlayer(player);
            }
         }

         break;
      }
      case "damage": {
         if (numParameters === 1) {
            const damage = parts[1].val as number;
            damagePlayer(player, damage);
         } else if (numParameters === 2) {
            const username = parts[1].val as string;
            const damage = parts[2].val as number;

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
            const healing = parts[1].val as number;
            healEntity(player, healing, -1);
         } else if (numParameters === 2) {
            const username = parts[1].val as string;
            const healing = parts[2].val as number;

            const player = getPlayerFromUsername(username);
            if (player !== null) {
               healEntity(player, healing, -1);
            }
         }

         break;
      }
      case "set_time": {
         setTime(parts[1].val as number);

         break;
      }
      case "give": {
         const itemTypeString = parts[1].val;
         if (typeof itemTypeString === "number") {
            break;
         }

         const itemType = getItemTypeFromString(itemTypeString);
         if (itemType === null) {
            break;
         }

         if (numParameters === 1) {
            giveItem(player, itemType, 1, "", "");
         } else if (numParameters === 2) {
            const amount = parts[2].val as number;
            giveItem(player, itemType, amount, "", "");
         }
         
         break;
      }
      case "tp": {
         const x = parts[1].val as number;
         const y = parts[2].val as number;
         tp(player, x, y);
         break;
      }
      case "tpbiome": {
         const biomeName = parts[1].val as Biome;
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
         // @Incomplete
         // forceBuildPlans(tribeComponent.tribe);
      }
      case "itemname": {
         const itemNameString = parts[1].val;
         if (typeof itemNameString === "number") {
            break;
         }

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
         const rightHand = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
         const heldItem = getHeldItem(rightHand);

         if (heldItem !== null) {
            heldItem.nickname = itemNameString;
            heldItem.namer = playerClient.username;
         }
         
         break;
      }
   }
}