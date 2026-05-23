import { HitboxCollisionType, HitboxFlag, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, Point, polarVec2 } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { OkrenTongueComponent } from "../../components/OkrenTongueComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { addHitboxVelocity, Hitbox, HitboxAngularTether } from "../../hitboxes.js";

export function createOkrenTongueConfig(position: Point, angle: number, okrenHitbox: Hitbox, target: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
      
   // Only the tongue tip at first
   const tongueTipHitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), angle, 16, 24), 0.9, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_TONGUE_SEGMENT_TIP]);
   addHitboxToTransformComponent(transformComponent, tongueTipHitbox);
   
   // Restrict the new base entity to match the direction of the okren
   // @Copynpaste
   const angularTether: HitboxAngularTether = {
      originHitbox: okrenHitbox,
      idealAngle: 0,
      springConstant: 1/60,
      damping: 0.5,
      padding: 0,
      idealHitboxAngleOffset: 0,
      useLeverage: false
   };
   tongueTipHitbox.angularTethers.push(angularTether);

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