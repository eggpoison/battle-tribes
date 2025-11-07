<script lang="ts">
   import { assert, type Entity, type Inventory, InventoryName } from "webgl-test-shared";
   import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import MenuElem from "../menus/MenuElem.svelte";
   import ItemSlotsContainer from "./ItemSlotsContainer.svelte";
    import InventoryItemSlots from "./InventoryItemSlots.svelte";

   interface Props {
      entity: Entity;
   }
  
   let { entity }: Props = $props();

   function getInven(): Inventory {
      const inventoryComponent = InventoryComponentArray.getComponent(entity);
      const inventory = getInventory(inventoryComponent, InventoryName.inventory);
      assert(inventory !== null);
      return inventory;
   }
   
   const inventory = getInven();
</script>

<MenuElem id="barrel-inventory" class="menu">
   <h2 class="menu-title">Barrel</h2>
   <div class="area">
      <label>
         <input type="checkbox" defaultChecked={true} />
         Allow friendly tribesmen
      </label>
      <label>
         <input type="checkbox" defaultChecked={false} />
         Allow enemies
      </label>
   </div>
   <div class="flex-container center">
      <ItemSlotsContainer isBordered>
         <InventoryItemSlots entity={entity} inventory={inventory} />
      </ItemSlotsContainer>
   </div>
</MenuElem>