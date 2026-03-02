<script lang="ts">
   import { type Snippet } from "svelte";
   import { preventDefault } from "../../ui-utils.svelte";
   import type { HTMLAttributes } from "svelte/elements";

   interface Props extends HTMLAttributes<HTMLDivElement> {
      children: Snippet<[]>;
   }
   
   let props: Props = $props();
</script>

<div class="menu{typeof props.class !== "undefined" ? " " + props.class : undefined}" {...props} oncontextmenu={preventDefault}>
   {@render props.children()}
</div>