import { createHitbox, Hitbox, HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { ComponentConfig } from "../../components";
import { getGuardianLimbOrbitRadius } from "../../components/GuardianComponent";

const enum Vars {
   VISION_RANGE = 300
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper;

const createGuardianHitboxes = (): Array<Hitbox> => {
   const hitboxes = new Array<Hitbox>();

   hitboxes.push(createHitbox(new CircularBox(new Point(0, 0), 0, 40), 1.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []));

   // Limbs
   const limbOrbitRadius = getGuardianLimbOrbitRadius();
   for (let i = 0; i < 2; i++) {
      hitboxes.push(createHitbox(new CircularBox(new Point(limbOrbitRadius * (i === 0 ? 1 : -1), 0), 0, 14), 0.7, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.GUARDIAN_LIMB_HITBOX]));
   }

   return hitboxes;
}

export function createGuardianConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.guardian,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createGuardianHitboxes()
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 60
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.aiHelper]: {
         ignoreDecorativeEntities: true,
         visionRange: Vars.VISION_RANGE
      }
   };
}