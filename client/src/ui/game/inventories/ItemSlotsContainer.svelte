<script lang="ts">
   import { type Snippet } from "svelte";

   interface Props {
      [key: string]: any;
      children: Snippet<[]>;
      readonly className?: string;
      readonly isBordered?: boolean;
   }

   let props: Props = $props();
</script>

<div class="item-slots-container{typeof props.className !== "undefined" ? " " + props.className : ""}" class:bordered={props.isBordered}>
   {@render props.children?.()}
</div>