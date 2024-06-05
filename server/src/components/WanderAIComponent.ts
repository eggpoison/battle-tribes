import { ServerComponentType, WanderAIComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export class WanderAIComponent {
   /** If set to -1, the wander AI has no current target position */
   targetPositionX = -1;
   targetPositionY = -1;
}

export const WanderAIComponentArray = new ComponentArray<ServerComponentType.wanderAI, WanderAIComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): WanderAIComponentData {
   const wanderAIComponent = WanderAIComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.wanderAI,
      targetPositionX: wanderAIComponent.targetPositionX,
      targetPositionY: wanderAIComponent.targetPositionY
   };
}