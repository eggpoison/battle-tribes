import { HitboxTag, createCircularBox, HitboxCollisionType, setBoxPivotType, PivotPointType, createRectangularBox, setBoxFlipX } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { Point, polarVec2 } from "../../../../shared/dist/utils.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { InguYetuksnoglurblidokowfleaSeekerHeadComponent } from "../../components/InguYetuksnoglurblidokowfleaSeekerHeadComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox, Hitbox, setHitboxTag } from "../../hitboxes.js";
import { addHitboxAngularTether, tetherHitboxes } from "../../tethers.js";

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
      let tag: HitboxTag;
      if (i < numSegments - 1) {
         mass = 0.2;
         tag = HitboxTag.yetukTrunkMiddle;
      } else {
         mass = 0.3;
         tag = HitboxTag.yetukTrunkHead;
      }

      const hitbox = createHitbox(transformComponent, null, createCircularBox(hitboxPosition.x, hitboxPosition.y, offset.x, offset.y, 0, 12), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxTag(hitbox, tag);
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

   const offset = polarVec2(32, angle);
   const headPosition = new Point(lastHitbox!.box.posX, lastHitbox!.box.posY);
   headPosition.add(offset);
   let headHitbox: Hitbox;
   if (isCow) {
      headHitbox = createHitbox(transformComponent, lastHitbox, createCircularBox(headPosition.x, headPosition.y, offset.x, offset.y, 0, 30), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxTag(headHitbox, HitboxTag.cowHead);
   } else {
      headHitbox = createHitbox(transformComponent, lastHitbox, createCircularBox(headPosition.x, headPosition.y, offset.x, offset.y, 0, 40), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxTag(headHitbox, HitboxTag.tukmokHead);
   }
   headHitbox.box.pivotY = -0.5;
   setBoxPivotType(headHitbox.box, PivotPointType.normalised);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Head mandibles
   if (isCow) {
      for (let i = 0; i < 2; i++) {
         const sideIsFlipped = i === 1;

         {
            const mandibleOffset = new Point(12, 36);
            const mandibleHitbox = createHitbox(transformComponent, headHitbox, createRectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
            setHitboxTag(mandibleHitbox, HitboxTag.yetukMandibleBig);
            setBoxFlipX(mandibleHitbox.box, sideIsFlipped);
            mandibleHitbox.box.pivotX = -0.5;
            mandibleHitbox.box.pivotY = -0.5;
            setBoxPivotType(mandibleHitbox.box, PivotPointType.normalised);
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }

         {
            const mandibleOffset = new Point(18, 32);
            const mandibleHitbox = createHitbox(transformComponent, headHitbox, createRectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.3, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
            setHitboxTag(mandibleHitbox, HitboxTag.yetukMandibleMedium);
            setBoxFlipX(mandibleHitbox.box, sideIsFlipped);
            mandibleHitbox.box.pivotX = -0.5;
            mandibleHitbox.box.pivotY = -0.5;
            setBoxPivotType(mandibleHitbox.box, PivotPointType.normalised);
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }
      }
   } else {
      for (let i = 0; i < 2; i++) {
         const sideIsFlipped = i === 1;

         {
            const mandibleOffset = new Point(14, 48);
            const mandibleHitbox = createHitbox(transformComponent, headHitbox, createRectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
            setHitboxTag(mandibleHitbox, HitboxTag.yetukMandibleBig);
            setBoxFlipX(mandibleHitbox.box, sideIsFlipped);
            mandibleHitbox.box.pivotX = -0.5;
            mandibleHitbox.box.pivotY = -0.5;
            setBoxPivotType(mandibleHitbox.box, PivotPointType.normalised);
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }

         {
            const mandibleOffset = new Point(22, 46);
            const mandibleHitbox = createHitbox(transformComponent, headHitbox, createRectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.3, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
            setHitboxTag(mandibleHitbox, HitboxTag.yetukMandibleMedium);
            setBoxFlipX(mandibleHitbox.box, sideIsFlipped);
            mandibleHitbox.box.pivotX = -0.5;
            mandibleHitbox.box.pivotY = -0.5;
            setBoxPivotType(mandibleHitbox.box, PivotPointType.normalised);
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