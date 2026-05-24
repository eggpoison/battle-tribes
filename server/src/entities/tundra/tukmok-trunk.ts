import { HitboxCollisionType, HitboxFlag, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TukmokTrunkComponent } from "../../components/TukmokTrunkComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { tetherHitboxes } from "../../tethers.js";

const NUM_SEGMENTS = 8;

const IDEAL_DIST = 6;

export function createTukmokTrunkConfig(x: number, y: number, angle: number, trunkBaseOffsetX: number, trunkBaseOffsetY: number): EntityConfig {
   const transformComponent = new TransformComponent();

   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < NUM_SEGMENTS; i++) {
      let hitboxX: number;
      let hitboxY: number;
      let offsetX: number;
      let offsetY: number;
      if (lastHitbox === null) {
         hitboxX = x;
         hitboxY = y;
         offsetX = trunkBaseOffsetX;
         offsetY = trunkBaseOffsetY;
      } else {
         hitboxX = lastHitbox.box.posX + IDEAL_DIST * Math.sin(angle);
         hitboxY = lastHitbox.box.posY + IDEAL_DIST * Math.cos(angle);
         offsetX = 0;
         offsetY = 0;
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

      const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(hitboxX, hitboxY, offsetX, offsetY, 0, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, flags);
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