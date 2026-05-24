import { createNormalisedPivotPoint, HitboxFlag, HitboxCollisionType, CircularBox, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Point, polarVec2, PivotPointType } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { InguYetuksnoglurblidokowfleaSeekerHeadComponent } from "../../components/InguYetuksnoglurblidokowfleaSeekerHeadComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { tetherHitboxes } from "../../tethers.js";

export function createInguYetuksnoglurblidokowfleaSeekerHeadConfig(x: number, y: number, angle: number, baseOffsetX: number, baseOffsetY: number, isCow: boolean, numSegments: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const IDEAL_DIST = 6;
   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < numSegments; i++) {
      let hitboxPosition: Point;
      let offset: Point;
      if (lastHitbox === null) {
         hitboxPosition = new Point(x, y);
         offset = new Point(baseOffsetX, baseOffsetY);
      } else {
         hitboxPosition = new Point(lastHitbox.box.posX, lastHitbox.box.posY);
         hitboxPosition.add(polarVec2(IDEAL_DIST, angle));
         offset = new Point(0, 0);
      }

      let mass: number;
      let flags: Array<HitboxFlag>;
      if (i < numSegments - 1) {
         mass = 0.2;
         flags = [HitboxFlag.YETUK_TRUNK_MIDDLE];
      } else {
         mass = 0.3;
         flags = [HitboxFlag.YETUK_TRUNK_HEAD];
      }

      const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(hitboxPosition.x, hitboxPosition.y, offset.x, offset.y, 0, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, flags);
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

   const offset = polarVec2(32, angle);
   const headPosition = new Point(lastHitbox!.box.posX, lastHitbox!.box.posY);
   headPosition.add(offset);
   let headHitbox: Hitbox;
   if (isCow) {
      headHitbox = new Hitbox(transformComponent, lastHitbox, true, new CircularBox(headPosition.x, headPosition.y, offset.x, offset.y, 0, 30), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.COW_HEAD]);
   } else {
      headHitbox = new Hitbox(transformComponent, lastHitbox, true, new CircularBox(headPosition.x, headPosition.y, offset.x, offset.y, 0, 40), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.TUKMOK_HEAD]);
   }
   headHitbox.box.pivotY = -0.5;
   headHitbox.box.pivotType = PivotPointType.normalised;
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Head mandibles
   if (isCow) {
      for (let i = 0; i < 2; i++) {
         const sideIsFlipped = i === 1;

         {
            const mandibleOffset = new Point(12, 36);
            const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_BIG]);
            mandibleHitbox.box.flipX = sideIsFlipped;
            // @Hack
            mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
            mandibleHitbox.box.pivotX = -0.5;
            mandibleHitbox.box.pivotY = -0.5;
            mandibleHitbox.box.pivotType = PivotPointType.normalised;
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }

         {
            const mandibleOffset = new Point(18, 32);
            const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.3, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_MEDIUM]);
            mandibleHitbox.box.flipX = sideIsFlipped;
            // @Hack
            mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
            mandibleHitbox.box.pivotX = -0.5;
            mandibleHitbox.box.pivotY = -0.5;
            mandibleHitbox.box.pivotType = PivotPointType.normalised;
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }
      }
   } else {
      for (let i = 0; i < 2; i++) {
         const sideIsFlipped = i === 1;

         {
            const mandibleOffset = new Point(14, 48);
            const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_BIG]);
            mandibleHitbox.box.flipX = sideIsFlipped;
            // @Hack
            mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
            mandibleHitbox.box.pivotX = -0.5;
            mandibleHitbox.box.pivotY = -0.5;
            mandibleHitbox.box.pivotType = PivotPointType.normalised;
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }

         {
            const mandibleOffset = new Point(22, 46);
            const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.3, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_MEDIUM]);
            mandibleHitbox.box.flipX = sideIsFlipped;
            // @Hack
            mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
            mandibleHitbox.box.pivotX = -0.5;
            mandibleHitbox.box.pivotY = -0.5;
            mandibleHitbox.box.pivotType = PivotPointType.normalised;
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }
      }
   }

   const healthComponent = new HealthComponent(1000);

   const statusEffectComponent = new StatusEffectComponent(0);

   const inguYetuksnoglurblidokowfleaSeekerHeadComponent = new InguYetuksnoglurblidokowfleaSeekerHeadComponent(isCow);

   return {
      entityType: EntityType.inguYetuksnoglurblidokowfleaSeekerHead,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         inguYetuksnoglurblidokowfleaSeekerHeadComponent
      ],
      lights: []
   };
}