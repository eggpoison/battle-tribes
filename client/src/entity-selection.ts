import { EntityType } from "webgl-test-shared/dist/entities";
import { circleAndRectangleDoIntersect, circlesDoIntersect } from "webgl-test-shared/dist/collision";
import { Point } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ITEM_TYPE_RECORD, InventoryName } from "webgl-test-shared/dist/items";
import { getTechByID } from "webgl-test-shared/dist/techs";
import { Settings } from "webgl-test-shared/dist/settings";
import Player, { getPlayerSelectedItem } from "./entities/Player";
import Game from "./Game";
import Board from "./Board";
import Hitbox from "./hitboxes/Hitbox";
import CircularHitbox from "./hitboxes/CircularHitbox";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import Entity from "./Entity";
import Client from "./client/Client";
import { latencyGameState, playerIsHoldingHammer } from "./game-state/game-states";
import { BuildMenu_hide, BuildMenu_setBuildingID, BuildMenu_updateBuilding, entityCanOpenBuildMenu, isHoveringInBlueprintMenu } from "./components/game/BuildMenu";
import { InventoryMenuType, InventorySelector_inventoryIsOpen, InventorySelector_setInventoryMenuType } from "./components/game/inventories/InventorySelector";
import { getClosestGroupNum } from "./rendering/entity-selection-rendering";
import { SEED_TO_PLANT_RECORD } from "./entity-components/PlantComponent";

const HIGHLIGHT_RANGE = 75;
const HIGHLIGHT_DISTANCE = 150;

let hoveredEntityID = -1;
let highlightedEntityID = -1;
let selectedEntityID = -1;

const hitboxIsWithinRange = (position: Point, hitbox: Hitbox, visionRange: number): boolean => {
   if (hitbox.hasOwnProperty("radius")) {
      // Circular hitbox
      return circlesDoIntersect(position.x, position.y, visionRange, hitbox.position.x, hitbox.position.y, (hitbox as CircularHitbox).radius);
   } else {
      // Rectangular hitbox
      return circleAndRectangleDoIntersect(position.x, position.y, visionRange, hitbox.position.x, hitbox.position.y, (hitbox as RectangularHitbox).width, (hitbox as RectangularHitbox).height, (hitbox as RectangularHitbox).rotation + (hitbox as RectangularHitbox).externalRotation);
   }
}

export function getHoveredEntityID(): number {
   return hoveredEntityID;
}

export function getHighlightedEntityID(): number {
   return highlightedEntityID;
}

export function getSelectedEntityID(): number {
   return selectedEntityID;
}

export function resetInteractableEntityIDs(): void {
   hoveredEntityID = -1;
   highlightedEntityID = -1;
   selectedEntityID = -1;
}

export function getSelectedEntity(): Entity {
   const entity = Board.entityRecord[selectedEntityID];
   
   if (typeof entity === "undefined") {
      throw new Error("Can't select: Entity with ID " + selectedEntityID + " doesn't exist");
   }

   return entity;
}

export function deselectSelectedEntity(closeInventory: boolean = true): void {
   const previouslySelectedEntity = Board.entityRecord[selectedEntityID];
   if (typeof previouslySelectedEntity !== "undefined") {
      Client.sendStructureUninteract(previouslySelectedEntity.id);

      BuildMenu_hide();
   }

   selectedEntityID = -1;

   if (closeInventory) {
      InventorySelector_setInventoryMenuType(InventoryMenuType.none);
   }
}

export function deselectHighlightedEntity(): void {
   if (selectedEntityID === highlightedEntityID) {
      deselectSelectedEntity();
   }

   highlightedEntityID = -1;
}

