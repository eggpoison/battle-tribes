import { Entity, EntityType, PlantedEntityType, assert, distance, Point, rotateXAroundOrigin, rotateYAroundOrigin, TunnelDoorSide, Settings, ItemType, InventoryName, ITEM_INFO_RECORD, HitboxCollisionType, CircularBox, DEFAULT_COLLISION_MASK, CollisionBit, CraftingStationEntityType, TamingSkillID } from "webgl-test-shared";
import { currentSnapshot } from "./client";
import { entityExists, getCurrentLayer, getEntityRenderInfo, getEntityType } from "./world";
import { TombstoneComponentArray } from "./entity-components/server-components/TombstoneComponent";
import { TunnelComponentArray } from "./entity-components/server-components/TunnelComponent";
import { PlanterBoxComponentArray } from "./entity-components/server-components/PlanterBoxComponent";
import { CraftingStationComponentArray } from "./entity-components/server-components/CraftingStationComponent";
import { getLimbByInventoryName, InventoryUseComponentArray } from "./entity-components/server-components/InventoryUseComponent";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { sendMountCarrySlotPacket, sendPickUpEntityPacket, sendStructureInteractPacket, sendModifyBuildingPacket, sendSetCarryTargetPacket, sendSetAttackTargetPacket, sendOpenEntityInventoryPacket } from "./networking/packet-sending";
import { EntityRenderInfo } from "./EntityRenderInfo";
import { RideableComponentArray } from "./entity-components/server-components/RideableComponent";
import TexturedRenderPart from "./render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "./texture-atlases/texture-atlases";
import { playerInstance } from "./player";
import { HealthComponentArray } from "./entity-components/server-components/HealthComponent";
import { entityIsTameableByPlayer, hasTamingSkill, TamingComponentArray } from "./entity-components/server-components/TamingComponent";
import { createHitboxQuick, getDistanceFromPointToEntity, getHitboxVelocity } from "./hitboxes";
import { FloorSignComponentArray } from "./entity-components/server-components/FloorSignComponent";
import { Menu, menuIsInventory, menuSelectorState } from "../ui-state/menu-selector-state.svelte";
import { getPlayerSelectedItem, playerIsPlacingEntity } from "./player-action-handling";
import { cameraPosition, cameraZoom, cursorWorldPos } from "./camera";
import { entitySelectionState } from "../ui-state/entity-selection-state.svelte";
import { GameInteractState, gameUIState } from "../ui-state/game-ui-state.svelte";
import { AnimalStaffCommandType, createControlCommandParticles } from "./particles";
import { BuildMenuOption, buildMenuState, getBuildMenuOptions } from "../ui-state/build-menu-state.svelte";
import { setActiveResearchBench } from "./research";

const enum InteractActionType {
   openBuildMenu,
   plantSeed,
   useFertiliser,
   toggleTunnelDoor,
   startResearching,
   toggleDoor,
   openMenu,
   openCraftingStation,
   openAnimalStaffMenu,
   mountCarrySlot,
   pickUpEntity,
   setCarryTarget,
   selectAttackTarget,
   openTamingMenu,
   inscribeFloorSign,
   pickUpDustfleaEgg
}

interface BaseInteractAction {
   readonly type: InteractActionType;
   readonly interactEntity: Entity;
   readonly interactRange: number;
}

interface OpenBuildMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openBuildMenu;
   readonly options: ReadonlyArray<BuildMenuOption>;
}

interface PlantSeedAction extends BaseInteractAction {
   readonly type: InteractActionType.plantSeed;
   readonly plantedEntityType: PlantedEntityType;
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

interface OpenMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openMenu;
   readonly menu: Menu;
}

interface OpenCraftingMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openCraftingStation;
   readonly craftingStation: CraftingStationEntityType;
}

interface OpenAnimalStaffMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openAnimalStaffMenu;
}

interface MountCarrySlotAction extends BaseInteractAction {
   readonly type: InteractActionType.mountCarrySlot;
   readonly carrySlotIdx: number;
}

interface PickUpEntityAction extends BaseInteractAction {
   readonly type: InteractActionType.pickUpEntity;
}

