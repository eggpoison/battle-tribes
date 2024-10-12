import { EntityID, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { PlanterBoxPlant, TunnelDoorSide } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import Player from "./entities/Player";
import Game from "./Game";
import Board from "./Board";
import Client from "./client/Client";
import { latencyGameState } from "./game-state/game-states";
import { BuildMenu_hide, BuildMenu_setBuildingID, BuildMenu_updateBuilding, entityCanOpenBuildMenu, isHoveringInBlueprintMenu } from "./components/game/BuildMenu";
import { InventoryMenuType, InventorySelector_inventoryIsOpen, InventorySelector_setInventoryMenuType } from "./components/game/inventories/InventorySelector";
import { SEED_TO_PLANT_RECORD } from "./entity-components/PlantComponent";
import { GhostInfo, GhostType, PARTIAL_OPACITY, setGhostInfo } from "./rendering/webgl/entity-ghost-rendering";
import { getClosestGroupNum } from "./rendering/webgl/entity-selection-rendering";
import { CraftingMenu_setCraftingStation, CraftingMenu_setIsVisible } from "./components/game/menus/CraftingMenu";
import { CraftingStation } from "battletribes-shared/items/crafting-recipes";
import { ItemType, InventoryName } from "battletribes-shared/items/items";
import { boxIsWithinRange } from "battletribes-shared/boxes/boxes";
import { getPlayerSelectedItem } from "./components/game/GameInteractableLayer";
import { entityExists, getEntityByID, getEntityLayer, getEntityType } from "./world";
import { TombstoneComponentArray } from "./entity-components/TombstoneComponent";
import { TunnelComponentArray } from "./entity-components/TunnelComponent";
import { PlanterBoxComponentArray } from "./entity-components/PlanterBoxComponent";
import { CraftingStationComponentArray } from "./entity-components/CraftingStationComponent";
import { InventoryUseComponentArray } from "./entity-components/InventoryUseComponent";
import { TransformComponentArray } from "./entity-components/TransformComponent";

const enum InteractActionType {
   openBuildMenu,
   plantSeed,
   useFertiliser,
   toggleTunnelDoor,
   startResearching,
   toggleDoor,
   openInventory,
   openCraftingStation
}

interface BaseInteractAction {
   readonly type: InteractActionType;
}

interface OpenBuildMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openBuildMenu;
}

interface PlantSeedAction extends BaseInteractAction {
   readonly type: InteractActionType.plantSeed;
   readonly plantType: PlanterBoxPlant;
}

interface UseFertiliserAction extends BaseInteractAction {
   readonly type: InteractActionType.useFertiliser;
}

interface ToggleTunnelDoorAction extends BaseInteractAction {
   readonly type: InteractActionType.toggleTunnelDoor;
   readonly doorSide: TunnelDoorSide;
}

interface StartResearchingAction extends BaseInteractAction {
   readonly type: InteractActionType.startResearching;
}

interface ToggleDoorAction extends BaseInteractAction {
   readonly type: InteractActionType.toggleDoor;
}

interface OpenInventoryAction extends BaseInteractAction {
   readonly type: InteractActionType.openInventory;
   readonly inventoryMenuType: InventoryMenuType;
}

interface OpenCraftingMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openCraftingStation;
   readonly craftingStation: CraftingStation;
}

type InteractAction = OpenBuildMenuAction | PlantSeedAction | UseFertiliserAction | ToggleTunnelDoorAction | StartResearchingAction | ToggleDoorAction | OpenInventoryAction | OpenCraftingMenuAction;

const HIGHLIGHT_RANGE = 75;
const HIGHLIGHT_DISTANCE = 150;

// @Cleanup: should we merge hovered and highlighted? having two very similar ones is confusing.
let hoveredEntityID = -1;
let highlightedEntity = -1;
let selectedEntityID = -1;

const getInventoryMenuType = (entity: EntityID): InventoryMenuType | null => {
   switch (getEntityType(entity)) {
      case EntityType.barrel: return InventoryMenuType.barrel;
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: return InventoryMenuType.tribesman;
      case EntityType.campfire: return InventoryMenuType.campfire;
      case EntityType.furnace: return InventoryMenuType.furnace;
      case EntityType.tombstone: {
         const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
         if (tombstoneComponent.deathInfo !== null) {
            return InventoryMenuType.tombstone;
         } else {
            return InventoryMenuType.none;
         }
      }
      case EntityType.ballista: return InventoryMenuType.ammoBox;
      default: return null;
   }
}

const getTunnelDoorSide = (groupNum: number): TunnelDoorSide => {
   switch (groupNum) {
      case 1: return 0b01;
      case 2: return 0b10;
      default: throw new Error();
   }
}

