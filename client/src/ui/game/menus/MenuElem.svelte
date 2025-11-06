<script lang="ts">
   import { type Snippet } from "svelte";
   import { preventDefault } from "../../ui-utils.svelte";

   interface Props {
      [key: string]: any;
      children: Snippet<[]>;
   }
   
   let props: Props = $props();
</script>

<div {...props} oncontextmenu={preventDefault}>
   {@render props.children()}
</div>