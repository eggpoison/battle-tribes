import { BlueprintType, BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { EntityType, EntityTypeString } from "battletribes-shared/entities";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { deselectSelectedEntity, getSelectedEntityID } from "../../entity-selection";
import Camera from "../../Camera";
import Client from "../../client/Client";
import { GhostInfo, GhostType, PARTIAL_OPACITY, setGhostInfo } from "../../rendering/webgl/entity-ghost-rendering";
import { getItemTypeImage } from "../../client-item-info";
import Entity from "../../Entity";
import { countItemTypesInInventory } from "../../inventory-manipulation";
import { playSound } from "../../sound";
import Player from "../../entities/Player";
import Game from "../../Game";
import { InventoryName, ITEM_TYPE_RECORD, ItemType } from "battletribes-shared/items/items";
import { addMenuCloseFunction } from "../../menus";
import { InventoryComponentArray } from "../../entity-components/InventoryComponent";
import { getPlayerSelectedItem } from "./GameInteractableLayer";
import { getEntityByID } from "../../world";

/*
// @Incomplete
idea: no dynamic function properties
Option react elem: contains all the stuff except for separators
*/

export let BuildMenu_updateBuilding: (buildingID?: number) => void = () => {};
export let BuildMenu_hide: () => void = () => {};
export let BuildMenu_isOpen: () => boolean = () => false;
export let BuildMenu_setBuildingID: (buildingID: number) => void = () => {};
export let BuildMenu_refreshBuildingID: () => void = () => {};

let hoveredGhostType: GhostType | null = null;
export function getHoveredBlueprintGhostType(): GhostType | null {
   return hoveredGhostType;
}

let isHovering = false;
export function isHoveringInBlueprintMenu(): boolean {
   return isHovering;
}

enum OptionType {
   placeBlueprint,
   modify,
   deconstruct
}

interface OptionCost {
   readonly itemType: ItemType;
   readonly amount: number;
}

// @Cleanup: This whole system is fucked

interface MenuOption {
   readonly name: string;
   readonly imageSource: string;
   readonly imageWidth: number;
   readonly imageHeight: number;
   /** The type of the ghost which gets shown when previewing this option */
   readonly ghostType: GhostType;
   readonly optionType: OptionType;
   readonly costs: ReadonlyArray<OptionCost>;
   readonly blueprintType: BlueprintType | ((entity: Entity) => BlueprintType) | null;
   readonly isClickable?: (entity: Entity) => boolean;
   readonly isHighlighted?: (entity: Entity) => boolean;
   readonly deselectsOnClick: boolean;
}

const EMBRASURE_IMAGE_SOURCES = [require("../../images/entities/embrasure/wooden-embrasure.png"), ];
const DOOR_IMAGE_SOURCES = [require("../../images/entities/door/wooden-door.png"), ];
const TUNNEL_IMAGE_SOURCES = [require("../../images/entities/tunnel/wooden-tunnel.png"), ];
const WARRIOR_HUT_IMAGE_SOURCE = require("../../images/entities/warrior-hut/warrior-hut.png");

const EMBRASURE_GHOST_TYPES = [GhostType.woodenEmbrasure, GhostType.stoneEmbrasure];
const DOOR_GHOST_TYPES = [GhostType.woodenDoor, GhostType.stoneDoor];
const TUNNEL_GHOST_TYPES = [GhostType.woodenTunnel, GhostType.stoneTunnel];

const EMBRASURE_BLUEPRINT_TYPES = [BlueprintType.woodenEmbrasure, BlueprintType.stoneEmbrasure];
const DOOR_BLUEPRINT_TYPES = [BlueprintType.woodenDoor, BlueprintType.stoneDoor];
const TUNNEL_BLUEPRINT_TYPES = [BlueprintType.woodenTunnel, BlueprintType.stoneTunnel];

type UpgradeableEntityType = EntityType.wall | EntityType.tunnel | EntityType.door | EntityType.embrasure | EntityType.floorSpikes | EntityType.wallSpikes;
const MATERIAL_UPGRADE_IMAGE_SOURCES: Record<UpgradeableEntityType, any> = {
   [EntityType.wall]: require("../../images/entities/wall/stone-wall.png"),
   [EntityType.tunnel]: require("../../images/entities/tunnel/stone-tunnel.png"),
   [EntityType.door]: require("../../images/entities/door/stone-door.png"),
   [EntityType.embrasure]: require("../../images/entities/embrasure/stone-embrasure.png"),
   [EntityType.floorSpikes]: require("../../images/entities/spikes/stone-floor-spikes.png"),
   [EntityType.wallSpikes]: require("../../images/entities/spikes/stone-wall-spikes.png")
};
const MATERIAL_UPGRADE_IMAGE_SIZES: Record<UpgradeableEntityType, [width: number, height: number]> = {
   [EntityType.wall]: [64, 64],
   [EntityType.tunnel]: [64, 64],
   [EntityType.door]: [64, 24],
   [EntityType.embrasure]: [64, 20],
   [EntityType.floorSpikes]: [56, 56],
   [EntityType.wallSpikes]: [68, 28]
};
const MATERIAL_UPGRADE_GHOST_TYPES: Record<UpgradeableEntityType, GhostType> = {
   [EntityType.wall]: GhostType.stoneWall,
   [EntityType.tunnel]: GhostType.stoneTunnelUpgrade,
   [EntityType.door]: GhostType.stoneDoorUpgrade,
   [EntityType.embrasure]: GhostType.stoneEmbrasureUpgrade,
   [EntityType.floorSpikes]: GhostType.stoneFloorSpikes,
   [EntityType.wallSpikes]: GhostType.stoneWallSpikes,
};
const MATERIAL_UPGRADE_BLUEPRINT_TYPES: Record<UpgradeableEntityType, BlueprintType> = {
   [EntityType.wall]: BlueprintType.stoneWall,
   [EntityType.tunnel]: BlueprintType.stoneTunnelUpgrade,
   [EntityType.door]: BlueprintType.stoneDoorUpgrade,
   [EntityType.embrasure]: BlueprintType.stoneEmbrasureUpgrade,
   [EntityType.floorSpikes]: BlueprintType.stoneFloorSpikes,
   [EntityType.wallSpikes]: BlueprintType.stoneWallSpikes
};

const playerIsHoldingHammer = (): boolean => {
   const heldItem = getPlayerSelectedItem();
   return heldItem !== null && ITEM_TYPE_RECORD[heldItem.type] === "hammer";
}

const getMenuOptions = (entity: Entity): ReadonlyArray<MenuOption> => {
   if (!entity.hasServerComponent(ServerComponentType.structure) || !entity.hasServerComponent(ServerComponentType.tribe)) {
      return [];
   }
   
   // Enemy buildings can't be selected
   const tribeComponent = entity.getServerComponent(ServerComponentType.tribe);
   if (tribeComponent.tribeID !== Game.tribe.id) {
      return [];
   }

   // Buildings with active blueprints can't access the build menu
   const structureComponent = entity.getServerComponent(ServerComponentType.structure);
   if (structureComponent.hasActiveBlueprint) {
      return [];
   }
   
   const options = new Array<MenuOption>();

   // Material upgrade option
   if (playerIsHoldingHammer() && entity.hasServerComponent(ServerComponentType.buildingMaterial)) {
      const wallComponent = entity.getServerComponent(ServerComponentType.buildingMaterial);
      if (wallComponent.material < BuildingMaterial.stone) {
         const imageSource = MATERIAL_UPGRADE_IMAGE_SOURCES[entity.type as UpgradeableEntityType];
         const ghostType = MATERIAL_UPGRADE_GHOST_TYPES[entity.type as UpgradeableEntityType];
         const imageSize = MATERIAL_UPGRADE_IMAGE_SIZES[entity.type as UpgradeableEntityType];
         const blueprintType = MATERIAL_UPGRADE_BLUEPRINT_TYPES[entity.type as UpgradeableEntityType];
         
         options.push({
            name: "UPGRADE",
            imageSource: imageSource,
            imageWidth: imageSize[0],
            imageHeight: imageSize[1],
            ghostType: ghostType,
            optionType: OptionType.placeBlueprint,
            blueprintType: blueprintType,
            costs: [{
               itemType: ItemType.rock,
               amount: 5
            }],
            deselectsOnClick: true
         });
      }
   }

   // Wall shaping options
   if (playerIsHoldingHammer() && entity.type === EntityType.wall) {
      const wallComponent = entity.getServerComponent(ServerComponentType.buildingMaterial);

      options.push({
         name: "DOOR",
         imageSource: DOOR_IMAGE_SOURCES[wallComponent.material],
         imageWidth: 64,
         imageHeight: 24,
         ghostType: DOOR_GHOST_TYPES[wallComponent.material],
         optionType: OptionType.placeBlueprint,
         blueprintType: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return DOOR_BLUEPRINT_TYPES[wallComponent.material];
         },
         costs: [],
         deselectsOnClick: true
      });
      options.push({
         name: "EMBRASURE",
         imageSource: EMBRASURE_IMAGE_SOURCES[wallComponent.material],
         imageWidth: 64,
         imageHeight: 20,
         ghostType: EMBRASURE_GHOST_TYPES[wallComponent.material],
         optionType: OptionType.placeBlueprint,
         blueprintType: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return EMBRASURE_BLUEPRINT_TYPES[wallComponent.material];
         },
         costs: [],
         deselectsOnClick: true
      });
      options.push({
         name: "TUNNEL",
         imageSource: TUNNEL_IMAGE_SOURCES[wallComponent.material],
         imageWidth: 64,
         imageHeight: 64,
         ghostType: TUNNEL_GHOST_TYPES[wallComponent.material],
         optionType: OptionType.placeBlueprint,
         blueprintType: (wall: Entity) => {
            const wallComponent = wall.getServerComponent(ServerComponentType.buildingMaterial);
            return TUNNEL_BLUEPRINT_TYPES[wallComponent.material];
         },
         costs: [],
         deselectsOnClick: true
      });
   }

   // Tunnel doors
   if (playerIsHoldingHammer() && entity.type === EntityType.tunnel) {
      options.push({
         name: "DOOR",
         imageSource: require("../../images/entities/tunnel/tunnel-door.png"),
         imageWidth: 48,
         imageHeight: 24,
         ghostType: GhostType.tunnelDoor,
         optionType: OptionType.modify,
         blueprintType: null,
         // @Incomplete: implement cost
         costs: [{
            itemType: ItemType.wood,
            amount: 2
         }],
         isClickable: (tunnel: Entity): boolean => {
            const tunnelComponent = tunnel.getServerComponent(ServerComponentType.tunnel);
            return tunnelComponent.doorBitset < 0b11;
         },
         deselectsOnClick: true
      });
   }

   // Spike cover option
   if (entity.type === EntityType.floorSpikes) {
     options.push({
         name: "COVER",
         imageSource: require("../../images/miscellaneous/cover-spikes.png"),
         imageWidth: 56,
         imageHeight: 56,
         ghostType: GhostType.coverLeaves,
         optionType: OptionType.modify,
         blueprintType: null,
         isClickable: (entity: Entity): boolean => {
            const spikesComponent = entity.getServerComponent(ServerComponentType.spikes);
            return !spikesComponent.isCovered;
         },
         costs: [{
            itemType: ItemType.leaf,
            amount: 5
         }],
         deselectsOnClick: true
      });
   }
   
   // Deconstruct option if holding a hammer
   if (playerIsHoldingHammer()) {
      options.push({
         name: "DECONSTRUCT",
         imageSource: require("../../images/miscellaneous/deconstruct.png"),
         imageWidth: 60,
         imageHeight: 60,
         ghostType: GhostType.deconstructMarker,
         optionType: OptionType.deconstruct,
         blueprintType: null,
         costs: [],
         deselectsOnClick: true
      });
   }

   // Hut options
   if (entity.type === EntityType.workerHut) {
      if (playerIsHoldingHammer()) {
         options.push({
            name: "WARRIOR HUT",
            imageSource: WARRIOR_HUT_IMAGE_SOURCE,
            imageWidth: 104,
            imageHeight: 104,
            ghostType: GhostType.warriorHut,
            optionType: OptionType.placeBlueprint,
            costs: [
               {
                  itemType: ItemType.rock,
                  amount: 25
               },
               {
                  itemType: ItemType.wood,
                  amount: 15
               }
            ],
            blueprintType: BlueprintType.warriorHutUpgrade,
            deselectsOnClick: true
         });
      }

      options.push({
         name: "RECALL",
         imageSource: require("../../images/miscellaneous/recall.png"),
         imageWidth: 52,
         imageHeight: 60,
         ghostType: GhostType.recallMarker,
         optionType: OptionType.modify,
         blueprintType: null,
         costs: [],
         isHighlighted: (hut: Entity): boolean => {
            const hutComponent = hut.getServerComponent(ServerComponentType.hut);
            return hutComponent.isRecalling;
         },
         deselectsOnClick: false
      });
   }

   // Planter box options
   if (entity.type === EntityType.planterBox) {
      // @Incomplete
      options.push({
         name: "REMOVE PLANT",
         imageSource: require("../../images/miscellaneous/shovel.png"),
         imageWidth: 80,
         imageHeight: 80,
         ghostType: GhostType.recallMarker,
         optionType: OptionType.modify,
         blueprintType: null,
         costs: [],
         isClickable: (entity: Entity): boolean => {
            const planterBoxComponent = entity.getServerComponent(ServerComponentType.planterBox);
            return planterBoxComponent.hasPlant;
         },
         deselectsOnClick: true
      });
   }

   // Fence gate option
   if (playerIsHoldingHammer() && entity.type === EntityType.fence) {
      options.push({
         name: "FENCE GATE",
         imageSource: require("../../images/miscellaneous/full-fence-gate.png"),
         imageWidth: 80,
         imageHeight: 24,
         ghostType: GhostType.fenceGate,
         optionType: OptionType.placeBlueprint,
         blueprintType: BlueprintType.fenceGate,
         costs: [{
            itemType: ItemType.wood,
            amount: 5
         }],
         deselectsOnClick: true
      });
   }

   return options;
}