const getEntityInteractAction = (entity: EntityID): InteractAction | null => {
   const selectedItem = getPlayerSelectedItem();

   // Toggle tunnel doors
   if (TunnelComponentArray.hasComponent(entity)) {
      const groupNum = getClosestGroupNum(entity);
      if (groupNum !== 0) {
         return {
            type: InteractActionType.toggleTunnelDoor,
            doorSide: getTunnelDoorSide(groupNum)
         };
      }
   }

   // Use fertiliser / plant seeds
   if (selectedItem !== null && PlanterBoxComponentArray.hasComponent(entity)) {
      const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);

      // If holding fertiliser, try to fertilise the planter box
      if (selectedItem.type === ItemType.fertiliser && planterBoxComponent.hasPlant && !planterBoxComponent.isFertilised) {
         return {
            type: InteractActionType.useFertiliser
         };
      }
      
      // If holding a plant, try to place the seed in the planter box
      const plant = SEED_TO_PLANT_RECORD[selectedItem.type];
      if (typeof plant !== "undefined" && !planterBoxComponent.hasPlant) {
         return {
            type: InteractActionType.plantSeed,
            plantType: plant
         };
      }
   }
   
   // See if the entity can be used in the build menu
   if (entityCanOpenBuildMenu(entity)) {
      return {
         type: InteractActionType.openBuildMenu
      };
   }

   // Start researching
   const entityType = getEntityType(entity);
   if (entityType === EntityType.researchBench) {
      return {
         type: InteractActionType.startResearching
      };
   }

   // Toggle door
   if (entityType === EntityType.door || entityType === EntityType.fenceGate) {
      return {
         type: InteractActionType.toggleDoor
      };
   }

   // Crafting stations
   if (CraftingStationComponentArray.hasComponent(entity)) {
      const craftingStationComponent = CraftingStationComponentArray.getComponent(entity);
      return {
         type: InteractActionType.openCraftingStation,
         craftingStation: craftingStationComponent.craftingStation
      };
   }

   const inventoryMenuType = getInventoryMenuType(entity);
   if (inventoryMenuType !== null) {
      return {
         type: InteractActionType.openInventory,
         inventoryMenuType: inventoryMenuType
      };
   }
   
   return null;
}

