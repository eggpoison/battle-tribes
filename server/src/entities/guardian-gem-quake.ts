import { createHitbox, HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "../../../shared/src/collision";
import { CollisionGroup } from "../../../shared/src/collision-groups";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { EntityConfig } from "../components";
import { GuardianGemQuakeComponent } from "../components/GuardianGemQuakeComponent";
import { PhysicsComponent } from "../components/PhysicsComponent";
import { TransformComponent } from "../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.guardianGemQuake;

export function createGuardianGemQuakeConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.exclusiveDamaging);
const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 10), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   // @Hack: shouldn't have
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isImmovable = true;

   const guardianGemQuakeCompoennt = new GuardianGemQuakeComponent();
   
   return {
      entityType: EntityType.guardianGemQuake,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.guardianGemQuake]: guardianGemQuakeCompoennt
      }
   };
}