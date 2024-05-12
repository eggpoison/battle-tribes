import { HutComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { HutComponentArray } from "./ComponentArray";

export class HutComponent {
   public lastDoorSwingTicks = 0;

   public hasSpawnedTribesman = false;
   public hasTribesman = false;
   public isRecalling = false;
}

export function serialiseHutComponent(entity: Entity): HutComponentData {
   const hutComponent = HutComponentArray.getComponent(entity.id);
   return {
      lastDoorSwingTicks: hutComponent.lastDoorSwingTicks,
      isRecalling: hutComponent.isRecalling
   };
}