interface SetCarryTargetAction extends BaseInteractAction {
   readonly type: InteractActionType.setCarryTarget;
}

interface SelectAttackTargetAction extends BaseInteractAction {
   readonly type: InteractActionType.selectAttackTarget;
}

interface OpenTamingMenuAction extends BaseInteractAction {
   readonly type: InteractActionType.openTamingMenu;
}

interface InscribeFloorSignAction extends BaseInteractAction {
   readonly type: InteractActionType.inscribeFloorSign;
}

interface PickUpDustfleaEggAction extends BaseInteractAction {
   readonly type: InteractActionType.pickUpDustfleaEgg;
}

type InteractAction = OpenBuildMenuAction | PlantSeedAction | UseFertiliserAction | ToggleTunnelDoorAction | StartResearchingAction | ToggleDoorAction | OpenMenuAction | OpenCraftingMenuAction | OpenAnimalStaffMenuAction | MountCarrySlotAction | PickUpEntityAction | SetCarryTargetAction | SelectAttackTargetAction | OpenTamingMenuAction | InscribeFloorSignAction | PickUpDustfleaEggAction;

const HIGHLIGHT_CURSOR_RANGE = 75;
const DEFAULT_ENTITY_INTERACT_RANGE = 150

/** The render info which an outline will be rendered around. */
let highlightedRenderInfo: EntityRenderInfo | null = null;

const SEED_TO_PLANT_RECORD: Partial<Record<ItemType, PlantedEntityType>> = {
   [ItemType.seed]: EntityType.treePlanted,
   [ItemType.berry]: EntityType.berryBushPlanted,
   [ItemType.frostcicle]: EntityType.iceSpikesPlanted
};

export function getHighlightedRenderInfo(): EntityRenderInfo | null {
   return highlightedRenderInfo;
}

const getEntityMenu = (entity: Entity): Menu | null => {
   switch (getEntityType(entity)) {
      case EntityType.barrel: return Menu.barrelInventory;
      case EntityType.tribeWorker:
      case EntityType.tribeWarrior: return Menu.tribesmanInventory;
      case EntityType.campfire: return Menu.campfireInventory;
      case EntityType.furnace: return Menu.furnaceInventory;
      case EntityType.tombstone: {
         const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
         if (tombstoneComponent.deathInfo !== null) {
            return Menu.tombstoneEpitaph;
         } else {
            return null;
         }
      }
      case EntityType.ballista: return Menu.ammoBoxInventory;
      default: return null;
   }
}

const getTunnelDoorSide = (groupNum: number): TunnelDoorSide => {
   switch (groupNum) {
      case 1: return 0b01;
      case 2:
      default: return 0b10;
   }
}

const getSelectedCarrySlotIdx = (entity: Entity): number | null => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   const rideableComponent = RideableComponentArray.getComponent(entity);

   let minDist = Number.MAX_SAFE_INTEGER;
   let closestCarrySlotIdx: number | null = null;
   
   for (let i = 0; i < rideableComponent.carrySlots.length; i++) {
      const carrySlot = rideableComponent.carrySlots[i];
      const x = hitbox.box.position.x + rotateXAroundOrigin(carrySlot.offsetX, carrySlot.offsetY, hitbox.box.angle);
      const y = hitbox.box.position.y + rotateYAroundOrigin(carrySlot.offsetX, carrySlot.offsetY, hitbox.box.angle);

      const dist = distance(x, y, cursorWorldPos.x, cursorWorldPos.y);
      if (dist < minDist) {
         minDist = dist;
         closestCarrySlotIdx = i;
      }
   }

   return closestCarrySlotIdx;
}

