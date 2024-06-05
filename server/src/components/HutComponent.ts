import { HutComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export class HutComponent {
   public lastDoorSwingTicks = 0;

   public hasSpawnedTribesman = false;
   public hasTribesman = false;
   public isRecalling = false;
}

export const HutComponentArray = new ComponentArray<ServerComponentType.hut, HutComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): HutComponentData {
   const hutComponent = HutComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.hut,
      lastDoorSwingTicks: hutComponent.lastDoorSwingTicks,
      isRecalling: hutComponent.isRecalling
   };
}