import { Settings } from "webgl-test-shared/dist/settings";
import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { Inventory, InventoryName, Item } from "webgl-test-shared/dist/items";
import { EntityComponentsData, LimbData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import Camera from "../Camera";
import CircularHitbox from "../hitboxes/CircularHitbox";
import { halfWindowHeight, halfWindowWidth } from "../webgl";
import Entity from "../Entity";
import TribeMember, { addTribeMemberRenderParts } from "./TribeMember";
import Board from "../Board";
import { definiteGameState, latencyGameState } from "../game-state/game-states";
import { keyIsPressed } from "../keyboard-input";
import PlayerComponent from "../entity-components/PlayerComponent";
import Game from "../Game";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent from "../entity-components/FootprintComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import InventoryUseComponent from "../entity-components/InventoryUseComponent";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import TribeComponent from "../entity-components/TribeComponent";
import EquipmentComponent from "../entity-components/EquipmentComponent";
import { collide, resolveWallTileCollisions } from "../collision";
import TribeMemberComponent from "../entity-components/TribeMemberComponent";
import { TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { randInt } from "webgl-test-shared/dist/utils";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import PhysicsComponent from "../entity-components/PhysicsComponent";

/** Updates the rotation of the player to match the cursor position */
export function updatePlayerRotation(cursorX: number, cursorY: number): void {
   if (Player.instance === null || cursorX === null || cursorY === null) return;

   const relativeCursorX = cursorX - halfWindowWidth;
   const relativeCursorY = -cursorY + halfWindowHeight;

   let cursorDirection = Math.atan2(relativeCursorY, relativeCursorX);
   cursorDirection = Math.PI/2 - cursorDirection;
   Player.instance.rotation = cursorDirection;
}

// export function updateAvailableCraftingRecipes(): void {
//    if (Player.instance === null) return;
   
//    // 
//    // Find which crafting recipes are available to the player
//    // 

//    let availableCraftingRecipes: Array<CraftingRecipe> = CRAFTING_RECIPE_RECORD.hand.slice();
//    let availableCraftingStations = new Set<CraftingStation>();

//    if (Player.instance.tile.type === TileType.water) {
//       availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD[CraftingStation.water].slice());
//       availableCraftingStations.add(CraftingStation.water);
//    }
   
//    const minChunkX = Math.max(Math.min(Math.floor((Player.instance!.position.x - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
//    const maxChunkX = Math.max(Math.min(Math.floor((Player.instance!.position.x + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
//    const minChunkY = Math.max(Math.min(Math.floor((Player.instance!.position.y - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);
//    const maxChunkY = Math.max(Math.min(Math.floor((Player.instance!.position.y + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_SIZE / Settings.TILE_SIZE), Settings.BOARD_SIZE - 1), 0);

//    // @Cleanup: can be better
//    for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
//       for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
//          const chunk = Board.getChunk(chunkX, chunkY);
//          for (const entity of chunk.entities) {
//             const distance = Player.instance!.position.calculateDistanceBetween(entity.position);
//             if (distance <= Settings.MAX_CRAFTING_STATION_USE_DISTANCE) {
//                switch (entity.type) {
//                   case EntityType.workbench: {
//                      if (!availableCraftingStations.has(CraftingStation.workbench)) {
//                         availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD[CraftingStation.workbench].slice());
//                         availableCraftingStations.add(CraftingStation.workbench);
//                      }
//                      break;
//                   }
//                   case EntityType.slime: {
//                      if (!availableCraftingStations.has(CraftingStation.slime)) {
//                         availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD[CraftingStation.slime].slice());
//                         availableCraftingStations.add(CraftingStation.slime);
//                      }
//                      break;
//                   }
//                   case EntityType.frostshaper: {
//                      if (!availableCraftingStations.has(CraftingStation.frostshaper)) {
//                         availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD[CraftingStation.frostshaper].slice());
//                         availableCraftingStations.add(CraftingStation.frostshaper);
//                      }
//                      break;
//                   }
//                   case EntityType.stonecarvingTable: {
//                      if (!availableCraftingStations.has(CraftingStation.stonecarvingTable)) {
//                         availableCraftingRecipes = availableCraftingRecipes.concat(CRAFTING_RECIPE_RECORD[CraftingStation.stonecarvingTable].slice());
//                         availableCraftingStations.add(CraftingStation.stonecarvingTable);
//                      }
//                      break;
//                   }
//                }
//             }
//          }
//       }
//    }

//    // Send that information to the crafting menu
//    setCraftingMenuAvailableRecipes(availableCraftingRecipes);
//    setCraftingMenuAvailableCraftingStations(availableCraftingStations);
// }

export function getPlayerSelectedItem(): Item | null {
   if (Player.instance === null || definiteGameState.hotbar === null) return null;

   const item: Item | undefined = definiteGameState.hotbar.itemSlots[latencyGameState.selectedHotbarItemSlot];
   return item || null;
}

const createInitialInventoryUseInfo = (inventoryName: InventoryName): LimbData => {
   return {
      selectedItemSlot: 1,
      inventoryName: inventoryName,
      bowCooldownTicks: 0,
      itemAttackCooldowns: {},
      spearWindupCooldowns: {},
      crossbowLoadProgressRecord: {},
      foodEatingTimer: 0,
      action: LimbAction.none,
      lastAttackTicks: 0,
      lastEatTicks: 0,
      lastBowChargeTicks: 0,
      lastSpearChargeTicks: 0,
      lastBattleaxeChargeTicks: 0,
      lastCrossbowLoadTicks: 0,
      lastCraftTicks: 0,
      thrownBattleaxeItemID: -1,
      lastAttackCooldown: Settings.DEFAULT_ATTACK_COOLDOWN
   }
}

class Player extends TribeMember {
   /** The player entity associated with the current player. */
   public static instance: Player | null = null;
   
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.player>) {
      super(position, id, EntityType.player, ageTicks);

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[2]));
      this.addServerComponent(ServerComponentType.tribe, new TribeComponent(this, componentsData[3]));
      this.addServerComponent(ServerComponentType.tribeMember, new TribeMemberComponent(this, componentsData[4]));
      addTribeMemberRenderParts(this);
      this.addServerComponent(ServerComponentType.inventory, new InventoryComponent(this, componentsData[5]));
      this.addServerComponent(ServerComponentType.inventoryUse, new InventoryUseComponent(this, componentsData[6], this.getServerComponent(ServerComponentType.tribeMember).handRenderParts));
      this.addServerComponent(ServerComponentType.player, new PlayerComponent(this, componentsData[7]));
      
      this.addClientComponent(ClientComponentType.footprint, new FootprintComponent(this, 0.2, 20, 64, 4, 64));
      this.addClientComponent(ClientComponentType.equipment, new EquipmentComponent(this));
   }

   public static createInstancePlayer(position: Point, playerID: number): void {
      if (Player.instance !== null) {
         throw new Error("Tried to create a new player main instance when one already existed!");
      }

      const maxHealth = TRIBE_INFO_RECORD[Game.tribe.tribeType].maxHealthPlayer;

      // @Cleanup: is there a better way to do this? maybe wait for the first packet to then set this?
      const componentsData: EntityComponentsData<EntityType.player> = [
         {
            velocity: [0, 0],
            acceleration: [0, 0]
         },
         {
            health: maxHealth,
            maxHealth: maxHealth
         },
         {
            statusEffects: []
         },
         {
            tribeID: Game.tribe.id
         },
         {
            // @Incomplete: Shouldn't be random, should be sent by the server
            warPaintType: randInt(1, 5),
            titles: []
         },
         {
            inventories: {
               [InventoryName.hotbar]: new Inventory(Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, InventoryName.hotbar),
               [InventoryName.armourSlot]: new Inventory(1, 1, InventoryName.armourSlot),
               [InventoryName.gloveSlot]: new Inventory(1, 1, InventoryName.gloveSlot),
               [InventoryName.backpackSlot]: new Inventory(1, 1, InventoryName.backpackSlot),
               [InventoryName.backpack]: new Inventory(1, 1, InventoryName.backpack),
               [InventoryName.offhand]: new Inventory(1, 1, InventoryName.offhand),
            }
         },
         {
            inventoryUseInfos: [
               createInitialInventoryUseInfo(InventoryName.hotbar),
               createInitialInventoryUseInfo(InventoryName.offhand)
            ]
         },
         {
            username: definiteGameState.playerUsername
         }
      ];
      
      const player = new Player(position, playerID, 0, componentsData);
      player.addCircularHitbox(new CircularHitbox(1, 0, 0, HitboxCollisionType.soft, 1, 32));
      player.collisionBit = COLLISION_BITS.default;
      player.collisionMask = DEFAULT_COLLISION_MASK;
      Board.addEntity(player);

      Player.instance = player;

      Camera.setTrackedEntityID(player.id);

      // @Cleanup: Shouldn't be in this function
      definiteGameState.setPlayerHealth(maxHealth);
      definiteGameState.hotbar = new Inventory(Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, InventoryName.hotbar);
   }

   public static resolveCollisions(): void {
      // Don't resolve wall tile collisions in lightspeed mode
      if (!keyIsPressed("l")) {
         resolveWallTileCollisions(Player.instance!);
      }
      this.resolveBorderCollisions();
      this.resolveGameObjectCollisions();

      // @Cleanup: We call resolveWallCollisions 2 calls before this, is this really necessary??
      // Sometimes the player can get pushed out of the border by collisions (especially when clipping inside walls), so bring them back into the world when that happens
      Player.instance!.resolveBorderCollisions();
   }

   private static resolveBorderCollisions(): void {
      const physicsComponent = Player.instance!.getServerComponent(ServerComponentType.physics);

      for (const hitbox of Player.instance!.hitboxes) {
         // Left wall
         if (hitbox.bounds[0] < 0) {
            Player.instance!.position.x -= hitbox.bounds[0];
            physicsComponent.velocity.x = 0;
            // Right wall
         } else if (hitbox.bounds[1] > Settings.BOARD_UNITS) {
            Player.instance!.position.x -= hitbox.bounds[1] - Settings.BOARD_UNITS;
            physicsComponent.velocity.x = 0;
         }
         
         // Bottom wall
         if (hitbox.bounds[2] < 0) {
            Player.instance!.position.y -= hitbox.bounds[2];
            physicsComponent.velocity.y = 0;
            // Top wall
         } else if (hitbox.bounds[3] > Settings.BOARD_UNITS) {
            Player.instance!.position.y -= hitbox.bounds[3] - Settings.BOARD_UNITS;
            physicsComponent.velocity.y = 0;
         }
      }
   }
   
   private static resolveGameObjectCollisions(): void {
      if (Player.instance === null) throw new Error();
      
      const potentialCollidingEntities = this.getPotentialCollidingEntities();

      Player.instance.collidingEntities = [];

      for (let i = 0; i < potentialCollidingEntities.length; i++) {
         const entity = potentialCollidingEntities[i];

         // If the two entities are exactly on top of each other, don't do anything
         if (entity.position.x === Player.instance!.position.x && entity.position.y === Player.instance!.position.y) {
            continue;
         }

         for (const hitbox of Player.instance!.hitboxes) {
            for (const otherHitbox of entity.hitboxes) {
               if (hitbox.isColliding(otherHitbox)) {
                  if (!Player.instance.collidingEntities.includes(entity)) {
                     Player.instance.collidingEntities.push(entity);
                  }
                  
                  if ((entity.collisionMask & Player.instance.collisionBit) !== 0 && (Player.instance.collisionMask & entity.collisionBit) !== 0) {
                     collide(Player.instance!, hitbox, otherHitbox);
                  } else {
                     // @Hack
                     if (entity.collisionBit === COLLISION_BITS.plants) {
                        latencyGameState.lastPlantCollisionTicks = Board.ticks;
                     }
                     break;
                  }
               }
            }
         }
      }
   }

   private static getPotentialCollidingEntities(): ReadonlyArray<Entity> {
      const entities = new Array<Entity>();

      for (const chunk of Player.instance!.chunks) {
         for (const entity of chunk.entities) {
            if (entity !== Player.instance) {
               entities.push(entity);
            }
         }
      }

      return entities;
   }
}

export default Player;