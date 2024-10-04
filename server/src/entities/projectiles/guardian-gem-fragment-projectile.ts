import { createHitbox, HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import RectangularBox from "../../../../shared/src/boxes/RectangularBox";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { ComponentConfig } from "../../components";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.projectile
   | ServerComponentType.guardianGemFragmentProjectile;

export function createGuardianGemFragmentProjectileConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.guardianGemFragmentProjectile,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), 8, 16, 0), 0.3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByAirFriction: false,
         isAffectedByGroundFriction: false,
         isImmovable: true
      },
      [ServerComponentType.projectile]: {
         owner: 0
      },
      [ServerComponentType.guardianGemFragmentProjectile]: {}
   };
}