export function entityCanOpenBuildMenu(entity: Entity): boolean {
   const menuOptions = getMenuOptions(entity);
   return menuOptions.length > 0;
}

// @Cleanup: copy paste of shared function
const snapRotationToPlayer = (structure: Entity, rotation: number): number => {
   const playerTransformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);
   const entityTransformComponent = structure.getServerComponent(ServerComponentType.transform);

   const playerDirection = playerTransformComponent.position.calculateAngleBetween(entityTransformComponent.position);
   let snapRotation = playerDirection - rotation;

   // Snap to nearest PI/2 interval
   snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

   snapRotation += rotation;
   return snapRotation;
}

const getGhostRotation = (building: Entity, ghostType: GhostType): number => {
   const buildingTransformComponent = building.getServerComponent(ServerComponentType.transform);
   switch (ghostType) {
      case GhostType.tunnelDoor: {
         const tunnelComponent = building.getServerComponent(ServerComponentType.tunnel);
         switch (tunnelComponent.doorBitset) {
            case 0b00: {
               const playerTransformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);

               // Show the door closest to the player
               const dirToPlayer = buildingTransformComponent.position.calculateAngleBetween(playerTransformComponent.position);
               const dot = Math.sin(buildingTransformComponent.rotation) * Math.sin(dirToPlayer) + Math.cos(buildingTransformComponent.rotation) * Math.cos(dirToPlayer);

               return dot > 0 ? buildingTransformComponent.rotation : buildingTransformComponent.rotation + Math.PI;
            }
            case 0b01: {
               // Show bottom door
               return buildingTransformComponent.rotation + Math.PI;
            }
            case 0b10: {
               // Show top door
               return buildingTransformComponent.rotation;
            }
            default: {
               throw new Error("Unknown door bitset " + tunnelComponent.doorBitset);
            }
         }
      }
      case GhostType.stoneDoorUpgrade:
      case GhostType.stoneEmbrasureUpgrade:
      case GhostType.stoneTunnelUpgrade:
      case GhostType.stoneFloorSpikes:
      case GhostType.stoneWallSpikes:
      case GhostType.coverLeaves:
      case GhostType.warriorHut: {
         return buildingTransformComponent.rotation;
      }
      default: {
         return snapRotationToPlayer(building, buildingTransformComponent.rotation);
      }
   }
}

