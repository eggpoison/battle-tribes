<script lang="ts">
   import { Inventory } from "webgl-test-shared/src/items/items";
   import ItemSlot from "./ItemSlot";

   const inventory = new Inventory(1, 1, 0);

   let props = $props();
</script>

<ItemSlot className={props.className} entityID={0} inventory={inventory} itemSlot={1} />