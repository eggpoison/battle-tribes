<script lang="ts">
   import { type Inventory, InventoryName, ItemType } from "webgl-test-shared";
   import ItemSlot, { type ItemSlotCallbackInfo } from "./ItemSlot.svelte";
   import BackpackWireframe from "../../../images/miscellaneous/backpack-wireframe.png";
   import ArmourWireframe from "../../../images/miscellaneous/armour-wireframe.png";
   import GloveWireframe from "../../../images/miscellaneous/glove-wireframe.png";
   import { type ItemRestTime } from "../../../game/player-action-handler";

   interface Props {
      readonly entityID?: number;
      inventory: Inventory;
      y: number;
      itemSlotClassNameCallback?(callbackInfo: ItemSlotCallbackInfo): string | undefined;
      readonly selectedItemSlot?: number;
      readonly isManipulable?: boolean;
      readonly itemRestTime?: ItemRestTime;
      onMouseDown?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
      onMouseOver?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
      onMouseMove?: (e: MouseEvent) => void;
      onMouseOut?(): void;
   }

   let props: Props = $props();
   const inventory = props.inventory;
   const y = props.y;

   const xPositions = new Array<number>();
   for (let x = 0; x < inventory.width; x++) {
      xPositions.push(x);
   }

   const getItemSlotType = (inventory: Inventory | null, itemSlot: number): ItemType | null => {
      if (inventory === null) {
         return null;
      }

      const item = inventory.getItem(itemSlot);
      if (item === null) {
         return null;
      }
      return item.type;
   }

   const placeholderImg = (() => {
      switch (inventory.name) {
         case InventoryName.backpackSlot: {
            return BackpackWireframe;
         }
         case InventoryName.armourSlot: {
            return ArmourWireframe;
         }
         case InventoryName.gloveSlot: {
            return GloveWireframe;
         }
      }
   })();
</script>

<div class="inventory-row">
   {#each xPositions as x}
      {@const itemSlotIdx = y * inventory.width + x}
      {@const itemSlot = itemSlotIdx + 1}

      {@const callbackInfo: ItemSlotCallbackInfo = {
         itemType: getItemSlotType(inventory, itemSlot),
         itemSlot: itemSlot
      }}

      {@const leftClickFunc = inventory !== null && typeof props.onMouseDown !== "undefined" ? (e: MouseEvent) => props.onMouseDown!(e, callbackInfo) : undefined}

      {@const className = typeof props.itemSlotClassNameCallback !== "undefined" ? props.itemSlotClassNameCallback(callbackInfo) : undefined}

      {@const isSelected = typeof props.selectedItemSlot !== "undefined" && itemSlot === props.selectedItemSlot}
      <ItemSlot className={className} entityID={props.entityID} inventory={inventory} itemSlot={itemSlot} isManipulable={props.isManipulable} isSelected={isSelected} placeholderImg={placeholderImg} onMouseDown={leftClickFunc} onMouseOver={props.onMouseOver} onMouseOut={props.onMouseOut} onMouseMove={props.onMouseMove} />
   {/each}
</div>