const BuildMenu = () => {
   const [x, setX] = useState(0);
   const [y, setY] = useState(0);
   const [buildingID, setBuildingID] = useState<number>(0);
   const [hoveredOptionIdx, setHoveredOptionIdx] = useState<number | null>(null);
   const blueprintRef = useRef<HTMLDivElement | null>(null);
   const [, forcedUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      BuildMenu_setBuildingID = (buildingID: number): void => {
         setBuildingID(buildingID);
      }
   }, []);

   useEffect(() => {
      // Clear blueprint ghost type when the build menu is closed
      const building = getEntityByID(buildingID);
      if (typeof building === "undefined") {
         setGhostInfo(null);
         return;
      }
      addMenuCloseFunction(() => {
         setBuildingID(0);

         // Deselect structure
         deselectSelectedEntity();
      });
      
      BuildMenu_isOpen = () => typeof getEntityByID(buildingID) !== "undefined";

      BuildMenu_hide = (): void => {
         setBuildingID(0);
      }

      BuildMenu_updateBuilding = (id?: number): void => {
         const building = getEntityByID(typeof id !== "undefined" ? id : buildingID);
         if (typeof building === "undefined") {
            return;
         }

         const transformComponent = building.getServerComponent(ServerComponentType.transform);

         const screenX = Camera.calculateXScreenPos(transformComponent.position.x);
         const screenY = Camera.calculateYScreenPos(transformComponent.position.y);
         setX(screenX);
         setY(screenY);
      }

      BuildMenu_refreshBuildingID = (): void => {
         if (buildingID !== 0 && typeof getEntityByID(buildingID) === "undefined") {
            setBuildingID(0);
         }

         // @Hack
         forcedUpdate();
      }
   }, [buildingID]);

   // Blueprint ghost type
   useEffect(() => {
      if (hoveredOptionIdx === null) {
         setGhostInfo(null);
         return;
      }
      
      const option = options[hoveredOptionIdx];

      const building = getEntityByID(buildingID);
      if (typeof building === "undefined") {
         setGhostInfo(null);
         return;
      }

      const transformComponent = building.getServerComponent(ServerComponentType.transform);

      const ghostInfo: GhostInfo = {
         position: transformComponent.position.copy(),
         rotation: getGhostRotation(building, option.ghostType),
         ghostType: option.ghostType,
         tint: [1, 1, 1],
         opacity: hoveredGhostType === GhostType.deconstructMarker ? 0.8 : PARTIAL_OPACITY
      };
      setGhostInfo(ghostInfo);
   }, [hoveredOptionIdx]);
   
   const setHoveredGhostType = (ghostType: GhostType): void => {
      hoveredGhostType = ghostType;
   }

   const clearHoveredGhostType = (): void => {
      hoveredGhostType = null;
   }

   const click = useCallback((building: Entity, options: ReadonlyArray<MenuOption>): void => {
      if (hoveredOptionIdx === null || building === null) {
         return;
      }

      // @Speed
      const selectOption = (option: MenuOption): void => {
         const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
         const hotbar = inventoryComponent.getInventory(InventoryName.hotbar)!;
         const backpack = inventoryComponent.getInventory(InventoryName.backpack);
         
         for (let i = 0; i < option.costs.length; i++) {
            const cost = option.costs[i];

            let count = countItemTypesInInventory(hotbar, cost.itemType);
            if (backpack !== null) {
               count += countItemTypesInInventory(backpack, cost.itemType);
            }
   
            if (count < cost.amount) {
               const playerTransformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);
               playSound("error.mp3", 0.4, 1, playerTransformComponent.position);
               return;
            }
         }
   
         const selectedStructureID = getSelectedEntityID();
         switch (option.optionType) {
            case OptionType.placeBlueprint: {
               let blueprintType: BlueprintType;
               if (option.blueprintType === null) {
                  throw new Error();
               } else if (typeof option.blueprintType === "number") {
                  blueprintType = option.blueprintType;
               } else {
                  blueprintType = option.blueprintType(building!);
               }
               
               Client.sendPlaceBlueprint(selectedStructureID, blueprintType);
               break;
            }
            case OptionType.modify: {
               Client.sendModifyBuilding(selectedStructureID, 0);
               break;
            }
            case OptionType.deconstruct: {
               Client.sendDeconstructBuilding(selectedStructureID);
               break;
            }
         }
   
         if (option.deselectsOnClick) {
            deselectSelectedEntity();
         }
      }

      const option = options[hoveredOptionIdx];
      const isClickable = typeof option.isClickable === "undefined" || option.isClickable(building);
      if (isClickable) {
         selectOption(option);
      }
   }, [hoveredOptionIdx]);

   const building = getEntityByID(buildingID);
   if (typeof building === "undefined") {
      return null;
   }

   const options = getMenuOptions(building);

   if (options.length === 0) {
      console.warn("0 options for entity type " + EntityTypeString[building.type]);
      return null;
   }

   const separators = new Array<JSX.Element>();
   if (options.length > 1) {
      for (let i = 0; i < options.length; i++) {
         // + 0.5 so that the segments go between the options
         let direction = 2 * Math.PI * (i + 0.5) / options.length;
         direction = -direction + Math.PI/2;
         
         separators.push(
            <div key={i} className="separator" style={{"--direction": direction.toString(), "--x-proj": Math.cos(direction - Math.PI/2).toString(), "--y-proj": Math.sin(direction - Math.PI/2).toString()} as React.CSSProperties}></div>
         );
      }
   }

   const segments = new Array<JSX.Element>();
   const segmentCoverage = 2 * Math.PI / options.length * (180 / Math.PI);
   for (let i = 0; i < options.length; i++) {
      const option = options[i];

      const direction = 2 * Math.PI * i / options.length;

      const isHighlighted = typeof option.isHighlighted !== "undefined" && option.isHighlighted(building);

      segments.push(
         <div key={i} className={`segment${i === hoveredOptionIdx ? " hovered" : ""}${isHighlighted ? " highlighted" : ""}`} style={{"--direction": (direction).toString(), "--coverage": segmentCoverage.toString()} as React.CSSProperties}></div>
      );
   }

   const optionElements = new Array<JSX.Element>();
   for (let i = 0; i < options.length; i++) {
      const option = options[i];

      const isUnclickable = typeof option.isClickable !== "undefined" && !option.isClickable(building);

      let direction = 2 * Math.PI * i / options.length;
      direction = -direction + Math.PI/2;

      optionElements.push(
         <div key={i} className={`option${i === hoveredOptionIdx ? " hovered" : ""}${isUnclickable ? " unclickable" : ""}`} style={{"--x-proj": Math.cos(direction - Math.PI/2).toString(), "--y-proj": Math.sin(direction - Math.PI/2).toString()} as React.CSSProperties}>
            <div className="hover-div name">{option.name}</div>
            
            <img src={option.imageSource} alt="" style={{"--width": option.imageWidth.toString(), "--height": option.imageHeight.toString()} as React.CSSProperties} />

            {option.costs.length > 0 ? (
               <div className="hover-div cost">
                  <p>COST</p>
                  <ul>
                     {option.costs.map((cost, i) => {
                        return <li key={i}><img src={getItemTypeImage(cost.itemType)} alt="" />x{cost.amount}</li>
                     })}
                  </ul>
               </div>
            ) : undefined}
         </div>
      );
   }

   // @Temporary?
   // const hotkeyLabels = new Array<JSX.Element>();
   // for (let i = 0; i < numOptions; i++) {
   //    const optionIdx = availableOptionIndexes[i];
   //    const option = options[optionIdx];
   //    if (typeof option.requirement !== "undefined" && !option.requirement(building)) {
   //       continue;
   //    }

   //    let direction = 2 * Math.PI * i / numOptions;
   //    direction = -direction;

   //    hotkeyLabels.push(
   //       <div key={i} className="hotkey-label" style={{"--x-proj": Math.cos(direction).toString(), "--y-proj": Math.sin(direction).toString()} as React.CSSProperties}>
   //          {i + 1}
   //       </div>
   //    );
   // }

   const getOptionIdx = (e: MouseEvent): number | null => {
      const menuElement = blueprintRef.current;
      if (menuElement === null) {
         return null;
      }

      const rect = menuElement.getBoundingClientRect();

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const diffX = e.clientX - centerX;
      const diffY = centerY - e.clientY;

      // Don't show an option if the mouse is too close to the center
      if (diffX * diffX + diffY * diffY < 120 * 120) {
         return null;
      }
      
      let angle = Math.atan2(diffY, diffX);
      angle += Math.PI / options.length;
      if (angle < 0) {
         angle += Math.PI * 2;
      }

      const segmentIdx = Math.floor(angle / (2 * Math.PI) * options.length);
      return segmentIdx;
   }

   const mouseMove = (e: MouseEvent) => {
      const optionIdx = getOptionIdx(e);
      setHoveredOptionIdx(optionIdx);

      if (optionIdx !== null) {
         const option = options[optionIdx];
         
         if (typeof option.isClickable === "undefined" || option.isClickable(building)) {
            setHoveredGhostType(option.ghostType);
         } else {
            clearHoveredGhostType();
         }
      } else {
         clearHoveredGhostType();
      }
   }

   return <div ref={blueprintRef} id="blueprint-menu" onMouseDown={() => click(building, options)} onMouseMove={e => mouseMove(e.nativeEvent)} onMouseEnter={() => {isHovering = true}} onMouseLeave={() => {isHovering = false; setHoveredOptionIdx(null); clearHoveredGhostType()}}  style={{"--x": x.toString(), "--y": y.toString()} as React.CSSProperties} onContextMenu={e => { e.preventDefault() }}>
      <div className="inner-ring"></div>
      {separators}
      {segments}
      {optionElements}
      {/* @Temporary? */}
      {/* {hotkeyLabels} */}
   </div>;
}

export default BuildMenu;