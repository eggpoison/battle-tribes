import { CircularBox, ServerComponentType, Entity, Packet } from "battletribes-shared";
import { getConfigComponent } from "../components.js";
import { createOkrenConfig } from "../entities/desert/okren.js";
import { getEntityComponentTypes } from "../entity-component-types.js";
import { Hitbox } from "../hitboxes.js";
import Tribe from "../Tribe.js";
import { createEntity, destroyEntity, getEntityAgeTicks, getEntityLayer, getEntityType, ticksToGameHours } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";

export class KrumblidMorphCocoonComponent {
   public stage = 1;

   /** Krumblids can transfer their tameness to their okren stage, so this is necessary as an intermediary */
   public readonly tameTribe: Tribe | null;

   constructor(tameTribe: Tribe | null) {
      this.tameTribe = tameTribe;
   }
}

export const KrumblidMorphCocoonComponentArray = new ComponentArray<KrumblidMorphCocoonComponent>(ServerComponentType.krumblidMorphCocoon, true, getDataLength, addDataToPacket);
KrumblidMorphCocoonComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const NUM_STAGES = 9;
// @TEMPORARY
// const DURATION_HOURS = 72;
const DURATION_HOURS = 2;

const getStage = (ageTicks: number): number => {
   const ageHours = ticksToGameHours(ageTicks);
   // @TEMPORARY
   return 1 + Math.floor(ageHours / DURATION_HOURS * NUM_STAGES) + 7;
}

function onTick(cocoon: Entity): void {
   const krumblidMorphCocoonComponent = KrumblidMorphCocoonComponentArray.getComponent(cocoon);

   const ageTicks = getEntityAgeTicks(cocoon);
   const stage = getStage(ageTicks);
   if (stage > NUM_STAGES) {
      destroyEntity(cocoon);

      const transformComponent = TransformComponentArray.getComponent(cocoon);
      const hitbox = transformComponent.hitboxes[0];
      
      // @Temporary: size
      const okrenConfig = createOkrenConfig(hitbox.box.position.copy(), hitbox.box.angle, 4);

      const tribe = krumblidMorphCocoonComponent.tameTribe;
      if (tribe !== null) {
         const componentTypes = getEntityComponentTypes(getEntityType(cocoon));
         const tamingComponent = getConfigComponent(okrenConfig.components, componentTypes, ServerComponentType.taming);
         tamingComponent.tamingTier = 1;
         tamingComponent.tameTribe = tribe;
      }
      
      createEntity(okrenConfig, getEntityLayer(cocoon), 0);
   } else if (stage !== krumblidMorphCocoonComponent.stage) {
      krumblidMorphCocoonComponent.stage = stage;

      const transformComponent = TransformComponentArray.getComponent(cocoon);
      const hitbox = transformComponent.hitboxes[0];
      (hitbox.box as CircularBox).radius += 4;
      transformComponent.isDirty = true;
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const krumblidMorphCocoonComponent = KrumblidMorphCocoonComponentArray.getComponent(entity);
   packet.writeNumber(krumblidMorphCocoonComponent.stage);
}