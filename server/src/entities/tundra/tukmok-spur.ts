import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TukmokSpurComponent } from "../../components/TukmokSpurComponent";
import { Hitbox } from "../../hitboxes";

export function createTukmokSpurConfig(position: Point, angle: number, offset: Point, mass: number, hitboxFlag: HitboxFlag, isFlipped: boolean): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, offset, angle, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [hitboxFlag]);
   hitbox.box.flipX = isFlipped;
   // @Hack
   hitbox.box.totalFlipXMultiplier = isFlipped ? -1 : 1;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(25);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const tukmokSpurComponent = new TukmokSpurComponent();
   
   return {
      entityType: EntityType.tukmokSpur,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tukmokSpur]: tukmokSpurComponent
      },
      lights: []
   };
}