import { useCallback, useEffect, useState } from "react";
import { AIPlan, TribeAssignmentInfo } from "../../../game/rendering/tribe-plan-visualiser/tribe-plan-visualiser";
import { distance, AIPlanType, assert } from "../../../../../shared/src/utils";
import CLIENT_ITEM_INFO_RECORD from "../../../game/client-item-info";
import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
import TribesmanAssignmentDropdown from "../dev/tabs/TribesmanDropdown";
import { ExtendedTribe } from "../../../game/tribes";
import { Entity } from "../../../../../shared/src/entities";

const enum Vars {
   ZOOM_FACTOR = 1.4
}

interface PlanNodeProps {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly plan: AIPlan;
}

interface PlanConnectorProps {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly startPlan: AIPlan;
   readonly endPlan: AIPlan;
}

export let TribePlanVisualiser_setPlan: (tribeAssignmentInfo: TribeAssignmentInfo | null, tribe: ExtendedTribe | null) => void = () => {};

const getPlanX = (plan: AIPlan, offsetX: number): number => {
   return plan.xOffset * 1.7 + offsetX;
}
const getPlanY = (plan: AIPlan, offsetY: number): number => {
   return plan.depth * 160 + offsetY;
}

const PlanConnector = (props: PlanConnectorProps) => {
   const startX = getPlanX(props.startPlan, props.offsetX);
   const startY = getPlanY(props.startPlan, props.offsetY);
   const endX = getPlanX(props.endPlan, props.offsetX);
   const endY = getPlanY(props.endPlan, props.offsetY);
   
   const length = distance(startX, startY, endX, endY);
   const angle = Math.atan2(endY - startY, endX - startX);
   
   return <div style={{width: length + "px", left: `calc(50% + ${startX}px)`, top: `calc(50% + ${startY}px)`, transform: `rotate(${angle}rad)`}} className="node-connector"></div>;
}

const PlanNode = (props: PlanNodeProps) => {
   const plan = props.plan;

   let content: JSX.Element;
   switch (plan.type) {
      case AIPlanType.root: {
         content = <>
            <h3 className="title">Root Plan</h3>
         </>;
         break;
      };
      case AIPlanType.craftRecipe: {
         const productClientItemInfo = CLIENT_ITEM_INFO_RECORD[plan.recipe.product];
         
         content = <>
            <h3 className="title">Craft Recipe</h3>
            <p>{productClientItemInfo.name}</p>
            <p>Amount: {plan.productAmount}</p>
         </>;
         break;
      };
      case AIPlanType.placeBuilding: {
         content = <>
            <h3 className="title">Place Building</h3>
            <p>{CLIENT_ENTITY_INFO_RECORD[plan.entityType].name}</p>
         </>;
         break;
      };
      case AIPlanType.upgradeBuilding: {
         content = <>
            <h3 className="title">Upgrade Building</h3>
         </>;
         break;
      };
      case AIPlanType.doTechStudy: {
         content = <>
            <h3 className="title">Study Tech</h3>
            <p>{plan.tech.name}</p>
         </>;
         break;
      };
      case AIPlanType.doTechItems: {
         content = <>
            <h3 className="title">Do Tech Items</h3>
            <p>{plan.tech.name}</p>
            <p>{CLIENT_ITEM_INFO_RECORD[plan.itemType].name}</p>
         </>;
         break;
      };
      case AIPlanType.completeTech: {
         content = <>
            <h3 className="title">Complete Tech</h3>
            <p>{plan.tech.name}</p>
         </>;
         break;
      };
      case AIPlanType.gatherItem: {
         content = <>
            <h3 className="title">Gather Items</h3>
            <p>{CLIENT_ITEM_INFO_RECORD[plan.itemType].name} x{plan.amount}</p>
         </>;
         break;
      };
   }

   let className = "tribe-plan-node";
   if (plan.isComplete) {
      className += " complete";
   } else if (plan.assignedTribesman !== null) {
      className += " assigned";
   }
   if (!plan.isCompletable) {
      className += " incompletable";
   }
   
   return <>
      <div style={{"left": `calc(50% + ${getPlanX(plan, props.offsetX)}px)`, "top": `calc(50% + ${getPlanY(plan, props.offsetY)}px)`}} className={className}>
         {content}

         {plan.assignedTribesman !== null ? (
            <p>Assigned: #{plan.assignedTribesman}</p>
         ) : <></>}
      </div>

      {plan.childPlans.map((childPlan, i) => {
         return <div key={i}>
            <PlanNode plan={childPlan} offsetX={props.offsetX} offsetY={props.offsetY} />
            <PlanConnector startPlan={props.plan} endPlan={childPlan} offsetX={props.offsetX} offsetY={props.offsetY} />
         </div>
      })}
   </>;
}

const getAssignment = (tribeAssignmentInfo: TribeAssignmentInfo, selectedEntity: Entity | null): AIPlan => {
   if (selectedEntity === null) {
      return tribeAssignmentInfo.tribeAssignment;
   }

   const assignment = tribeAssignmentInfo.entityAssignments[selectedEntity];
   assert(typeof assignment !== "undefined");
   return assignment;
}

const TribePlanVisualiser = () => {
   const [tribeAssignmentInfo, setTribeAssignmentInfo] = useState<TribeAssignmentInfo | null>(null);
   const [tribe, setTribe] = useState<ExtendedTribe | null>(null);
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
   
   if (tribeAssignmentInfo === null || tribe === null) {
      return null;
   }

   const assignment = getAssignment(tribeAssignmentInfo, selectedEntity);

   return <div id="tribe-plan-visualiser" onWheel={e => onWheel(e.nativeEvent)} onMouseDown={e => onMouseDown(e.nativeEvent)} onMouseUp={e => onMouseUp(e.nativeEvent)} onMouseMove={e => onMouseMove(e.nativeEvent)}>
      <div style={{transform: `scale(${zoom})`}}>
         <PlanNode plan={assignment} offsetX={offsetX} offsetY={offsetY} />
      </div>

      <TribesmanAssignmentDropdown tribe={tribe} onSelectEntity={onSelectEntity} />
   </div>;
}

export default TribePlanVisualiser;