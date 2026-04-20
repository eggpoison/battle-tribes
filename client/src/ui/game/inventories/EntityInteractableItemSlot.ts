<script lang="ts">
   import { type Entity, type Inventory, InventoryName, ItemType } from "webgl-test-shared";
   import { type ItemRestTime } from "../../../game/player-action-handling";
   import ItemSlot from "./ItemSlot.ts";
   import { MenuType, menuSelectorState } from "../../menus";
   import { InventoryComponentArray, getInventory } from "../../../game/entity-components/server-components/InventoryComponent";
   import { sendItemPickupPacket, sendItemReleasePacket, sendItemTransferPacket } from "../../../game/networking/packet-sending/packet-sending";
   import { playerInstance } from "../../../game/player";
   import { entitySelectionState } from "../../../ui-state/entity-selection-state";

   export interface ItemSlotCallbackInfo {
      readonly itemSlot: number;
      readonly itemType: ItemType | null;
   }

   export interface Props {
      readonly entity: Entity;
      readonly inventory: Inventory;
      readonly itemSlot: number;
      // readonly picturedItemImageSrc?: any;
      readonly isSelected?: boolean;
      readonly className?: string;
      /** Determines whether or not items can be added and removed freely. */
      readonly isManipulable?: boolean;
      readonly placeholderImg?: any;
      readonly restTime?: ItemRestTime;
      onmousedown?(e: MouseEvent): void;
      onmouseover?(e: MouseEvent): void;
      onmouseout?: () => void;
      onmousemove?: (e: MouseEvent) => void;
      onoontextmenu?: (e: MouseEvent) => void;
      /** If defined, determines whether or not a given item type is able to be put in the slot (doesn't affect taking out items) */
      validItemSpecifier?(itemType: ItemType): boolean;
   }

   let props: Props = $props();

   const item = $derived(props.inventory.getItem(props.itemSlot));

   const isManipulable = props.isManipulable === undefined || props.isManipulable;
   
   const inventoryIsFocused = (): boolean => {
      return menuSelectorState.hasOpenMenu();
   }
</script>

<ItemSlot
   {item}
   class="{props.className}{props.isSelected ? " selected" : ""}{item === null ? " empty" : ""}"
   {onmousedown}
   oncontextmenu={e => e.preventDefault()}
   {...props}
/>