<script lang="ts">
   import { InventoryName, type Entity, BlueprintType, assert } from "webgl-test-shared";
   import { GhostType } from "../../../game/rendering/webgl/entity-ghost-rendering";
   import { getItemTypeImage } from "../../../game/client-item-info";
   import { countItemTypesInInventory } from "../../../game/inventory-manipulation";
   import { playHeadSound } from "../../../game/sound";
   import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import { TunnelComponentArray } from "../../../game/entity-components/server-components/TunnelComponent";
   import { TransformComponentArray } from "../../../game/entity-components/server-components/TransformComponent";
   import { sendDeconstructBuildingPacket, sendModifyBuildingPacket, sendPlaceBlueprintPacket } from "../../../game/networking/packet-sending";
   import { playerInstance } from "../../../game/player";
   import { type BuildMenuOption, buildMenuState, OptionType } from "../../../ui-state/build-menu-state.svelte";
   import { entitySelectionState } from "../../../ui-state/entity-selection-state.svelte";

   let hoveredGhostType: GhostType | null = null;
   export function getHoveredBlueprintGhostType(): GhostType | null {
      return hoveredGhostType;
   }

   let menuElement: HTMLDivElement | undefined;

   // const getSelectedEntity = (): Entity => {
   //    const entity = entitySelectionState.selectedEntity;
   //    assert(entity !== null);
   //    return entity;
   // }

   const entity = entitySelectionState.selectedEntity;
   assert(entity !== null);

   const options = buildMenuState.options;
   assert(options !== null);
   
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

   $effect(() => {
      // @Incomplete
      // Clear blueprint ghost type when the build menu is closed
      // if (!entityExists(buildingID)) {
      //    // @Incomplete
      //    // setGhostInfo(null);
      //    return;
      // }
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
   
   const click = (building: Entity, options: ReadonlyArray<BuildMenuOption>): void => {
      if (hoveredOptionIdx === null || building === null) {
         return;
      }

      // @Speed
      const selectOption = (option: BuildMenuOption): void => {
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
               
               sendPlaceBlueprintPacket(entity, blueprintType);
               break;
            }
            case OptionType.modify: {
               sendModifyBuildingPacket(entity, 0);
               break;
            }
            case OptionType.deconstruct: {
               sendDeconstructBuildingPacket(entity);
               break;
            }
         }
   
         if (option.deselectsOnClick) {
            entitySelectionState.setSelectedEntity(null);
         }
      }

      const option = options[hoveredOptionIdx];
      const isClickable = typeof option.isClickable === "undefined" || option.isClickable(building);
      if (isClickable) {
         selectOption(option);
      }
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
   //       <div key={i} class="hotkey-label" style={{"--x-proj": Math.cos(direction).toString(), "--y-proj": Math.sin(direction).toString()} as React.CSSProperties}>
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div bind:this={menuElement} id="blueprint-menu" onmousedown={() => click(entity, options)} {onmousemove} onmouseleave={() => {hoveredOptionIdx = null}} style:--x="{entitySelectionState.selectedEntityScreenPosX}" style:--y="{entitySelectionState.selectedEntityScreenPosY}" oncontextmenu={e => e.preventDefault()}>
   <div class="inner-ring"></div>

   {#each options as _, i}
      <!-- + 0.5 so that the segments go between the options -->
      {@const _direction = 2 * Math.PI * (i + 0.5) / options.length}
      {@const direction = -_direction + Math.PI/2}
      
      <div class="separator" style:--direction="{direction}" style:--x-proj="{Math.cos(direction - Math.PI/2)}" style:--y-proj="{Math.sin(direction - Math.PI/2)}"></div>
   {/each}
   
   {#each options as option, i}
      {@const direction = 2 * Math.PI * i / options.length}
      {@const isHighlighted = typeof option.isHighlighted !== "undefined" && option.isHighlighted(entity)}
      {@const segmentCoverage = 2 * Math.PI / options.length * (180 / Math.PI)}

      <div
         class="segment"
         class:hovered={i === hoveredOptionIdx}
         class:highlighted={isHighlighted}
         style:--direction="{direction}"
         style:--coverage="{segmentCoverage}"
      ></div>
   {/each}

   {#each options as option, i}
      {@const isUnclickable = typeof option.isClickable !== "undefined" && !option.isClickable(entity)}

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