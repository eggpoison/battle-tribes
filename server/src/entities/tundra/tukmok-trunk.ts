import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point, polarVec2 } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TukmokTrunkComponent } from "../../components/TukmokTrunkComponent";
import { Hitbox } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";

const NUM_SEGMENTS = 8;

const IDEAL_DIST = 6;

export function createTukmokTrunkConfig(position: Point, angle: number, trunkBaseOffset: Point): EntityConfig {
   const transformComponent = new TransformComponent();

   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < NUM_SEGMENTS; i++) {
      let hitboxPosition: Point;
      let offset: Point;
      if (lastHitbox === null) {
         hitboxPosition = position;
         offset = trunkBaseOffset;
      } else {
         hitboxPosition = lastHitbox.box.position.copy();
         hitboxPosition.add(polarVec2(IDEAL_DIST, angle));
         offset = new Point(0, 0);
      }

      let mass: number;
      let flags: Array<HitboxFlag>;
      if (i < NUM_SEGMENTS - 1) {
         mass = 0.2;
         flags = [];
      } else {
         mass = 0.3;
         flags = [HitboxFlag.TUKMOK_TRUNK_HEAD];
      }

      const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(hitboxPosition, offset, 0, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, flags);
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (lastHitbox !== null) {
         tetherHitboxes(hitbox, lastHitbox, IDEAL_DIST, 50, 0.5);
         // @Hack: method of adding
         hitbox.angularTethers.push({
            originHitbox: lastHitbox,
            idealAngle: 0,
            springConstant: 25,
            damping: 0.5,
            padding: Math.PI * 0.1,
            idealHitboxAngleOffset: 0,
            useLeverage: false
         });
      }

      lastHitbox = hitbox;
   }
   
   const healthComponent = new HealthComponent(75);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const tukmokTrunkComponent = new TukmokTrunkComponent();
   
   return {
      entityType: EntityType.tukmokTrunk,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         tukmokTrunkComponent
      ],
      lights: []
   };
}