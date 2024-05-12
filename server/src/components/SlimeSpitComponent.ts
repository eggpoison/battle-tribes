import { SlimeSpitComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { SlimeSpitComponentArray } from "./ComponentArray";

export class SlimeSpitComponent {
   public readonly size: number;

   constructor(size: number) {
      this.size = size;
   }
}

export function serialiseSlimeSpitComponent(slimeSpit: Entity): SlimeSpitComponentData {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(slimeSpit.id);
   return {
      size: slimeSpitComponent.size
   };
}