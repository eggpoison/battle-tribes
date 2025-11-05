<script lang="ts">
   import { Entity } from "webgl-test-shared/src/entities";
   import { getItemTypeImage } from "../../../game/client-item-info";
   import { BlueprintType } from "webgl-test-shared/src/components";
   import { GhostType } from "../../../game/rendering/webgl/entity-ghost-rendering";
   import { ItemType } from "webgl-test-shared/src/items/items";

   enum OptionType {
      placeBlueprint,
      modify,
      deconstruct
   }

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
      readonly costs: ReadonlyArray<OptionCost>;
      readonly blueprintType: BlueprintType | ((entity: Entity) => BlueprintType) | null;
      readonly isClickable?: (entity: Entity) => boolean;
      readonly isHighlighted?: (entity: Entity) => boolean;
      readonly deselectsOnClick: boolean;
   }

   let props: Props = $props();

   const isUnclickable = typeof props.isClickable !== "undefined" && !props.isClickable(props.entity);
</script>

<div class="option{props.isHovered ? " hovered" : ""}{isUnclickable ? " unclickable" : ""}" style={{"--x-proj": Math.cos(direction - Math.PI/2).toString(), "--y-proj": Math.sin(direction - Math.PI/2).toString()} as React.CSSProperties}>
   <div class="hover-div name">{props.name}</div>
   
   <img src={props.imageSource} alt="" style={{"--width": props.imageWidth.toString(), "--height": props.imageHeight.toString()} as React.CSSProperties} />

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