const getEntityInteractAction = (entity: Entity): InteractAction | null => {
   const selectedItem = getPlayerSelectedItem();

   if (gameUIState.gameInteractState === GameInteractState.selectCarryTarget) {
      const entityType = getEntityType(entity);
      // @Hack
      if (entityType !== EntityType.tree && entityType !== EntityType.boulder) {
         return {
            type: InteractActionType.setCarryTarget,
            interactEntity: entity,
            interactRange: Number.MAX_SAFE_INTEGER
         };
      }
   }
   if (gameUIState.gameInteractState === GameInteractState.selectAttackTarget) {
      if (HealthComponentArray.hasComponent(entity)) {
         return {
            type: InteractActionType.selectAttackTarget,
            interactEntity: entity,
            interactRange: Number.MAX_SAFE_INTEGER
         };
      }
   }

   // Toggle tunnel doors
   if (TunnelComponentArray.hasComponent(entity)) {
      return {
         type: InteractActionType.toggleTunnelDoor,
         interactEntity: entity,
         interactRange: DEFAULT_ENTITY_INTERACT_RANGE,
         // @HACK: GROUP NUM PARAMETER IS OBSOLETE
         doorSide: getTunnelDoorSide(0)
      };
   }

   // Use fertiliser / plant seeds
   if (selectedItem !== null) {
      const planterBoxComponent = PlanterBoxComponentArray.tryGetComponent(entity);
      if (planterBoxComponent !== null) {
         // If holding fertiliser, try to fertilise the planter box
         if (selectedItem.type === ItemType.fertiliser && planterBoxComponent.hasPlant && !planterBoxComponent.isFertilised) {
            return {
               type: InteractActionType.useFertiliser,
               interactEntity: entity,
               interactRange: DEFAULT_ENTITY_INTERACT_RANGE
            };
         }
         
         // If holding a plant, try to place the seed in the planter box
         const plant = SEED_TO_PLANT_RECORD[selectedItem.type];
         if (typeof plant !== "undefined" && !planterBoxComponent.hasPlant) {
            return {
               type: InteractActionType.plantSeed,
               interactEntity: entity,
               interactRange: DEFAULT_ENTITY_INTERACT_RANGE,
               plantedEntityType: plant
            };
         }
      }
   }
   
   // See if the entity can be used in the build menu
   const options = getBuildMenuOptions(entity);
   if (options.length > 0) {
      return {
         type: InteractActionType.openBuildMenu,
         interactEntity: entity,
         interactRange: DEFAULT_ENTITY_INTERACT_RANGE,
         options: options
      };
   }

   // Start researching
   const entityType = getEntityType(entity);
   if (entityType === EntityType.researchBench) {
      return {
         type: InteractActionType.startResearching,
         interactEntity: entity,
         interactRange: DEFAULT_ENTITY_INTERACT_RANGE
      };
   }

   // Toggle door
   if (entityType === EntityType.door || entityType === EntityType.fenceGate) {
      return {
         type: InteractActionType.toggleDoor,
         interactEntity: entity,
         interactRange: DEFAULT_ENTITY_INTERACT_RANGE
      };
   }

   // Crafting stations
   if (CraftingStationComponentArray.hasComponent(entity)) {
      return {
         type: InteractActionType.openCraftingStation,
         interactEntity: entity,
         interactRange: DEFAULT_ENTITY_INTERACT_RANGE,
         craftingStation: getEntityType(entity) as CraftingStationEntityType
      };
   }

   // Animal staff options
   if (selectedItem !== null && selectedItem.type === ItemType.animalStaff && entityIsTameableByPlayer(entity)) {
      return {
         type: InteractActionType.openAnimalStaffMenu,
         interactEntity: entity,
         interactRange: ITEM_INFO_RECORD[ItemType.animalStaff].controlRange
      };
   }

   // Taming almanac
   if (selectedItem !== null && selectedItem.type === ItemType.tamingAlmanac && entityIsTameableByPlayer(entity)) {
      return {
         type: InteractActionType.openTamingMenu,
         interactEntity: entity,
         interactRange: DEFAULT_ENTITY_INTERACT_RANGE
      };
   // Rideable entities
   } else if (RideableComponentArray.hasComponent(entity)) {
      // If the entity requires taming before it is rideable, make sure it has the appropriate skill
      let isRideable = true;
      const tamingComponent = TamingComponentArray.getComponent(entity);
      if (tamingComponent !== null) {
         if (!hasTamingSkill(tamingComponent, TamingSkillID.riding)) {
            isRideable = false;
         }
      }
      
      if (isRideable) {
         const carrySlotIdx = getSelectedCarrySlotIdx(entity);
         if (carrySlotIdx !== null) {
            // @Hack
            const rideableComponent = RideableComponentArray.getComponent(entity);
            const carrySlot = rideableComponent.carrySlots[carrySlotIdx];
            if (!entityExists(carrySlot.occupiedEntity)) {
               return {
                  type: InteractActionType.mountCarrySlot,
                  interactEntity: entity,
                  interactRange: DEFAULT_ENTITY_INTERACT_RANGE,
                  carrySlotIdx: carrySlotIdx
               };
            }
         }
      }
   }

   // Pick up arrows
   if (entityType === EntityType.woodenArrow) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      if (getHitboxVelocity(hitbox).magnitude() < 1) {
         return {
            type: InteractActionType.pickUpEntity,
            interactEntity: entity,
            interactRange: DEFAULT_ENTITY_INTERACT_RANGE
         };
      }
   }

   // Pick up dustflea eggs
   if (entityType === EntityType.dustfleaEgg) {
      return {
         type: InteractActionType.pickUpEntity,
         interactEntity: entity,
         interactRange: DEFAULT_ENTITY_INTERACT_RANGE
      };
   }

   // Inscribe signs
   if (FloorSignComponentArray.hasComponent(entity)) {
      return {
         type: InteractActionType.inscribeFloorSign,
         interactEntity: entity,
         interactRange: DEFAULT_ENTITY_INTERACT_RANGE
      };
   }

   const menu = getEntityMenu(entity);
   if (menu !== null) {
      return {
         type: InteractActionType.openMenu,
         interactEntity: entity,
         interactRange: DEFAULT_ENTITY_INTERACT_RANGE,
         menu: menu
      };
   }
   
   return null;
}

