import { Entity, BuildingMaterial, ItemType, EntityType, BlueprintType, ITEM_TYPE_RECORD } from "../../../shared/src";
import { BuildingMaterialComponentArray } from "../game/entity-components/server-components/BuildingMaterialComponent";
import { HutComponentArray } from "../game/entity-components/server-components/HutComponent";
import { PlanterBoxComponentArray } from "../game/entity-components/server-components/PlanterBoxComponent";
import { SpikesComponentArray } from "../game/entity-components/server-components/SpikesComponent";
import { StructureComponentArray } from "../game/entity-components/server-components/StructureComponent";
import { TribeComponentArray } from "../game/entity-components/server-components/TribeComponent";
import { TunnelComponentArray } from "../game/entity-components/server-components/TunnelComponent";
import { GhostType } from "../game/rendering/webgl/entity-ghost-rendering";
import { playerTribe } from "../game/tribes";
import { getEntityType } from "../game/world";
import WoodenEmbrasureImage from "/src/images/entities/embrasure/wooden-embrasure.png";
import WoodenDoorImage from "/src/images/entities/door/wooden-door.png";
import WoodenTunnelImage from "/src/images/entities/tunnel/wooden-tunnel.png";
import WarriorHutImage from "/src/images/entities/warrior-hut/warrior-hut.png";
import StoneWallImage from "/src/images/entities/wall/stone-wall.png";
import StoneTunnelImage from "/src/images/entities/tunnel/stone-tunnel.png";
import StoneDoorImage from "/src/images/entities/door/stone-door.png";
import StoneEmbrasureImage from "/src/images/entities/embrasure/stone-embrasure.png";
import StoneFloorSpikesImage from "/src/images/entities/spikes/stone-floor-spikes.png";
import StoneWallSpikesImage from "/src/images/entities/spikes/stone-wall-spikes.png";
import StoneVerticalPostImage from "/src/images/entities/spikes/stone-wall-spikes.png";
import TunnelDoorImage from "/src/images/entities/tunnel/tunnel-door.png";
import CoverSpikesIcon from "/src/images/miscellaneous/cover-spikes.png";
import DeconstructIcon from "/src/images/miscellaneous/deconstruct.png";
import RecallHutIcon from "/src/images/miscellaneous/recall.png";
import ShovelPlantIcon from "/src/images/miscellaneous/shovel.png";
import ConvertToFenceGateIcon from "/src/images/miscellaneous/full-fence-gate.png";
import { getPlayerSelectedItem } from "../game/player-action-handling";

export enum OptionType {
   placeBlueprint,
   modify,
   deconstruct
}

interface OptionCost {
   readonly itemType: ItemType;
   readonly amount: number;
}

