<script lang="ts">
   import { InventoryName, ITEM_TYPE_RECORD, ItemType, type Entity, EntityType, BlueprintType, BuildingMaterial } from "webgl-test-shared";
   import { GhostType } from "../../../game/rendering/webgl/entity-ghost-rendering";
   import { getItemTypeImage } from "../../../game/client-item-info";
   import { countItemTypesInInventory } from "../../../game/inventory-manipulation";
   import { playHeadSound } from "../../../game/sound";
   import { addMenuCloseFunction } from "../../../game/menus";
   import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import { getEntityType } from "../../../game/world";
   import { StructureComponentArray } from "../../../game/entity-components/server-components/StructureComponent";
   import { TribeComponentArray } from "../../../game/entity-components/server-components/TribeComponent";
   import { BuildingMaterialComponentArray } from "../../../game/entity-components/server-components/BuildingMaterialComponent";
   import { TunnelComponentArray } from "../../../game/entity-components/server-components/TunnelComponent";
   import { SpikesComponentArray } from "../../../game/entity-components/server-components/SpikesComponent";
   import { HutComponentArray } from "../../../game/entity-components/server-components/HutComponent";
   import { PlanterBoxComponentArray } from "../../../game/entity-components/server-components/PlanterBoxComponent";
   import { TransformComponentArray } from "../../../game/entity-components/server-components/TransformComponent";
   import { sendDeconstructBuildingPacket, sendModifyBuildingPacket, sendPlaceBlueprintPacket } from "../../../game/networking/packet-sending";
   import { playerTribe } from "../../../game/tribes";
   import { playerInstance } from "../../../game/player";
   import { buildMenuState, OptionType } from "../../../ui-state/build-menu-state.svelte";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";
   import { getPlayerSelectedItem } from "../../../game/player-action-handler";
   import WoodenEmbrasureImage from "/src/images/entities/embrasure/wooden-embrasure.png";
   import WoodenDoorImage from "/src/images/entities/door/wooden-door.png";
   import WoodenTunnelImage from "/src/images/entities/door/wooden-door.png";
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

   interface OptionCost {
      readonly itemType: ItemType;
      readonly amount: number;
   }

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

   let hoveredGhostType: GhostType | null = null;
   export function getHoveredBlueprintGhostType(): GhostType | null {
      return hoveredGhostType;
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

   let menuElement: HTMLDivElement | undefined;

   const playerIsHoldingHammer = (): boolean => {
      const heldItem = getPlayerSelectedItem();
      return heldItem !== null && ITEM_TYPE_RECORD[heldItem.type] === "hammer";
   }

   const getMenuOptions = (entity: Entity): ReadonlyArray<MenuOption> => {
      // Enemy buildings can't be selected
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribeID !== playerTribe.id) {
         return [];
      }

      // Buildings with active blueprints can't access the build menu
      const structureComponent = StructureComponentArray.getComponent(entity);
      if (structureComponent.hasActiveBlueprint) {
         return [];
      }
      
      const options = new Array<MenuOption>();

      const entityType = getEntityType(entity);

      // Material upgrade option
      if (playerIsHoldingHammer() && buildingMaterialComponent !== null && buildingMaterialComponent.material < BuildingMaterial.stone) {
         const imageSource = MATERIAL_UPGRADE_IMAGE_SOURCES[entityType as UpgradeableEntityType];
         const ghostType = MATERIAL_UPGRADE_GHOST_TYPES[entityType as UpgradeableEntityType];
         const imageSize = MATERIAL_UPGRADE_IMAGE_SIZES[entityType as UpgradeableEntityType];
         const blueprintType = MATERIAL_UPGRADE_BLUEPRINT_TYPES[entityType as UpgradeableEntityType];
         
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

      // Wall shaping options
      if (playerIsHoldingHammer() && entityType === EntityType.wall) {
         const wallComponent = BuildingMaterialComponentArray.getComponent(entity);
         const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entity);
         options.push({
            name: "DOOR",
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
            name: "EMBRASURE",
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
            name: "TUNNEL",
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
      if (playerIsHoldingHammer() && entityType === EntityType.tunnel) {
         const tunnelComponent = TunnelComponentArray.getComponent(entity);
         options.push({
            name: "DOOR",
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
            name: "COVER",
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
      if (playerIsHoldingHammer()) {
         options.push({
            name: "DECONSTRUCT",
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

         const hutComponent = HutComponentArray.getComponent(entity);
         options.push({
            name: "RECALL",
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
            name: "REMOVE PLANT",
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
      if (playerIsHoldingHammer() && entityType === EntityType.fence) {
         options.push({
            name: "FENCE GATE",
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

   // @Cleanup: copy paste of shared function
   const snapAngleToPlayerAngle = (structure: Entity, rotation: number): number => {
      if (playerInstance === null) {
         return 0;
      }
      
      const playerTransformComponent = TransformComponentArray.getComponent(playerInstance);
      const playerHitbox = playerTransformComponent.hitboxes[0];
      
      const entityTransformComponent = TransformComponentArray.getComponent(structure);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const playerDirection = playerHitbox.box.position.angleTo(entityHitbox.box.position);
      let snapRotation = playerDirection - rotation;

      // Snap to nearest PI/2 interval
      snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

      snapRotation += rotation;
      return snapRotation;
   }

   const getGhostRotation = (building: Entity, ghostType: GhostType): number => {
      // @HACK
      const buildingTransformComponent = TransformComponentArray.getComponent(building);
      const buildingHitbox = buildingTransformComponent.hitboxes[0];
      
      switch (ghostType) {
         case GhostType.tunnelDoor: {
            const tunnelComponent = TunnelComponentArray.getComponent(building);

            switch (tunnelComponent.doorBitset) {
               case 0b00: {
                  if (playerInstance === null) {
                     return 0;
                  }
                  const playerTransformComponent = TransformComponentArray.getComponent(playerInstance);
                  const playerHitbox = playerTransformComponent.hitboxes[0];

                  // Show the door closest to the player
                  const dirToPlayer = buildingHitbox.box.position.angleTo(playerHitbox.box.position);
                  const dot = Math.sin(buildingHitbox.box.angle) * Math.sin(dirToPlayer) + Math.cos(buildingHitbox.box.angle) * Math.cos(dirToPlayer);

                  return dot > 0 ? buildingHitbox.box.angle : buildingHitbox.box.angle + Math.PI;
               }
               case 0b01: {
                  // Show bottom door
                  return buildingHitbox.box.angle + Math.PI;
               }
               case 0b10: {
                  // Show top door
                  return buildingHitbox.box.angle;
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
            return buildingHitbox.box.angle;
         }
         default: {
            return snapAngleToPlayerAngle(building, buildingHitbox.box.angle);
         }
      }
   }

   let hoveredOptionIdx = $state<number | null>(null);

   // @Hack: "!"
   const buildingID = entityInteractionState.selectedEntity!;

   $effect(() => {
      // @Incomplete
      // Clear blueprint ghost type when the build menu is closed
      // if (!entityExists(buildingID)) {
      //    // @Incomplete
      //    // setGhostInfo(null);
      //    return;
      // }

      addMenuCloseFunction(() => {
         buildMenuState.setEntity(0);

         // Deselect structure
         entityInteractionState.deselectSelectedEntity();
      });
   });

   // @INCOMPLETE
   // Blueprint ghost type
   // useEffect(() => {
   //    if (hoveredOptionIdx === null) {
   //       // @Incomplete
   //       // setGhostInfo(null);
   //       return;
   //    }
      
   //    const option = options[hoveredOptionIdx];

   //    const transformComponent = TransformComponentArray.getComponent(buildingID);
   //    if (transformComponent === null) {
   //       return;
   //    }
   //    const buildingHitbox = transformComponent.hitboxes[0];

   //    const ghostInfo: GhostInfo = {
   //       position: buildingHitbox.box.position.copy(),
   //       rotation: getGhostRotation(buildingID, option.ghostType),
   //       ghostType: option.ghostType,
   //       tint: [1, 1, 1],
   //       opacity: hoveredGhostType === GhostType.deconstructMarker ? 0.8 : PARTIAL_OPACITY
   //    };
   //    // @Incomplete
   //    // setGhostInfo(ghostInfo);
   // }, [hoveredOptionIdx]);
   
   const click = (building: Entity, options: ReadonlyArray<MenuOption>): void => {
      if (hoveredOptionIdx === null || building === null) {
         return;
      }

      // @Speed
      const selectOption = (option: MenuOption): void => {
         const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
         const hotbar = getInventory(inventoryComponent, InventoryName.hotbar)!;
         const backpack = getInventory(inventoryComponent, InventoryName.backpack);
         
         for (let i = 0; i < option.costs.length; i++) {
            const cost = option.costs[i];

            let count = countItemTypesInInventory(hotbar, cost.itemType);
            if (backpack !== null) {
               count += countItemTypesInInventory(backpack, cost.itemType);
            }
   
            if (count < cost.amount) {
               playHeadSound("error.mp3", 0.4, 1);
               return;
            }
         }
   
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
               
               sendPlaceBlueprintPacket(buildingID, blueprintType);
               break;
            }
            case OptionType.modify: {
               sendModifyBuildingPacket(buildingID, 0);
               break;
            }
            case OptionType.deconstruct: {
               sendDeconstructBuildingPacket(buildingID);
               break;
            }
         }
   
         if (option.deselectsOnClick) {
            entityInteractionState.deselectSelectedEntity();
         }
      }

      const option = options[hoveredOptionIdx];
      const isClickable = typeof option.isClickable === "undefined" || option.isClickable(building);
      if (isClickable) {
         selectOption(option);
      }
   }

   const options = getMenuOptions(buildingID);

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
      if (typeof menuElement === "undefined") {
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

   function onmousemove(e: MouseEvent) {
      const optionIdx = getOptionIdx(e);
      hoveredOptionIdx = optionIdx;
   }

   const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(buildingID);

   const segmentCoverage = 2 * Math.PI / options.length * (180 / Math.PI);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
 <!-- @SQUEAM: x, y -->
<div bind:this={menuElement} id="blueprint-menu" onmousedown={() => click(buildingID, options)} {onmousemove} onmouseleave={() => {hoveredOptionIdx = null}} style:--x="{0}" style:--y="{0}" oncontextmenu={e => e.preventDefault()}>
   <div class="inner-ring"></div>

   {#each options as _, i}
      <!-- + 0.5 so that the segments go between the options -->
      {@const _direction = 2 * Math.PI * (i + 0.5) / options.length}
      {@const direction = -_direction + Math.PI/2}
      
      <div class="separator" style:--direction="{direction}" style:--x-proj="{Math.cos(direction - Math.PI/2)}" style:--y-proj="{Math.sin(direction - Math.PI/2)}"></div>
   {/each}
   
   {#each options as option, i}
      {@const direction = 2 * Math.PI * i / options.length}
      {@const isHighlighted = typeof option.isHighlighted !== "undefined" && option.isHighlighted(buildingID)}

      <div class="segment" class:hovered={i === hoveredOptionIdx} class:highlighted={isHighlighted} style:--direction="{direction}" style:--coverage="{segmentCoverage}"></div>
   {/each}

   {#each options as option, i}
      {@const isUnclickable = typeof option.isClickable !== "undefined" && !option.isClickable(buildingID)}

      {@const _direction = 2 * Math.PI * i / options.length}
      {@const direction = -_direction + Math.PI/2}

      <div class="option" class:hovered={i === hoveredOptionIdx} class:unclickable={isUnclickable} style:--x-proj="{Math.cos(direction - Math.PI/2)}" style:--y-proj="{Math.sin(direction - Math.PI/2)}">
         <div class="hover-div name">{option.name}</div>
         
         <img src={option.imageSource} alt="" style:--width="{option.imageWidth}" style:--height="{option.imageHeight}" />

         {#if option.costs.length > 0}
            <div class="hover-div cost">
               <p>COST</p>
               <ul>
                  {#each option.costs as cost}
                     <li><img src={getItemTypeImage(cost.itemType)} alt="" />x{cost.amount}</li>
                  {/each}
               </ul>
            </div>
         {/if}
      </div>
   {/each}

   <!-- @Temporary? -->
   <!-- {hotkeyLabels} -->
</div>