const interactWithEntity = (entity: EntityID, action: InteractAction): void => {
   switch (action.type) {
      case InteractActionType.openBuildMenu: {
         // Select the entity and open the build menu
         selectedEntityID = entity;
         BuildMenu_setBuildingID(entity);
         BuildMenu_updateBuilding(entity);

         break;
      }
      case InteractActionType.plantSeed: {
         Client.sendModifyBuilding(highlightedEntity, action.plantType);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
         const hotbarUseInfo = inventoryUseComponent.getLimbInfoByInventoryName(InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = Board.serverTicks;
         
         break;
      }
      case InteractActionType.useFertiliser: {
         Client.sendModifyBuilding(entity, -1);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
         const hotbarUseInfo = inventoryUseComponent.getLimbInfoByInventoryName(InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = Board.serverTicks;

         break;
      }
      case InteractActionType.toggleTunnelDoor: {
         Client.sendStructureInteract(highlightedEntity, action.doorSide);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
         const hotbarUseInfo = inventoryUseComponent.getLimbInfoByInventoryName(InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = Board.serverTicks;
         
         break;
      }
      case InteractActionType.startResearching: {
         selectedEntityID = entity;

         Client.sendStructureInteract(highlightedEntity, 0);
         break;
      }
      case InteractActionType.toggleDoor: {
         Client.sendStructureInteract(highlightedEntity, 0);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
         const hotbarUseInfo = inventoryUseComponent.getLimbInfoByInventoryName(InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = Board.serverTicks;

         break;
      }
      case InteractActionType.openInventory: {
         selectedEntityID = entity;
         InventorySelector_setInventoryMenuType(action.inventoryMenuType);
         break;
      }
      case InteractActionType.openCraftingStation: {
         selectedEntityID = entity;
         CraftingMenu_setCraftingStation(action.craftingStation);
         CraftingMenu_setIsVisible(true);
         break;
      }
      default: {
         const unreachable: never = action;
         return unreachable;
      }
   }
}

export function getHoveredEntityID(): number {
   return hoveredEntityID;
}

export function getHighlightedEntityID(): number {
   return highlightedEntity;
}

export function getSelectedEntityID(): number {
   return selectedEntityID;
}

export function resetInteractableEntityIDs(): void {
   hoveredEntityID = -1;
   highlightedEntity = -1;
   selectedEntityID = -1;
}

export function getSelectedEntity(): EntityID {
   if (!entityExists(selectedEntityID)) {
      throw new Error("Can't select: Entity with ID " + selectedEntityID + " doesn't exist");
   }
   return selectedEntityID;
}

export function deselectSelectedEntity(closeInventory: boolean = true): void {
   const previouslySelectedEntity = getEntityByID(selectedEntityID);
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
   if (selectedEntityID === highlightedEntity) {
      deselectSelectedEntity();
   }

   highlightedEntity = -1;
}

// @Cleanup: name
const getEntityID = (doPlayerProximityCheck: boolean, doCanSelectCheck: boolean): number => {
   const playerTransformComponent = TransformComponentArray.getComponent(Player.instance!.id);
   const layer = getEntityLayer(Player.instance!.id);
   
   const minChunkX = Math.max(Math.floor((Game.cursorPositionX! - HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((Game.cursorPositionX! + HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((Game.cursorPositionY! - HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((Game.cursorPositionY! + HIGHLIGHT_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const origin = new Point(Game.cursorPositionX!, Game.cursorPositionY!);

   let minDist = HIGHLIGHT_RANGE + 1.1;
   let entityID = -1;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const currentEntity of chunk.nonGrassEntities) {
            if (doCanSelectCheck && getEntityInteractAction(currentEntity) === null) {
               continue;
            }

            const entityTransformComponent = TransformComponentArray.getComponent(currentEntity);

            if (doPlayerProximityCheck) {
               // @Incomplete: Should do it based on the distance from the closest hitbox rather than distance from center
               if (playerTransformComponent.position.calculateDistanceBetween(entityTransformComponent.position) > HIGHLIGHT_DISTANCE) {
                  continue;
               }
            }
            
            // Distance from cursor
            for (const hitbox of entityTransformComponent.hitboxes) {
               if (boxIsWithinRange(hitbox.box, origin, HIGHLIGHT_RANGE)) {
                  const distance = origin.calculateDistanceBetween(entityTransformComponent.position);
                  if (distance < minDist) {
                     minDist = distance;
                     entityID = currentEntity;
                  }
                  break;
               }
            }
         }
      }
   }

   return entityID;
}

const getPlantGhostType = (plantType: PlanterBoxPlant): GhostType => {
   switch (plantType) {
      case PlanterBoxPlant.tree: {
         return GhostType.treeSeed;
      }
      case PlanterBoxPlant.berryBush: {
         return GhostType.berryBushSeed;
      }
      case PlanterBoxPlant.iceSpikes: {
         return GhostType.iceSpikesSeed;
      }
   }
}

// @Cleanup: setGhostInfo called at every return
const updateHighlightedEntity = (entity: EntityID | null): void => {
   if (entity === null) {
      setGhostInfo(null);
      return;
   }
   
   const interactAction = getEntityInteractAction(entity);
   if (interactAction === null) {
      setGhostInfo(null);
      return;
   }
   
   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   
   switch (interactAction.type) {
      case InteractActionType.plantSeed: {
         const ghostInfo: GhostInfo = {
            position: entityTransformComponent.position,
            rotation: entityTransformComponent.rotation,
            ghostType: getPlantGhostType(interactAction.plantType),
            tint: [1, 1, 1],
            opacity: PARTIAL_OPACITY
         };
         setGhostInfo(ghostInfo);
         break;
      }
      case InteractActionType.useFertiliser: {
         const ghostInfo: GhostInfo = {
            position: entityTransformComponent.position,
            rotation: entityTransformComponent.rotation,
            ghostType: GhostType.fertiliser,
            tint: [1, 1, 1],
            opacity: PARTIAL_OPACITY
         };
         setGhostInfo(ghostInfo);
         break;
      }
      default: {
         setGhostInfo(null);
         break;
      }
   }
}

export function updateHighlightedAndHoveredEntities(): void {
   if (Game.cursorPositionX === null || Game.cursorPositionY === null) {
      return;
   }

   // @Hack
   if (Player.instance === null) {
      hoveredEntityID = -1;
      return;
   }

   // @Cleanup: This is a pretty messy function: has 3 different scenarios, only separated by guards. Maybe refactor?

   // @Hack?
   if (latencyGameState.playerIsPlacingEntity) {
      // When the player is placing an entity, we don't want them to be able to select entities.
      deselectHighlightedEntity();
      hoveredEntityID = getEntityID(false, false);
      return;
   }

   // If the player is interacting with an inventory, only consider the distance from the player not the cursor
   if (Player.instance !== null && entityExists(selectedEntityID) && (isHoveringInBlueprintMenu() || InventorySelector_inventoryIsOpen())) {
      const selectedEntity = getSelectedEntity();

      const playerTransformComponent = TransformComponentArray.getComponent(Player.instance.id);
      const entityTransformComponent = TransformComponentArray.getComponent(selectedEntity);
      
      const distance = playerTransformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
      if (distance <= HIGHLIGHT_DISTANCE) {
         hoveredEntityID = getEntityID(false, false);
         return;
      }
   }

   hoveredEntityID = getEntityID(false, false);

   const newHighlightedEntityID = getEntityID(true, true);
   if (newHighlightedEntityID !== highlightedEntity) {
      setGhostInfo(null);
      deselectHighlightedEntity();
      highlightedEntity = newHighlightedEntityID;
   }

   updateHighlightedEntity(entityExists(highlightedEntity) ? highlightedEntity : null);
}

export function attemptEntitySelection(): boolean {
   if (!entityExists(highlightedEntity)) {
      // When a new entity is selected, deselect the previous entity
      deselectSelectedEntity();
      return false;
   }

   const interactAction = getEntityInteractAction(highlightedEntity);
   if (interactAction !== null) {
      interactWithEntity(highlightedEntity, interactAction);
      return true;
   }

   return false;
}

export function updateSelectedStructure(): void {
   if (highlightedEntity === -1) {
      deselectSelectedEntity();
   }
}