export interface BuildMenuOption {
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


// @Cleanup: This whole system is fucked

const EMBRASURE_IMAGE_SOURCES = [WoodenEmbrasureImage, ];
const DOOR_IMAGE_SOURCES = [WoodenDoorImage, ];
const TUNNEL_IMAGE_SOURCES = [WoodenTunnelImage , ];
const WARRIOR_HUT_IMAGE_SOURCE = WarriorHutImage;

const EMBRASURE_GHOST_TYPES = [GhostType.woodenEmbrasure, GhostType.stoneEmbrasure];
const DOOR_GHOST_TYPES = [GhostType.woodenDoor, GhostType.stoneDoor];
const TUNNEL_GHOST_TYPES = [GhostType.woodenTunnel, GhostType.stoneTunnel];

const EMBRASURE_BLUEPRINT_TYPES = [BlueprintType.woodenEmbrasure, BlueprintType.stoneEmbrasure];
const DOOR_BLUEPRINT_TYPES = [BlueprintType.woodenDoor, BlueprintType.stoneDoor];
const TUNNEL_BLUEPRINT_TYPES = [BlueprintType.woodenTunnel, BlueprintType.stoneTunnel];

type UpgradeableEntityType = EntityType.wall | EntityType.tunnel | EntityType.door | EntityType.embrasure | EntityType.floorSpikes | EntityType.wallSpikes | EntityType.bracings;
const MATERIAL_UPGRADE_IMAGE_SOURCES: Record<UpgradeableEntityType, any> = {
   [EntityType.wall]: StoneWallImage,
   [EntityType.tunnel]: StoneTunnelImage,
   [EntityType.door]: StoneDoorImage,
   [EntityType.embrasure]: StoneEmbrasureImage,
   [EntityType.floorSpikes]: StoneFloorSpikesImage,
   [EntityType.wallSpikes]: StoneWallSpikesImage,
   [EntityType.bracings]: StoneVerticalPostImage
};
// @Hack: Hardcoded
const MATERIAL_UPGRADE_IMAGE_SIZES: Record<UpgradeableEntityType, [width: number, height: number]> = {
   [EntityType.wall]: [64, 64],
   [EntityType.tunnel]: [64, 64],
   [EntityType.door]: [64, 24],
   [EntityType.embrasure]: [64, 20],
   [EntityType.floorSpikes]: [56, 56],
   [EntityType.wallSpikes]: [68, 28],
   [EntityType.bracings]: [64, 64],
};
const MATERIAL_UPGRADE_GHOST_TYPES: Record<UpgradeableEntityType, GhostType> = {
   [EntityType.wall]: GhostType.stoneWall,
   [EntityType.tunnel]: GhostType.stoneTunnelUpgrade,
   [EntityType.door]: GhostType.stoneDoorUpgrade,
   [EntityType.embrasure]: GhostType.stoneEmbrasureUpgrade,
   [EntityType.floorSpikes]: GhostType.stoneFloorSpikes,
   [EntityType.wallSpikes]: GhostType.stoneWallSpikes,
   [EntityType.bracings]: GhostType.stoneBracings,
};
const MATERIAL_UPGRADE_BLUEPRINT_TYPES: Record<UpgradeableEntityType, BlueprintType> = {
   [EntityType.wall]: BlueprintType.stoneWall,
   [EntityType.tunnel]: BlueprintType.stoneTunnelUpgrade,
   [EntityType.door]: BlueprintType.stoneDoorUpgrade,
   [EntityType.embrasure]: BlueprintType.stoneEmbrasureUpgrade,
   [EntityType.floorSpikes]: BlueprintType.stoneFloorSpikes,
   [EntityType.wallSpikes]: BlueprintType.stoneWallSpikes,
   [EntityType.bracings]: BlueprintType.stoneBracings,
};

const playerIsHoldingHammer = (): boolean => {
   const heldItem = getPlayerSelectedItem();
   return heldItem !== null && ITEM_TYPE_RECORD[heldItem.type] === "hammer";
}

export function getBuildMenuOptions(entity: Entity): ReadonlyArray<BuildMenuOption> {
   // Enemy buildings can't be selected
   const tribeComponent = TribeComponentArray.tryGetComponent(entity);
   if (tribeComponent === null || tribeComponent.tribeID !== playerTribe.id) {
      return [];
   }

   // Buildings with active blueprints can't access the build menu
   const structureComponent = StructureComponentArray.tryGetComponent(entity);
   if (structureComponent === null || structureComponent.hasActiveBlueprint) {
      return [];
   }

   const buildingMaterialComponent = BuildingMaterialComponentArray.tryGetComponent(entity);
   
   const options = new Array<BuildMenuOption>();

   const entityType = getEntityType(entity);

   const isHoldingHammer = playerIsHoldingHammer();

   // Material upgrade option
   if (isHoldingHammer && buildingMaterialComponent !== null && buildingMaterialComponent.material < BuildingMaterial.stone) {
      const imageSource = MATERIAL_UPGRADE_IMAGE_SOURCES[entityType as UpgradeableEntityType];
      const ghostType = MATERIAL_UPGRADE_GHOST_TYPES[entityType as UpgradeableEntityType];
      const imageSize = MATERIAL_UPGRADE_IMAGE_SIZES[entityType as UpgradeableEntityType];
      const blueprintType = MATERIAL_UPGRADE_BLUEPRINT_TYPES[entityType as UpgradeableEntityType];
      
      options.push({
         name: "Upgrade",
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

   // Wall shaping options
   if (isHoldingHammer && entityType === EntityType.wall) {
      const wallComponent = BuildingMaterialComponentArray.getComponent(entity);
      const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entity);
      options.push({
         name: "Door",
         imageSource: DOOR_IMAGE_SOURCES[wallComponent.material],
         imageWidth: 64,
         imageHeight: 24,
         ghostType: DOOR_GHOST_TYPES[wallComponent.material],
         optionType: OptionType.placeBlueprint,
         blueprintType: () => {
            return DOOR_BLUEPRINT_TYPES[buildingMaterialComponent.material];
         },
         costs: [],
         deselectsOnClick: true
      });
      options.push({
         name: "Embrasure",
         imageSource: EMBRASURE_IMAGE_SOURCES[wallComponent.material],
         imageWidth: 64,
         imageHeight: 20,
         ghostType: EMBRASURE_GHOST_TYPES[wallComponent.material],
         optionType: OptionType.placeBlueprint,
         blueprintType: () => {
            return EMBRASURE_BLUEPRINT_TYPES[buildingMaterialComponent.material];
         },
         costs: [],
         deselectsOnClick: true
      });
      options.push({
         name: "Tunnel",
         imageSource: TUNNEL_IMAGE_SOURCES[wallComponent.material],
         imageWidth: 64,
         imageHeight: 64,
         ghostType: TUNNEL_GHOST_TYPES[wallComponent.material],
         optionType: OptionType.placeBlueprint,
         blueprintType: () => {
            return TUNNEL_BLUEPRINT_TYPES[buildingMaterialComponent.material];
         },
         costs: [],
         deselectsOnClick: true
      });
   }

   // Tunnel doors
   if (isHoldingHammer && entityType === EntityType.tunnel) {
      const tunnelComponent = TunnelComponentArray.getComponent(entity);
      options.push({
         name: "Door",
         imageSource: TunnelDoorImage,
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
            return tunnelComponent.doorBitset < 0b11;
         },
         deselectsOnClick: true
      });
   }

   // Spike cover option
   if (entityType === EntityType.floorSpikes) {
      const spikesComponent = SpikesComponentArray.getComponent(entity);
      options.push({
         name: "Cover",
         imageSource: CoverSpikesIcon,
         imageWidth: 56,
         imageHeight: 56,
         ghostType: GhostType.coverLeaves,
         optionType: OptionType.modify,
         blueprintType: null,
         isClickable: (): boolean => {
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
   if (isHoldingHammer) {
      options.push({
         name: "Deconstruct",
         imageSource: DeconstructIcon,
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
   if (entityType === EntityType.workerHut) {
      if (playerIsHoldingHammer()) {
         options.push({
            name: "Warrior Hut",
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

      const hutComponent = HutComponentArray.getComponent(entity);
      options.push({
         name: "Recall",
         imageSource: RecallHutIcon,
         imageWidth: 52,
         imageHeight: 60,
         ghostType: GhostType.recallMarker,
         optionType: OptionType.modify,
         blueprintType: null,
         costs: [],
         isHighlighted: (): boolean => {
            return hutComponent.isRecalling;
         },
         deselectsOnClick: false
      });
   }

   // Planter box options
   if (entityType === EntityType.planterBox) {
      const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
      // @Incomplete
      options.push({
         name: "Remove plant",
         imageSource: ShovelPlantIcon,
         imageWidth: 80,
         imageHeight: 80,
         ghostType: GhostType.recallMarker,
         optionType: OptionType.modify,
         blueprintType: null,
         costs: [],
         isClickable: (): boolean => {
            return planterBoxComponent.hasPlant;
         },
         deselectsOnClick: true
      });
   }

   // Fence gate option
   if (isHoldingHammer && entityType === EntityType.fence) {
      options.push({
         name: "Fencegate",
         imageSource: ConvertToFenceGateIcon,
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

export const buildMenuState = {
   options: [] as ReadonlyArray<BuildMenuOption>
};