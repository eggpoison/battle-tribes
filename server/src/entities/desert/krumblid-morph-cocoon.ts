import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { KrumblidMorphCocoonComponent } from "../../components/KrumblidMorphCocoonComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";
import Tribe from "../../Tribe";

export function createKrumblidMorphCocoonConfig(position: Point, angle: number, tameTribe: Tribe | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 28), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(20);
   
   const krumblidMorphCocoonComponent = new KrumblidMorphCocoonComponent(tameTribe);
   
   return {
      entityType: EntityType.krumblidMorphCocoon,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.krumblidMorphCocoon]: krumblidMorphCocoonComponent,
      },
      lights: []
   };
}