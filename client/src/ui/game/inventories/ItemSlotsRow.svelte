<script lang="ts">
   import { type Snippet } from "svelte";

   interface Props {
      children: Snippet<[]>;
   }

   let props: Props = $props();
</script>

<div class="inventory-row">
   {@render props.children()}
</div>