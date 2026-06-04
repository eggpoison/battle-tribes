import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType } from "../../../shared/dist/entities.js";
import { Settings } from "../../../shared/dist/settings.js";
import { randInt, randFloat, randSign } from "../../../shared/dist/utils.js";
import { createDustfleaConfig } from "../entities/desert/dustflea.js";
import { addHitboxAngularVelocity, Hitbox } from "../hitboxes.js";
import { getHitboxTethers, tetherHitboxes } from "../tethers.js";
import { createEntity, destroyEntity, getEntityAgeTicks, getEntityLayer, getEntityType, ticksToGameHours } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";

// @Incomplete: make dustflea eggs stick to walls as well

const MIN_JIGGLE_TIME_TICKS = 2 * Settings.TICK_RATE;
const MAX_JIGGLE_TIME_TICKS = 3 * Settings.TICK_RATE;

export class DustfleaEggComponent {
   public readonly parentOkren: Entity;
   public jiggleTimer = randInt(MIN_JIGGLE_TIME_TICKS, MAX_JIGGLE_TIME_TICKS);

   constructor(parentOkren: Entity) {
      this.parentOkren = parentOkren;
   }
}

export const DustfleaEggComponentArray = new ComponentArray<DustfleaEggComponent>(ServerComponentType.dustfleaEgg, true, getDataLength, addDataToPacket);
DustfleaEggComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
DustfleaEggComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(dustfleaEgg: Entity): void {
   const dustfleaEggComponent = DustfleaEggComponentArray.getComponent(dustfleaEgg);
   if (dustfleaEggComponent.jiggleTimer > 0) {
      dustfleaEggComponent.jiggleTimer--;
   } else {
      dustfleaEggComponent.jiggleTimer = randInt(MIN_JIGGLE_TIME_TICKS, MAX_JIGGLE_TIME_TICKS);

      const transformComponent = TransformComponentArray.getComponent(dustfleaEgg);
      const hitbox = transformComponent.hitboxes[0];
      addHitboxAngularVelocity(hitbox, randFloat(0.4, 0.7) * randSign());
   }

   const ageHours = ticksToGameHours(getEntityAgeTicks(dustfleaEgg));
   if (ageHours >= 4) {
      // Dustflea!!
      const transformComponent = TransformComponentArray.getComponent(dustfleaEgg);
      const hitbox = transformComponent.hitboxes[0];
      const dustfleaConfig = createDustfleaConfig(hitbox.box.posX, hitbox.box.posY, hitbox.box.angle);
      createEntity(dustfleaConfig, getEntityLayer(dustfleaEgg), 0);
      destroyEntity(dustfleaEgg);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(affectedHitbox: Hitbox, collidingHitbox: Hitbox): void {
   const collidingEntity = collidingHitbox.entity;
   
   // Can't stick to dustfleas
   if (getEntityType(collidingEntity) === EntityType.dustflea) {
      return;
   }
   
   // @Hack: so that the eggs don't immediately stick to the okren when they come out
   if (getEntityType(collidingEntity) === EntityType.okren || getEntityType(collidingEntity) === EntityType.okrenClaw) {
      return;
   }

   // Make sure neither of the hitboxes are already tethered to either of each other
   const affectedHitboxTethers = getHitboxTethers(affectedHitbox);
   if (affectedHitboxTethers !== undefined) {
      for (const tether of affectedHitboxTethers) {
         const otherHitbox = tether.getOtherHitbox(affectedHitbox);
         if (otherHitbox === collidingHitbox) {
            return;
         }
      }
   }
   // @Copynpaste @Hack: ideally we shouldn't have to check both hitboxes for the tether. references should be present on both not just 1
   const collidingHitboxTethers = getHitboxTethers(collidingHitbox);
   if (collidingHitboxTethers !== undefined) {
      for (const tether of collidingHitboxTethers) {
         const otherHitbox = tether.getOtherHitbox(collidingHitbox)
         if (otherHitbox === affectedHitbox) {
            return;
         }
      }
   }

   tetherHitboxes(affectedHitbox, collidingHitbox, 20, 10, 1);
}