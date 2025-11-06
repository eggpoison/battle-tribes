<script lang="ts">
   import { Inventory } from "webgl-test-shared";
   import ItemSlot from "./ItemSlot.svelte";

   const inventory = new Inventory(1, 1, 0);

   let props = $props();
</script>

<ItemSlot className={props.className} entityID={0} inventory={inventory} itemSlot={1} />