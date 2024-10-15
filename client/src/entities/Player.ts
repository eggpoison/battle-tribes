import Camera from "../Camera";
import { halfWindowHeight, halfWindowWidth } from "../webgl";
import TribeMember, { addTribeMemberRenderParts } from "./TribeMember";
import { ClientComponentType } from "../entity-components/components";
import FootprintComponent, { FootprintComponentArray } from "../entity-components/server-components/FootprintComponent";
import EquipmentComponent, { EquipmentComponentArray } from "../entity-components/server-components/EquipmentComponent";
import { PhysicsComponentArray } from "../entity-components/server-components/PhysicsComponent";
import { Settings } from "battletribes-shared/settings";
import { TransformComponentArray } from "../entity-components/server-components/TransformComponent";
import { getEntityRenderInfo } from "../world";

/** Updates the rotation of the player to match the cursor position */
export function updatePlayerRotation(cursorX: number, cursorY: number): void {
   if (Player.instance === null || cursorX === null || cursorY === null) return;

   const relativeCursorX = cursorX - halfWindowWidth;
   const relativeCursorY = -cursorY + halfWindowHeight;

   let cursorDirection = Math.atan2(relativeCursorY, relativeCursorX);
   cursorDirection = Math.PI/2 - cursorDirection;

   const transformComponent = TransformComponentArray.getComponent(Player.instance.id);
   const physicsComponent = PhysicsComponentArray.getComponent(Player.instance.id);
   
   const previousRotation = transformComponent.rotation;
   transformComponent.rotation = cursorDirection;

   // Angular velocity
   physicsComponent.angularVelocity = (transformComponent.rotation - previousRotation) * Settings.TPS;

   const renderInfo = getEntityRenderInfo(Player.instance.id);
   renderInfo.dirty();
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

export default class Player extends TribeMember {
   // @Cleanup: once reworked entity out of existance, this should be changed to instanceID which can be EntityID | null (or Entity | null)
   /** The player entity associated with the current player. If null, then the player is dead */
   public static instance: Player | null = null;
   
   constructor(id: number) {
      super(id);
      
      FootprintComponentArray.addComponent(this.id, new FootprintComponent(this, 0.2, 20, 64, 4, 64));
      EquipmentComponentArray.addComponent(this.id, new EquipmentComponent(this));
   }

   public onLoad(): void {
      addTribeMemberRenderParts(this.id);
   }

   public static createInstancePlayer(player: Player): void {
      Player.instance = player;
      Camera.setTrackedEntityID(player.id);
   }
}

if (module.hot) {
   module.hot.dispose(data => {
      data.playerInstance = Player.instance;
   });

   if (module.hot.data) {
      Player.instance = module.hot.data.playerInstance;
   }
}