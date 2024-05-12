import { ScarInfo, TribeWarriorComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { TribeWarriorComponentArray } from "./ComponentArray";

export class TribeWarriorComponent {
   public readonly scars: ReadonlyArray<ScarInfo>;

   constructor(scars: ReadonlyArray<ScarInfo>) {
      this.scars = scars;
   }
}

export function serialiseTribeWarriorComponent(entity: Entity): TribeWarriorComponentData {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity.id);
   return {
      scars: tribeWarriorComponent.scars
   };
}