const createInteractRenderInfo = (interactAction: InteractAction): EntityRenderInfo => {
   switch (interactAction.type) {
      case InteractActionType.openBuildMenu:
      case InteractActionType.plantSeed:
      case InteractActionType.useFertiliser:
      case InteractActionType.toggleTunnelDoor:
      case InteractActionType.startResearching:
      case InteractActionType.toggleDoor:
      case InteractActionType.openMenu:
      case InteractActionType.openCraftingStation:
      case InteractActionType.openAnimalStaffMenu:
      case InteractActionType.pickUpEntity:
      case InteractActionType.setCarryTarget:
      case InteractActionType.selectAttackTarget:
      case InteractActionType.openTamingMenu:
      case InteractActionType.inscribeFloorSign:
      case InteractActionType.pickUpDustfleaEgg: {
         return getEntityRenderInfo(interactAction.interactEntity);
      }
      case InteractActionType.mountCarrySlot: {
         const transformComponent = TransformComponentArray.getComponent(interactAction.interactEntity);
         
         const renderInfo = new EntityRenderInfo(0, 0, 0, 1);

         const rideableComponent = RideableComponentArray.getComponent(interactAction.interactEntity);
         const carrySlot = rideableComponent.carrySlots[interactAction.carrySlotIdx];

         const carryingHitbox = transformComponent.hitboxMap.get(carrySlot.hitboxLocalID);
         assert(typeof carryingHitbox !== "undefined");

         // @HACK
         const box = new CircularBox(carryingHitbox.box.position.copy(), new Point(0, 0), carryingHitbox.box.angle, 0);
         const hitbox = createHitboxQuick(0, 0, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);

         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/miscellaneous/carry-slot.png")
         );
         renderPart.offset.x = carrySlot.offsetX;
         renderPart.offset.y = carrySlot.offsetY;
         renderInfo.attachRenderPart(renderPart);
         
         return renderInfo;
      }
      default: {
         const unreachable: never = interactAction;
         return unreachable;
      }
   }
}

export function updateHighlightedEntityRenderInfo(highlightedEntity: Entity | null): void {
   if (highlightedEntity === null) {
      highlightedRenderInfo = null;
   } else {
      const action = getEntityInteractAction(highlightedEntity);
      assert(action !== null);
      highlightedRenderInfo = createInteractRenderInfo(action);
   }
}

