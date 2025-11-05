<script lang="ts">
   import { AIPlan, TribeAssignmentInfo } from "../../../game/rendering/tribe-plan-visualiser/tribe-plan-visualiser";
   import { distance, AIPlanType, assert } from "../../../../../shared/src/utils";
   import CLIENT_ITEM_INFO_RECORD from "../../../game/client-item-info";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import { ExtendedTribe } from "../../../game/tribes";
   import { Entity } from "../../../../../shared/src/entities";

   const enum Vars {
      ZOOM_FACTOR = 1.4
   }


   export let TribePlanVisualiser_setPlan: (tribeAssignmentInfo: TribeAssignmentInfo | null, tribe: ExtendedTribe | null) => void = () => {};

   const getPlanX = (plan: AIPlan, offsetX: number): number => {
      return plan.xOffset * 1.7 + offsetX;
   }
   const getPlanY = (plan: AIPlan, offsetY: number): number => {
      return plan.depth * 160 + offsetY;
   }

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

   useEffect(() => {
      TribePlanVisualiser_setPlan = (tribeAssignmentInfo: TribeAssignmentInfo | null, tribe: ExtendedTribe | null): void => {
         setTribeAssignmentInfo(tribeAssignmentInfo);
         setTribe(tribe);
      }
   }, []);

   const onMouseDown = (e: MouseEvent): void => {
      setIsDragging(true);
      setLastCursorX(e.clientX);
      setLastCursorY(e.clientY);
   }

   const onMouseUp = (e: MouseEvent): void => {
      setIsDragging(false);
   }

   const onMouseMove = useCallback((e: MouseEvent): void => {
      if (!isDragging) {
         return;
      }

      e.preventDefault();

      setOffsetX(offsetX + (e.clientX - lastCursorX) / zoom);
      setOffsetY(offsetY + (e.clientY - lastCursorY) / zoom);
      
      setLastCursorX(e.clientX);
      setLastCursorY(e.clientY);
   }, [isDragging, offsetX, offsetY, zoom]);

   const onWheel = useCallback((e: WheelEvent): void => {
      if (e.deltaY > 0) {
         setZoom(zoom / Vars.ZOOM_FACTOR);
      } else {
         setZoom(zoom * Vars.ZOOM_FACTOR);
      }
   }, [zoom]);

   const onSelectEntity = (entity: Entity | null): void => {
      setSelectedEntity(entity);
   }
   
   // @SQUEAM @InCOMPLETE
   // if (tribeAssignmentInfo === null || tribe === null) {
   //    return null;
   // }

   const assignment = getAssignment(tribeAssignmentInfo, selectedEntity);

</script>

<div id="tribe-plan-visualiser" onWheel={e => onWheel(e.nativeEvent)} onMouseDown={e => onMouseDown(e.nativeEvent)} onMouseUp={e => onMouseUp(e.nativeEvent)} onMouseMove={e => onMouseMove(e.nativeEvent)}>
   <div style:transform="scale({zoom})">
      <PlanNode plan={assignment} offsetX={offsetX} offsetY={offsetY} />
   </div>

   <TribesmanAssignmentDropdown tribe={tribe} onSelectEntity={onSelectEntity} />
</div>;