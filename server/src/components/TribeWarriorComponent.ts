import { ScarInfo, ServerComponentType, TribeWarriorComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface TribeWarriorComponentParams {
   readonly scars: ReadonlyArray<ScarInfo>;
}

export class TribeWarriorComponent {
   public readonly scars: ReadonlyArray<ScarInfo>;

   constructor(params: TribeWarriorComponentParams) {
      this.scars = params.scars;
   }
}

export const TribeWarriorComponentArray = new ComponentArray<ServerComponentType.tribeWarrior, TribeWarriorComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): TribeWarriorComponentData {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entityID);

   return {
      componentType: ServerComponentType.tribeWarrior,
      scars: tribeWarriorComponent.scars
   };
}