const interactWithEntity = (entity: Entity, action: InteractAction): void => {
   switch (action.type) {
      case InteractActionType.openBuildMenu: {
         entitySelectionState.setSelectedEntity(entity);
         buildMenuState.options = action.options;
         menuSelectorState.openMenu(Menu.buildMenu);
         break;
      }
      case InteractActionType.plantSeed: {
         sendModifyBuildingPacket(entity, action.plantedEntityType);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
         const hotbarUseInfo = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = currentSnapshot.tick;
         
         break;
      }
      case InteractActionType.useFertiliser: {
         sendModifyBuildingPacket(entity, -1);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
         const hotbarUseInfo = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = currentSnapshot.tick;

         break;
      }
      case InteractActionType.toggleTunnelDoor: {
         sendStructureInteractPacket(entity, action.doorSide);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
         const hotbarUseInfo = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = currentSnapshot.tick;
         
         break;
      }
      case InteractActionType.startResearching: {
         entitySelectionState.setSelectedEntity(entity);
         setActiveResearchBench(entity);
         sendStructureInteractPacket(entity, 0);
         break;
      }
      case InteractActionType.toggleDoor: {
         sendStructureInteractPacket(entity, 0);

         // @Hack
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
         const hotbarUseInfo = getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar);
         hotbarUseInfo.lastAttackTicks = currentSnapshot.tick;

         break;
      }
      case InteractActionType.openMenu: {
         entitySelectionState.setSelectedEntity(entity);
         menuSelectorState.openMenu(action.menu);

         if (menuIsInventory(action.menu)) {
            sendOpenEntityInventoryPacket(entity);
         }
         break;
      }
      case InteractActionType.openCraftingStation: {
         entitySelectionState.setSelectedEntity(entity);
         menuSelectorState.openMenu(Menu.craftingMenu);
         break;
      }
      case InteractActionType.openAnimalStaffMenu: {
         entitySelectionState.setSelectedEntity(entity);
         menuSelectorState.openMenu(Menu.animalStaffOptions);
         break;
      }
      case InteractActionType.mountCarrySlot: {
         sendMountCarrySlotPacket(entity, action.carrySlotIdx);
         break;
      }
      case InteractActionType.pickUpEntity: {
         sendPickUpEntityPacket(entity);
         break;
      }
      case InteractActionType.setCarryTarget: {
         // @Cleanup: should never be null
         if (entitySelectionState.selectedEntity !== null) {
            sendSetCarryTargetPacket(entitySelectionState.selectedEntity, entity);
            gameUIState.setGameInteractState(GameInteractState.none);
            createControlCommandParticles(AnimalStaffCommandType.carry);
         }
         break;
      }
      case InteractActionType.selectAttackTarget: {
         // @Hack: "!"
         const hoveredEntity = entitySelectionState.hoveredEntity!;
         sendSetAttackTargetPacket(entity, hoveredEntity);
         gameUIState.setGameInteractState(GameInteractState.none);
         createControlCommandParticles(AnimalStaffCommandType.attack);
         break;
      }
      case InteractActionType.openTamingMenu: {
         entitySelectionState.setSelectedEntity(entity);
         menuSelectorState.openMenu(Menu.tamingMenu);
         break;
      }
      case InteractActionType.inscribeFloorSign: {
         entitySelectionState.setSelectedEntity(entity);
         menuSelectorState.openMenu(Menu.signInscribeMenu);
         break;
      }
      case InteractActionType.pickUpDustfleaEgg: {
         break;
      }
      default: {
         const unreachable: never = action;
         return unreachable;
      }
   }
}

