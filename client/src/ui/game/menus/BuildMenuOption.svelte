<script lang="ts">
   import { ItemType, BlueprintType, type Entity } from "webgl-test-shared";
   import { getItemTypeImage } from "../../../game/client-item-info";
   import { GhostType } from "../../../game/rendering/webgl/entity-ghost-rendering";
   import { OptionType } from "../../../ui-state/build-menu-state.svelte";

   interface OptionCost {
      readonly itemType: ItemType;
      readonly amount: number;
   }

   interface Props {
      entity: Entity;
      isHovered: boolean;
      readonly name: string;
      readonly imageSource: string;
      readonly imageWidth: number;
      readonly imageHeight: number;
      /** The type of the ghost which gets shown when previewing this option */
      readonly ghostType: GhostType;
      readonly optionType: OptionType;
      readonly i: number;
      readonly numOptions: number;
      readonly costs: ReadonlyArray<OptionCost>;
      readonly blueprintType: BlueprintType | ((entity: Entity) => BlueprintType) | null;
      readonly isClickable?: (entity: Entity) => boolean;
      readonly isHighlighted?: (entity: Entity) => boolean;
      readonly deselectsOnClick: boolean;
   }

   let props: Props = $props();

   const isUnclickable = typeof props.isClickable !== "undefined" && !props.isClickable(props.entity);
   
   // + 0.5 so that the segments go between the options
   const direction = -(2 * Math.PI * (props.i + 0.5) / props.numOptions) + Math.PI/2;
</script>

<div
   class="option"
   class:hovered={props.isHovered}
   class:unclickable={isUnclickable}
   style:--x-proj="{Math.cos(direction - Math.PI/2)}"
   style:--y-proj="{Math.sin(direction - Math.PI/2)}"
>
   <div class="hover-div name">{props.name}</div>
   
   <img
      src={props.imageSource}
      alt=""
      style:--width="{props.imageWidth}"
      style:--height="{props.imageHeight}"
   />

   {#if props.costs.length > 0}
      <div class="hover-div cost">
         <p>COST</p>
         <ul>
            {#each props.costs as cost}
               <li><img src={getItemTypeImage(cost.itemType)} alt="" />x{cost.amount}</li>
            {/each}
         </ul>
      </div>
   {/if}
</div>
            
<div
   class="separator"
   style:--direction="{direction}"
   style:--x-proj="{Math.cos(direction - Math.PI/2)}"
   style:--y-proj="{Math.sin(direction - Math.PI/2)}"
></div>