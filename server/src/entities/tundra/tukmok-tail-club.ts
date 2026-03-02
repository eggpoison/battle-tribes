import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TukmokTailClubComponent } from "../../components/TukmokTailClubComponent";
import { Hitbox } from "../../hitboxes";

export function createTukmokTailClubConfig(position: Point, angle: number, offset: Point): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, offset, angle, 18), 0.28, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(75);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const tukmokTailComponent = new TukmokTailClubComponent();
   
   return {
      entityType: EntityType.tukmokTailClub,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tukmokTailClub]: tukmokTailComponent
      },
      lights: []
   };
}