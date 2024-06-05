import { SnowballSize } from "webgl-test-shared/dist/entities";
import { ServerComponentType, SnowballComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export class SnowballComponent {
   public readonly yetiID: number;
   public readonly size: SnowballSize;
   public readonly lifetimeTicks: number;

   constructor(yetiID: number, size: SnowballSize, lifetime: number) {
      this.yetiID = yetiID;
      this.size = size;
      this.lifetimeTicks = lifetime;
   }
}

export const SnowballComponentArray = new ComponentArray<ServerComponentType.snowball, SnowballComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): SnowballComponentData {
   const snowballComponent = SnowballComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.snowball,
      size: snowballComponent.size
   };
}