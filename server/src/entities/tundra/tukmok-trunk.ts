import { HitboxTag, createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TukmokTrunkComponent } from "../../components/TukmokTrunkComponent.js";
import { createHitbox, Hitbox, setHitboxTag } from "../../hitboxes.js";
import { addHitboxAngularTether, tetherHitboxes } from "../../tethers.js";

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
      let tag: HitboxTag | undefined;
      if (i < NUM_SEGMENTS - 1) {
         mass = 0.2;
      } else {
         mass = 0.3;
         tag = HitboxTag.tukmokTrunkHead;
      }

      const hitbox = createHitbox(transformComponent, null, createCircularBox(hitboxX, hitboxY, offsetX, offsetY, 0, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      if (tag !== undefined) {
         setHitboxTag(hitbox, tag);
      }
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (lastHitbox !== null) {
         tetherHitboxes(hitbox, lastHitbox, IDEAL_DIST, 50, 0.5);
         addHitboxAngularTether(hitbox, {
            hitbox: hitbox,
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