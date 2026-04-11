import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { getSandBallMass } from "../../ai/SandBallingAI";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { SandBallComponent } from "../../components/SandBallComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export function createSandBallConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 8), getSandBallMass(1), HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(1);
   
   const sandBallComponent = new SandBallComponent();
   
   return {
      entityType: EntityType.sandBall,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         sandBallComponent,
      ],
      lights: []
   };
}