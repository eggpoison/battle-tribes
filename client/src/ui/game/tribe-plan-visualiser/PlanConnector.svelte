<script lang="ts">
   import { distance } from "webgl-test-shared";
   import { type AIPlan } from "../../../game/rendering/tribe-plan-visualiser/tribe-plan-visualiser";
   import { getPlanX, getPlanY } from "../../../ui-state/tribe-plan-visualiser-state.svelte";

   interface Props {
      readonly offsetX: number;
      readonly offsetY: number;
      readonly startPlan: AIPlan;
      readonly endPlan: AIPlan;
   }

   let props: Props = $props();

   const startX = getPlanX(props.startPlan, props.offsetX);
   const startY = getPlanY(props.startPlan, props.offsetY);
   const endX = getPlanX(props.endPlan, props.offsetX);
   const endY = getPlanY(props.endPlan, props.offsetY);
   
   const length = distance(startX, startY, endX, endY);
   const angle = Math.atan2(endY - startY, endX - startX);
</script>
   
<div style:width="{length}px" style:left="calc(50% + {startX}px)" style:top="calc(50% + {startY}px)" style:transform="rotate({angle}rad)" class="node-connector"></div>