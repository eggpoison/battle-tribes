<script lang="ts">
   import { assert, InventoryName } from "webgl-test-shared";
   import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import MenuElem from "../menus/MenuElem.svelte";
   import InventoryContainer from "./InventoryContainer.svelte";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";

   // @Hack: "!"
   const barrel = entityInteractionState.selectedEntity!;
   const inventoryComponent = InventoryComponentArray.getComponent(barrel);

   const inventory = getInventory(inventoryComponent, InventoryName.inventory);
   assert(inventory !== null);
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
      <InventoryContainer entityID={barrel} inventory={inventory} />
   </div>
</MenuElem>