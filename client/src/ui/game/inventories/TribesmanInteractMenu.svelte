<script lang="ts">
   import { InventoryName, itemTypeIsArmour, itemTypeIsBackpack } from "webgl-test-shared";
   import { TribeComponentArray } from "../../../game/entity-components/server-components/TribeComponent";
   import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import { getLimbByInventoryName, InventoryUseComponentArray } from "../../../game/entity-components/server-components/InventoryUseComponent";
   import { playerTribe } from "../../../game/tribes";
   import { playerInstance } from "../../../game/player";
   import TribesmanInfocard from "./TribesmanInfocard.svelte";
   import { entitySelectionState } from "../../../ui-state/entity-selection-state";
   import InventoryContainer from "./Inventory";
   import BackpackWireframeImage from "../../../images/miscellaneous/backpack-wireframe.png";
   import ArmourWireframeImage from "../../../images/miscellaneous/armour-wireframe.png";
   import ItemSlot from "./ItemSlot";

   // @Hack: "!"
   const tribesman = entitySelectionState.selectedEntity!;
   
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
   const tribeComponent = TribeComponentArray.getComponent(tribesman);

   const backpackSlotInventory = getInventory(inventoryComponent, InventoryName.backpackSlot)!;
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot)!;

   // @Copy and paste from hotbar

   const playerID = playerInstance || 0;
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div id="tribesman-inventory" class="menu" oncontextmenu={e => e.preventDefault()}>
   <div class="flex-container space-around">
      {#if backpackSlotInventory.itemSlots.hasOwnProperty(1)}
         <div>
            <InventoryContainer isBordered class="backapck" entityID={tribesman} inventory={getInventory(inventoryComponent, InventoryName.backpack)!} />
         </div>
      {/if}
      <div>
         <TribesmanInfocard tribesman={tribesman} />
      </div>
   </div>

   {#if tribeComponent.tribeID === playerTribe.id}
      <div class="hotbar-container">
         <InventoryContainer isBordered className="hotbar" entityID={tribesman} inventory={getInventory(inventoryComponent, InventoryName.hotbar)!} selectedItemSlot={getLimbByInventoryName(inventoryUseComponent, InventoryName.hotbar).selectedItemSlot} />
         <div class="inventory">
            <ItemSlot class="armour-slot" entityID={playerID} inventory={backpackSlotInventory} itemSlot={1} placeholderImg={BackpackWireframeImage} validItemSpecifier={itemTypeIsBackpack} />
            <ItemSlot class="backpack-slot" entityID={playerID} inventory={armourSlotInventory} itemSlot={1} placeholderImg={ArmourWireframeImage} validItemSpecifier={itemTypeIsArmour} />
         </div>
      </div>
   {/if}
</div>