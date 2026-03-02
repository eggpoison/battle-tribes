import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { Point, polarVec2 } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { OkrenTongueComponent } from "../../components/OkrenTongueComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { addHitboxVelocity, Hitbox, HitboxAngularTether } from "../../hitboxes";

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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.okrenTongue]: okrenTongueComponent
      },
      lights: []
   };
}