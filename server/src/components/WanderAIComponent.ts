import { WanderAIComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { WanderAIComponentArray } from "./ComponentArray";

export class WanderAIComponent {
   /** If set to -1, the wander AI has no current target position */
   targetPositionX = -1;
   targetPositionY = -1;
}

export function serialiseWanderAIComponent(entity: Entity): WanderAIComponentData {
   const wanderAIComponent = WanderAIComponentArray.getComponent(entity.id);
   return {
      targetPositionX: wanderAIComponent.targetPositionX,
      targetPositionY: wanderAIComponent.targetPositionY
   };
}