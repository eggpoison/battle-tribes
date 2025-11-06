<script lang="ts">
   import { type AIPlan, type TribeAssignmentInfo } from "../../../game/rendering/tribe-plan-visualiser/tribe-plan-visualiser";
   import { assert } from "webgl-test-shared";
   import { type Entity } from "webgl-test-shared";
    import PlanNode from "./PlanNode.svelte";

   const ZOOM_FACTOR = 1.4

   const getAssignment = (tribeAssignmentInfo: TribeAssignmentInfo, selectedEntity: Entity | null): AIPlan => {
      if (selectedEntity === null) {
         return tribeAssignmentInfo.tribeAssignment;
      }

      const assignment = tribeAssignmentInfo.entityAssignments[selectedEntity];
      assert(typeof assignment !== "undefined");
      return assignment;
   }

   const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
   
   const [isDragging, setIsDragging] = useState(false);
   const [lastCursorX, setLastCursorX] = useState(0);
   const [lastCursorY, setLastCursorY] = useState(0);
   const [offsetX, setOffsetX] = useState(0);
   const [offsetY, setOffsetY] = useState(0);
   const [zoom, setZoom] = useState(1);

   const onmousedown = (e: MouseEvent): void => {
      setIsDragging(true);
      setLastCursorX(e.clientX);
      setLastCursorY(e.clientY);
   }

   const onmouseup = (): void => {
      setIsDragging(false);
   }

   const onmousemove = (e: MouseEvent): void => {
      if (!isDragging) {
         return;
      }

      e.preventDefault();

      setOffsetX(offsetX + (e.clientX - lastCursorX) / zoom);
      setOffsetY(offsetY + (e.clientY - lastCursorY) / zoom);
      
      setLastCursorX(e.clientX);
      setLastCursorY(e.clientY);
   }

   const onwheel = (e: WheelEvent): void => {
      if (e.deltaY > 0) {
         setZoom(zoom / ZOOM_FACTOR);
      } else {
         setZoom(zoom * ZOOM_FACTOR);
      }
   }

   const onSelectEntity = (entity: Entity | null): void => {
      setSelectedEntity(entity);
   }
   
   // @SQUEAM @InCOMPLETE
   // if (tribeAssignmentInfo === null || tribe === null) {
   //    return null;
   // }

   const assignment = getAssignment(tribeAssignmentInfo, selectedEntity);

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div id="tribe-plan-visualiser" {onwheel} {onmousedown} {onmouseup} {onmousemove}>
   <div style:transform="scale({zoom})">
      <PlanNode plan={assignment} offsetX={offsetX} offsetY={offsetY} />
   </div>

   <TribesmanAssignmentDropdown tribe={tribe} onSelectEntity={onSelectEntity} />
</div>