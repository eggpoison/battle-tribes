import { TribesmanAIType } from "../../../../../shared/src/components";
import { Entity, EntityType, LimbAction, PlantedEntityType } from "../../../../../shared/src/entities";
import { Inventory, InventoryName, ItemType } from "../../../../../shared/src/items/items";
import { PathfindingSettings } from "../../../../../shared/src/settings";
import { getDistanceFromPointToEntity, willStopAtDesiredDistance } from "../../../ai-shared";
import { AIHelperComponent } from "../../../components/AIHelperComponent";
import { pathfindTribesman } from "../../../components/AIPathfindingComponent";
import { getItemTypeSlot, InventoryComponentArray, getInventory, consumeItemFromSlot } from "../../../components/InventoryComponent";
import { InventoryUseComponentArray, setLimbActions } from "../../../components/InventoryUseComponent";
import { placePlantInPlanterBox, PlanterBoxComponentArray } from "../../../components/PlanterBoxComponent";
import { TransformComponent, TransformComponentArray } from "../../../components/TransformComponent";
import { TribesmanAIComponent, TribesmanPathType } from "../../../components/TribesmanAIComponent";
import { Hitbox } from "../../../hitboxes";
import { PathfindFailureDefault } from "../../../pathfinding";
import { getEntityType, entityExists, getEntityLayer } from "../../../world";
import { getTribesmanAttackRadius, getHumanoidRadius } from "./tribesman-ai-utils";

export const PLANT_TO_SEED_RECORD: Record<PlantedEntityType, ItemType> = {
   [EntityType.treePlanted]: ItemType.seed,
   [EntityType.berryBushPlanted]: ItemType.berry,
   [EntityType.iceSpikesPlanted]: ItemType.frostcicle
};

const getSeedItemSlot = (hotbarInventory: Inventory, plantedEntityType: PlantedEntityType): number | null => {
   const searchItemType = PLANT_TO_SEED_RECORD[plantedEntityType];
   return getItemTypeSlot(hotbarInventory, searchItemType);
}

export function replantPlanterBoxes(tribesman: Entity, aiHelperComponent: AIHelperComponent, transformComponent: TransformComponent, hotbarInventory: Inventory, tribesmanAIComponent: TribesmanAIComponent): boolean {
   // @Hack
   const tribesmanHitbox = transformComponent.hitboxes[0];

   // Replace plants in planter boxes
   // @Speed

   let closestReplantablePlanterBox: Entity | undefined;
   let seedItemSlot: number | undefined;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (getEntityType(entity) !== EntityType.planterBox) {
         continue;
      }

      const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
      if (planterBoxComponent.replantEntityType === null) {
         continue;
      }

      if (planterBoxComponent.plant === null || !entityExists(planterBoxComponent.plant)) {
         continue;
      }

      const currentSeedItemSlot = getSeedItemSlot(hotbarInventory, planterBoxComponent.replantEntityType);
      if (currentSeedItemSlot === null) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = tribesmanHitbox.box.position.distanceTo(entityHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         closestReplantablePlanterBox = entity;
         seedItemSlot = currentSeedItemSlot;
      }
   }

   if (typeof closestReplantablePlanterBox !== "undefined") {
      const planterBoxTransformComponent = TransformComponentArray.getComponent(closestReplantablePlanterBox);
      
      // Select the seed
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
      const hotbarUseInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
      hotbarUseInfo.selectedItemSlot = seedItemSlot!;
      
      // @Cleanup: copy and pasted from tribesman-combat-ai
      const desiredDistance = getTribesmanAttackRadius(tribesman);
      const distance = getDistanceFromPointToEntity(tribesmanHitbox.box.position, planterBoxTransformComponent) - getHumanoidRadius(transformComponent);
      if (willStopAtDesiredDistance(tribesmanHitbox, desiredDistance, distance)) {
         // @Incomplete: turn to face direction and then place
         
         // @Cleanup: copy and pasted from player replant logic

         const planterBoxComponent = PlanterBoxComponentArray.getComponent(closestReplantablePlanterBox);
         placePlantInPlanterBox(closestReplantablePlanterBox, planterBoxComponent.replantEntityType!);

         // Consume the item
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribesman);
         const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
         const hotbarUseInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
         const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

         consumeItemFromSlot(tribesman, hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
      } else {
         const planterBoxTransformComponent = TransformComponentArray.getComponent(closestReplantablePlanterBox);
         const planterBoxHitbox = planterBoxTransformComponent.hitboxes[0];

         const pointDistance = tribesmanHitbox.box.position.distanceTo(planterBoxHitbox.box.position);
         const targetDirectRadius = pointDistance - distance;

         const goalRadius = Math.floor((desiredDistance + targetDirectRadius) / PathfindingSettings.NODE_SEPARATION);
         // @Temporary: failure default
         // pathfindToPosition(tribesman, closestReplantablePlanterBox.position.x, closestReplantablePlanterBox.position.y, closestReplantablePlanterBox.id, TribesmanPathType.default, goalRadius, PathfindFailureDefault.throwError);
         pathfindTribesman(tribesman, planterBoxHitbox.box.position.x, planterBoxHitbox.box.position.y, getEntityLayer(closestReplantablePlanterBox), closestReplantablePlanterBox, TribesmanPathType.default, goalRadius, PathfindFailureDefault.returnClosest);

         tribesmanAIComponent.currentAIType = TribesmanAIType.planting;
         setLimbActions(inventoryUseComponent, LimbAction.none);
      }

      return true;
   }

   return false;
}