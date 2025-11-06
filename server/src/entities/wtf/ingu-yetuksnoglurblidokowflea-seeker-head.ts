import { createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxFlag, HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point, polarVec2 } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { InguYetuksnoglurblidokowfleaSeekerHeadComponent } from "../../components/InguYetuksnoglurblidokowfleaSeekerHeadComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";

export function createInguYetuksnoglurblidokowfleaSeekerHeadConfig(position: Point, angle: number, baseOffset: Point, isCow: boolean, numSegments: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const IDEAL_DIST = 6;
   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < numSegments; i++) {
      let hitboxPosition: Point;
      let offset: Point;
      if (lastHitbox === null) {
         hitboxPosition = position;
         offset = baseOffset;
      } else {
         hitboxPosition = lastHitbox.box.position.copy();
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

   const offset = polarVec2(32, angle);
   const headPosition = lastHitbox!.box.position.copy();
   headPosition.add(offset);
   let headHitbox: Hitbox;
   if (isCow) {
      headHitbox = new Hitbox(transformComponent, lastHitbox, true, new CircularBox(headPosition, offset, 0, 30), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.COW_HEAD]);
   } else {
      headHitbox = new Hitbox(transformComponent, lastHitbox, true, new CircularBox(headPosition, offset, 0, 40), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.TUKMOK_HEAD]);
   }
   headHitbox.box.pivot = createNormalisedPivotPoint(0, -0.5);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Head mandibles
   if (isCow) {
      for (let i = 0; i < 2; i++) {
         const sideIsFlipped = i === 1;

         {
            const mandibleOffset = new Point(12, 36);
            const mandiblePosition = headHitbox.box.position.copy();
            mandiblePosition.add(mandibleOffset);
            const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(mandiblePosition, mandibleOffset, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_BIG]);
            mandibleHitbox.box.flipX = sideIsFlipped;
            // @Hack
            mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
            mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }

         {
            const mandibleOffset = new Point(18, 32);
            const mandiblePosition = headHitbox.box.position.copy();
            mandiblePosition.add(mandibleOffset);
            const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(mandiblePosition, mandibleOffset, Math.PI * 0.3, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_MEDIUM]);
            mandibleHitbox.box.flipX = sideIsFlipped;
            // @Hack
            mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
            mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }
      }
   } else {
      for (let i = 0; i < 2; i++) {
         const sideIsFlipped = i === 1;

         {
            const mandibleOffset = new Point(14, 48);
            const mandiblePosition = headHitbox.box.position.copy();
            mandiblePosition.add(mandibleOffset);
            const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(mandiblePosition, mandibleOffset, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_BIG]);
            mandibleHitbox.box.flipX = sideIsFlipped;
            // @Hack
            mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
            mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }

         {
            const mandibleOffset = new Point(22, 46);
            const mandiblePosition = headHitbox.box.position.copy();
            mandiblePosition.add(mandibleOffset);
            const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(mandiblePosition, mandibleOffset, Math.PI * 0.3, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_MEDIUM]);
            mandibleHitbox.box.flipX = sideIsFlipped;
            // @Hack
            mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
            mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
            addHitboxToTransformComponent(transformComponent, mandibleHitbox);
         }
      }
   }

   const healthComponent = new HealthComponent(1000);

   const statusEffectComponent = new StatusEffectComponent(0);

   const inguYetuksnoglurblidokowfleaSeekerHeadComponent = new InguYetuksnoglurblidokowfleaSeekerHeadComponent(isCow);

   return {
      entityType: EntityType.inguYetuksnoglurblidokowfleaSeekerHead,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead]: inguYetuksnoglurblidokowfleaSeekerHeadComponent
      },
      lights: []
   };
}