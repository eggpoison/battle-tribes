<script lang="ts">
   import { type AIPlan, type TribeAssignmentInfo } from "../../../game/rendering/tribe-plan-visualiser/tribe-plan-visualiser";
   import { assert } from "webgl-test-shared";
   import { type Entity } from "webgl-test-shared";
   import PlanNode from "./PlanNode.svelte";
   import { tribePlanVisualiserState } from "../../../ui-state/tribe-plan-visualiser-state.svelte";
   import { type ExtendedTribe } from "../../../game/tribes";
    import TribesmanAssignmentDropdown from "../dev/tabs/TribesmanAssignmentDropdown.svelte";

   interface Props {
      tribeAssignmentInfo: TribeAssignmentInfo;
      tribe: ExtendedTribe;
   }
   
   const ZOOM_FACTOR = 1.4;

   let props: Props = $props();
   const tribe = props.tribe;
   const tribeAssignmentInfo = props.tribeAssignmentInfo;

   const viewedEntity = tribePlanVisualiserState.entity;
   
   let isDragging = $state(false);
   let lastCursorX = $state(0);
   let lastCursorY = $state(0);
   let offsetX = $state(0);
   let offsetY = $state(0);
   let zoom = $state(1);

   const getAssignment = (tribeAssignmentInfo: TribeAssignmentInfo, selectedEntity: Entity | null): AIPlan => {
      if (selectedEntity === null) {
         return tribeAssignmentInfo.tribeAssignment;
      }

      const assignment = tribeAssignmentInfo.entityAssignments[selectedEntity];
      assert(typeof assignment !== "undefined");
      return assignment;
   }

   const onmousedown = (e: MouseEvent): void => {
      isDragging = true;
      lastCursorX = e.clientX;
      lastCursorY = e.clientY;
   }

   const onmouseup = (): void => {
      isDragging = false;
   }

   const onmousemove = (e: MouseEvent): void => {
      if (!isDragging) {
         return;
      }

      e.preventDefault();

      offsetX += (e.clientX - lastCursorX) / zoom;
      offsetY += (e.clientY - lastCursorY) / zoom;
      
      lastCursorX = e.clientX;
      lastCursorY = e.clientY;
   }

   const onwheel = (e: WheelEvent): void => {
      if (e.deltaY > 0) {
         zoom /= ZOOM_FACTOR;
      } else {
         zoom *= ZOOM_FACTOR;
      }
   }
   
   // @SQUEAM @InCOMPLETE
   // if (tribeAssignmentInfo === null || tribe === null) {
   //    return null;
   // }

   const assignment = getAssignment(tribeAssignmentInfo, viewedEntity);

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div id="tribe-plan-visualiser" {onwheel} {onmousedown} {onmouseup} {onmousemove}>
   <div style:transform="scale({zoom})">
      <PlanNode plan={assignment} offsetX={offsetX} offsetY={offsetY} />
   </div>

   <TribesmanAssignmentDropdown tribe={tribe} />
</div>