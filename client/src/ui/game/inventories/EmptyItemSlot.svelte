<script lang="ts">
   import ItemSlot from "./ItemSlot.svelte";

   interface Props {
      class?: string;
   }
   
   let { ...rest }: Props = $props();
</script>

<ItemSlot item={null} {...rest} />