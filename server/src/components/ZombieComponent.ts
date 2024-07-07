import { ServerComponentType, ZombieComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface ZombieComponentParams {
   readonly zombieType: number;
   readonly tombstoneID: number;
}

export class ZombieComponent {
   /** The type of the zombie, 0-3 */
   public readonly zombieType: number;
   public readonly tombstoneID: number;

   /** Maps the IDs of entities which have attacked the zombie to the number of ticks that they should remain in the object for */
   public readonly attackingEntityIDs: Partial<Record<number, number>> = {};

   /** Cooldown before the zombie can do another attack */
   public attackCooldownTicks = 0;

   public visibleHurtEntityID = 0;
   /** Ticks since the visible hurt entity was last hit */
   public visibleHurtEntityTicks = 0;
   
   constructor(params: ZombieComponentParams) {
      this.zombieType = params.zombieType;
      this.tombstoneID = params.tombstoneID;
   }
}

export const ZombieComponentArray = new ComponentArray<ServerComponentType.zombie, ZombieComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): ZombieComponentData {
   const zombieComponent = ZombieComponentArray.getComponent(entityID);
   
   return {
      componentType: ServerComponentType.zombie,
      zombieType: zombieComponent.zombieType
   };
}