const entityCanBeSelected = (entity: Entity): boolean => {
   // Tunnels can be selected if they have doors
   if (entity.type === EntityType.tunnel) {
      const tunnelComponent = entity.getServerComponent(ServerComponentType.tunnel);
      if (tunnelComponent.doorBitset !== 0) {
         return true;
      }
   }

   // Planter boxes can be selected if the player is trying to place a plant in them
   if (entity.type === EntityType.planterBox) {
      const selectedItem = getPlayerSelectedItem();
      if (selectedItem !== null && typeof SEED_TO_PLANT_RECORD[selectedItem.type] !== "undefined") {
         const planterBoxComponent = entity.getServerComponent(ServerComponentType.planterBox);
         if (!planterBoxComponent.hasPlant) {
            return true;
         }
      }
   }
   
   // Buildings can be selected if the player is holding a hammer
   if (entity.type === EntityType.wall || entity.type === EntityType.tunnel || entity.type === EntityType.embrasure || entity.type === EntityType.planterBox || entity.type === EntityType.fence) {
      const selectedItem = getPlayerSelectedItem();
      return selectedItem !== null && ITEM_TYPE_RECORD[selectedItem.type] === "hammer";
   }

   // Research benches can be selected if there is study able to be done
   if (entity.type === EntityType.researchBench) {
      if (Game.tribe.selectedTechID === null) {
         return false;
      }

      if (Game.tribe.techTreeUnlockProgress.hasOwnProperty(Game.tribe.selectedTechID)) {
         const techInfo = getTechByID(Game.tribe.selectedTechID);
         if (Game.tribe.techTreeUnlockProgress[Game.tribe.selectedTechID]!.studyProgress >= techInfo.researchStudyRequirements) {
            return false;
         }
      }

      return true;
   }

   if (entity.type === EntityType.tribeWorker || entity.type === EntityType.tribeWarrior) {
      const tribeComponent = entity.getServerComponent(ServerComponentType.tribe);
      if (tribeComponent.tribeID === Game.tribe.id) {
         return true;
      } else {
         const tribesmanComponent = entity.getServerComponent(ServerComponentType.tribesman);
         if (tribesmanComponent.relationsWithPlayer > -30) {
            return true;
         }
      }
   }

   return entity.type === EntityType.door
      || entity.type === EntityType.barrel
      || entity.type === EntityType.furnace
      || entity.type === EntityType.campfire
      || entity.type === EntityType.ballista
      || entity.type === EntityType.slingTurret
      || entity.type === EntityType.workerHut
      || entity.type === EntityType.warriorHut
      || entity.type === EntityType.floorSpikes
      || entity.type === EntityType.wallSpikes
      || entity.type === EntityType.floorPunjiSticks
      || entity.type === EntityType.wallPunjiSticks
      || entity.type === EntityType.fenceGate;
}