export function updateEntitySelections(): void {
   const layer = getCurrentLayer();
   
   const minChunkX = Math.max(Math.floor((cursorWorldPos.x - HIGHLIGHT_CURSOR_RANGE / cameraZoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((cursorWorldPos.x + HIGHLIGHT_CURSOR_RANGE / cameraZoom) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);
   const minChunkY = Math.max(Math.floor((cursorWorldPos.y - HIGHLIGHT_CURSOR_RANGE / cameraZoom) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((cursorWorldPos.y + HIGHLIGHT_CURSOR_RANGE / cameraZoom) / Settings.CHUNK_UNITS), Settings.WORLD_SIZE_CHUNKS - 1);

   let newHoveredEntity: Entity | null = null;
   let newHoveredEntityDist = HIGHLIGHT_CURSOR_RANGE;
   let newHighlightedEntity: Entity | null = null;
   let newHighlightedEntityDist = HIGHLIGHT_CURSOR_RANGE;
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const currentEntity of chunk.nonGrassEntities) {
            const distToCursor = getDistanceFromPointToEntity(cursorWorldPos, currentEntity);

            if (distToCursor < newHighlightedEntityDist) {
               const interactAction = getEntityInteractAction(currentEntity);
               if (interactAction !== null) {
                  const distToPlayer = getDistanceFromPointToEntity(cameraPosition, currentEntity);
                  if (distToPlayer < interactAction.interactRange) {
                     newHighlightedEntity = currentEntity;
                     newHighlightedEntityDist = distToCursor;
                  }
               }
            }
            if (distToCursor < newHoveredEntityDist) {
               newHoveredEntity = currentEntity;
               newHoveredEntityDist = distToCursor;
            }
         }
      }
   }
   
   entitySelectionState.setHoveredEntity(newHoveredEntity);

   entitySelectionState.setHighlightedEntity(playerIsPlacingEntity() ? null : newHighlightedEntity);

   // If the selected entity no-longer exists, like if it was destroyed or turned into something else, call the proper deselect function.
   if (entitySelectionState.selectedEntity !== null && !entityExists(entitySelectionState.selectedEntity)) {
      entitySelectionState.setSelectedEntity(null);
   }
   
   // @CLEANUP this logic is so convoluted
   // If the player isn't hovering on the selected entity's menu, deselect the selected entity when the player stops highlighting it.
   if (entitySelectionState.selectedEntity !== null) {
      // If the selected entity has a menu open, then that shouldn't close in the case that the cursor is too far away (but still should in case the player is too far away)
      // @HACK @Speed @Copynpaste
      const interactAction = getEntityInteractAction(entitySelectionState.selectedEntity);
      let isTooFarAwayFromPlayer = false;
      if (interactAction !== null) {
         const distToPlayer = getDistanceFromPointToEntity(cameraPosition, entitySelectionState.selectedEntity);
         if (distToPlayer >= interactAction.interactRange) {
            isTooFarAwayFromPlayer = true;
         }
      }

      if (newHighlightedEntity === null) {
         if ((menuSelectorState.hasOpenEmbodiedMenu() && !gameUIState.isHoveringOnMenu) || isTooFarAwayFromPlayer) {
            // EXCEPT when the game is in select carry target mode, we want the controlled entity to remain selected
            if (gameUIState.gameInteractState !== GameInteractState.selectCarryTarget && gameUIState.gameInteractState !== GameInteractState.selectAttackTarget && gameUIState.gameInteractState !== GameInteractState.selectMoveTargetPosition && gameUIState.gameInteractState !== GameInteractState.selectRiderDepositLocation) {
               // We do this by deselected the selected entity instead of the closeCurrentMenu function, as some selected entities such as the research bench don't have a menu and so it won't work for them.
               entitySelectionState.setSelectedEntity(null);
            }
         }
      // @INCOMPLETE don't work. cuz its going from opening animal staff options, to mounting carry slot. soo this needs something better.
      } else if (interactAction === null) {
         // The check for interactAction === null is for cases e.g. where the player switches from an animal staff with options menu opened to an empty slot.
         entitySelectionState.setSelectedEntity(null);
      }
   }
}

export function attemptEntitySelection(): boolean {
   const highlightedEntity = entitySelectionState.highlightedEntity;
   if (highlightedEntity === null) {
      return false;
   }
   
   const interactAction = getEntityInteractAction(highlightedEntity);
   assert(interactAction !== null);
   interactWithEntity(highlightedEntity, interactAction);
   return true;
}