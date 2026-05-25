import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, polarVec2, createRectangularBox, HitboxTag } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { OkrenTongueComponent } from "../../components/OkrenTongueComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { addHitboxVelocity, createHitbox, Hitbox, setHitboxTag } from "../../hitboxes.js";
import { addHitboxAngularTether, HitboxAngularTether } from "../../tethers.js";

export function createOkrenTongueConfig(x: number, y: number, angle: number, okrenHitbox: Hitbox, target: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
      
   // Only the tongue tip at first
   const tongueTipHitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 16, 24), 0.9, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(tongueTipHitbox, HitboxTag.okrenTongueSegmentTip);
   addHitboxToTransformComponent(transformComponent, tongueTipHitbox);
   
   // Restrict the new base entity to match the direction of the okren
   // @Copynpaste
   const angularTether: HitboxAngularTether = {
      hitbox: tongueTipHitbox,
      originHitbox: okrenHitbox,
      idealAngle: 0,
      springConstant: 1/60,
      damping: 0.5,
      padding: 0,
      idealHitboxAngleOffset: 0,
      useLeverage: false
   };
   addHitboxAngularTether(tongueTipHitbox, angularTether);

   const healthComponent = new HealthComponent(99);

   const okrenTongueComponent = new OkrenTongueComponent(target);
   
   // @Copynpaste
   // Apply some initial velocity
   addHitboxVelocity(tongueTipHitbox, polarVec2(200, okrenHitbox.box.angle));
   
   return {
      entityType: EntityType.okrenTongue,
      components: [
         transformComponent,
         healthComponent,
         okrenTongueComponent
      ],
      lights: []
   };
}