// @Cleanup: name
const getEntityID = (doPlayerProximityCheck: boolean, doCanSelectCheck: boolean): number => {
   const minChunkX = Math.max(Math.floor((Game.cursorPositionX! - HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((Game.cursorPositionX! + HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((Game.cursorPositionY! - HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((Game.cursorPositionY! + HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const origin = new Point(Game.cursorPositionX!, Game.cursorPositionY!);

   let minDist = HIGHLIGHT_RANGE + 1.1;
   let entityID = -1;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (doCanSelectCheck && !entityCanBeSelected(entity)) {
               continue;
            }

            if (doPlayerProximityCheck) {
               // @Incomplete: Should do it based on the distance from the closest hitbox rather than distance from center
               if (Player.instance!.position.calculateDistanceBetween(entity.position) > HIGHLIGHT_DISTANCE) {
                  continue;
               }
            }
            
            // Distance from cursor
            for (const hitbox of entity.hitboxes) {
               if (hitboxIsWithinRange(origin, hitbox, HIGHLIGHT_RANGE)) {
                  const distance = origin.calculateDistanceBetween(entity.position);
                  if (distance < minDist) {
                     minDist = distance;
                     entityID = entity.id;
                  }
                  break;
               }
            }
         }
      }
   }

   return entityID;
}

export function updateHighlightedAndHoveredEntities(): void {
   if (Player.instance === null || Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return;
   }

   // @Cleanup: This is a pretty messy function: has 3 different scenarios, only separated by guards. Maybe refactor?

   if (latencyGameState.playerIsPlacingEntity) {
      // When the player is placing an entity, we don't want them to be able to select entities.
      deselectHighlightedEntity();
      hoveredEntityID = getEntityID(false, false);
      return;
   }

   // If the player is interacting with an inventory, only consider the distance from the player not the cursor
   if (selectedEntityID !== -1 && Board.entityRecord.hasOwnProperty(selectedEntityID) && (isHoveringInBlueprintMenu() || InventorySelector_inventoryIsOpen())) {
      const selectedEntity = getSelectedEntity();
      const distance = Player.instance.position.calculateDistanceBetween(selectedEntity.position);
      if (distance <= HIGHLIGHT_DISTANCE) {
         hoveredEntityID = getEntityID(false, false);
         return;
      }
   }

   hoveredEntityID = getEntityID(false, false);

   const newHighlightedEntityID = getEntityID(true, true);
   if (newHighlightedEntityID !== highlightedEntityID) {
      deselectHighlightedEntity();
      highlightedEntityID = newHighlightedEntityID;
   }
}

export function attemptEntitySelection(): void {
   // Deselect the previous entity
   // @Cleanup: why is this needed?
   if (selectedEntityID !== -1) {
      deselectSelectedEntity();
   }

   const highlightedEntity = Board.entityRecord[highlightedEntityID];
   if (typeof highlightedEntity === "undefined") {
      return;
   }
   
   if (entityCanOpenBuildMenu(highlightedEntity)) {
      // Select the entity and open the build menu
      selectedEntityID = highlightedEntityID;
      BuildMenu_setBuildingID(highlightedEntityID);
      BuildMenu_updateBuilding(highlightedEntityID);
   } else {
      BuildMenu_setBuildingID(0);
      
      switch (highlightedEntity.type) {
         case EntityType.tunnel: {
            const groupNum = getClosestGroupNum(highlightedEntity);
            if (groupNum === 0) {
               break;
            }
            
            let interactData: number;
            switch (groupNum) {
               case 1: interactData = 0b01; break;
               case 2: interactData = 0b10; break;
               default: throw new Error();
            }

            Client.sendStructureInteract(highlightedEntityID, interactData);
            break;
         }
         case EntityType.door: {
            Client.sendStructureInteract(highlightedEntityID, 0);
            break;
         }
         case EntityType.researchBench: {
            Client.sendStructureInteract(highlightedEntityID, 0);
            break;
         }
         case EntityType.fenceGate: {
            Client.sendStructureInteract(highlightedEntityID, 0);
            break;
         }
         case EntityType.barrel: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.barrel);
            break;
         }
         case EntityType.tribeWorker:
         case EntityType.tribeWarrior: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.tribesman);
            break;
         }
         case EntityType.campfire: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.campfire);
            break;
         }
         case EntityType.furnace: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.furnace);
            break;
         }
         case EntityType.tombstone: {
            const tombstoneComponent = highlightedEntity.getServerComponent(ServerComponentType.tombstone);
            if (tombstoneComponent.deathInfo !== null) {
               InventorySelector_setInventoryMenuType(InventoryMenuType.tombstone);
            } else {
               InventorySelector_setInventoryMenuType(InventoryMenuType.none);
            }
            break;
         }
         case EntityType.ballista: {
            InventorySelector_setInventoryMenuType(InventoryMenuType.ammoBox);
            break;
         }
         case EntityType.planterBox: {
            const selectedItem = getPlayerSelectedItem()!;
            const plant = SEED_TO_PLANT_RECORD[selectedItem.type];
            if (typeof plant !== "undefined") {
               Client.sendModifyBuilding(highlightedEntityID, plant);

               // @Hack
               const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
               const hotbarUseInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);
               hotbarUseInfo.lastAttackTicks = Board.ticks;
            }
            break;
         }
      }
   }



      

   // let shouldShowBuildMenu = false;
   // let shouldSetSelectedEntity = true;

   // const highlightedEntity = Board.entityRecord[highlightedEntityID];
   // if (typeof highlightedEntity !== "undefined") {

   //    switch (highlightedEntity.type) {
   //       case EntityType.wall: {
   //          shouldShowBuildMenu = true;
   //          break;
   //       }
   //       case EntityType.tunnel: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //             break;
   //          }
            
   //          const groupNum = getClosestGroupNum(highlightedEntity);
   //          if (groupNum === 0) {
   //             break;
   //          }
            
   //          let interactData: number;
   //          switch (groupNum) {
   //             case 1: interactData = 0b01; break;
   //             case 2: interactData = 0b10; break;
   //             default: throw new Error();
   //          }

   //          Client.sendStructureInteract(highlightedEntityID, interactData);
   //          shouldSetSelectedEntity = false;
   //          break;
   //       }
   //       case EntityType.door: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //          } else {
   //             Client.sendStructureInteract(highlightedEntityID, 0);
   //             shouldSetSelectedEntity = false;
   //          }
   //          break;
   //       }
   //       case EntityType.researchBench: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //          } else {
   //             Client.sendStructureInteract(highlightedEntityID, 0);
   //          }
   //          break;
   //       }
   //       case EntityType.fence: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //          }
   //          break;
   //       }
   //       case EntityType.fenceGate: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //          } else {
   //             Client.sendStructureInteract(highlightedEntityID, 0);
   //             shouldSetSelectedEntity = false;
   //          }
   //          break;
   //       }
   //       case EntityType.barrel: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //          } else {
   //             InventorySelector_setInventoryMenuType(InventoryMenuType.barrel);
   //          }
   //          break;
   //       }
   //       case EntityType.tribeWorker:
   //       case EntityType.tribeWarrior: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //          } else {
   //             InventorySelector_setInventoryMenuType(InventoryMenuType.tribesman);
   //          }
   //          break;
   //       }
   //       case EntityType.campfire: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //          } else {
   //             InventorySelector_setInventoryMenuType(InventoryMenuType.campfire);
   //          }
   //          break;
   //       }
   //       case EntityType.furnace: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //          } else {
   //             InventorySelector_setInventoryMenuType(InventoryMenuType.furnace);
   //          }
   //          break;
   //       }
   //       case EntityType.tombstone: {
   //          const tombstoneComponent = highlightedEntity.getServerComponent(ServerComponentType.tombstone);
   //          if (tombstoneComponent.deathInfo !== null) {
   //             InventorySelector_setInventoryMenuType(InventoryMenuType.tombstone);
   //          } else {
   //             InventorySelector_setInventoryMenuType(InventoryMenuType.none);
   //          }
   //          break;
   //       }
   //       case EntityType.ballista: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //          } else {
   //             InventorySelector_setInventoryMenuType(InventoryMenuType.ammoBox);
   //          }
   //          break;
   //       }
   //       case EntityType.planterBox: {
   //          if (playerIsHoldingHammer()) {
   //             shouldShowBuildMenu = true;
   //             break;
   //          }
            
   //          const selectedItem = getPlayerSelectedItem()!;
   //          const plant = SEED_TO_PLANT_RECORD[selectedItem.type];
   //          if (typeof plant !== "undefined") {
   //             Client.sendModifyBuilding(highlightedEntityID, plant);
   //             shouldSetSelectedEntity = false;

   //             // @Hack
   //             const inventoryUseComponent = Player.instance!.getServerComponent(ServerComponentType.inventoryUse);
   //             const hotbarUseInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);
   //             hotbarUseInfo.lastAttackTicks = Board.ticks;
   //          }
   //          break;
   //       }
   //       case EntityType.workerHut:
   //       case EntityType.warriorHut: {
   //          shouldShowBuildMenu = true;
   //          break;
   //       }
   //       default: {
   //          InventorySelector_setInventoryMenuType(InventoryMenuType.none);
   //          break;
   //       }
   //    }
   // }

   // if (shouldSetSelectedEntity) {
   //    selectedEntityID = highlightedEntityID;
   // }

   // if (shouldShowBuildMenu) {
   //    BuildMenu_setBuildingID(highlightedEntityID);
   //    BuildMenu_updateBuilding(highlightedEntityID);
   // } else {
   //    BuildMenu_setBuildingID(0);
   // }
}

export function updateSelectedStructure(): void {
   if (highlightedEntityID === -1) {
      deselectSelectedEntity();
   }
}