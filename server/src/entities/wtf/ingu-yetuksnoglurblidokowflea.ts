import { HitboxCollisionType, HitboxFlag, CircularBox, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, Settings, getAbsAngleDiff, lerp, Point, polarVec2, rotatePoint, angle, PivotPointType } from "battletribes-shared";
import { ChildConfigAttachInfo, EntityConfig, getConfigTransformComponent } from "../../components.js";
import { AIHelperComponent } from "../../components/AIHelperComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { InguYetuksnoglurblidokowfleaComponent } from "../../components/InguYetuksnoglurblidokowfleaComponent.js";
import { OkrenClawGrowthStage } from "../../components/OkrenClawComponent.js";
import { OkrenAgeStage } from "../../components/OkrenComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent.js";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle } from "../../hitboxes.js";
import { tetherHitboxes } from "../../tethers.js";
import { getEntityAgeTicks } from "../../world.js";
import { createOkrenClawConfig } from "../desert/okren-claw.js";
import { createTukmokTailClubConfig } from "../tundra/tukmok-tail-club.js";
import { createInguYetuksnoglurblidokowfleaSeekerHeadConfig } from "./ingu-yetuksnoglurblidokowflea-seeker-head.js";

const moveFunc = (inguYetu: Entity, x: number, y: number, accelerationMagnitude: number): void => {
   // @HACKKK!!!!
   // const targetEntity = PlayerComponentArray.activeEntities[0];
   // const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // const targetHitbox = targetTransformComponent.hitboxes[0];
   
   const transformComponent = TransformComponentArray.getComponent(inguYetu);
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_1) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_2) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_3) || hitbox.flags.includes(HitboxFlag.YETUK_GLURB_SEGMENT)) {
         let moveDir: number;
         if (i === 0) {
            moveDir = hitbox.box.angle;
         } else {
            const previousHitbox = transformComponent.hitboxes[i - 1] as Hitbox;
            moveDir = angle(previousHitbox.box.posX - hitbox.box.posX, previousHitbox.box.posY - hitbox.box.posY);
         }
         
         const isHeadHitbox = hitbox.flags.includes(HitboxFlag.YETUK_BODY_1);
         const acc = accelerationMagnitude * (isHeadHitbox ? 1.2 : 0.6) * 0.5;
         const connectingVel = polarVec2(acc, moveDir);

         // const dirToTarget = hitbox.box.position.angleTo(targetHitbox.box.position);
         const dirToTarget = angle(x - hitbox.box.posX, y - hitbox.box.posY);
         const velToTarget = polarVec2(accelerationMagnitude * (isHeadHitbox ? 1.2 : 0.6) * 0.5, dirToTarget);

         applyAccelerationFromGround(hitbox, new Point(connectingVel.x + velToTarget.x, connectingVel.y + velToTarget.y));
      }
   }
}

const turnFunc = (inguYetu: Entity, x: number, y: number, turnSpeed: number, turnDamping: number): void => {
   // @HACKKK!!!!
   // const targetEntity = PlayerComponentArray.activeEntities[0];
   // const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // const targetHitbox = targetTransformComponent.hitboxes[0];

   // const pos = predictHitboxPos(targetHitbox, 0.3);

   const transformComponent = TransformComponentArray.getComponent(inguYetu);
   const headHitbox = transformComponent.rootHitboxes[0];

   const targetDirection = angle(x - headHitbox.box.posX, y - headHitbox.box.posY);

   const absDiff = getAbsAngleDiff(headHitbox.box.angle, targetDirection);
   const angleDiffStopWiggle = 0.85;
   const wiggleMultiplier = 1 - Math.pow(Math.min(absDiff, angleDiffStopWiggle) / angleDiffStopWiggle, 2);
   
   // const idealAngle = targetDirection + Math.PI * 0.45 * Math.sin(getEntityAgeTicks(serpent) * Settings.DT_S * 7) * wiggleMultiplier;
   const idealAngle = targetDirection + Math.PI * 0.45 * Math.sin(getEntityAgeTicks(inguYetu) * Settings.DT_S * 7);
   turnHitboxToAngle(headHitbox, idealAngle, turnSpeed, turnDamping, false);
}

export function createInguYetuksnoglurblidokowfleaConfig(x: number, y: number, angle: number): ReadonlyArray<EntityConfig> {
   const BODY_SEGMENT_SEPARATION = 140;

   const childConfigs: Array<ChildConfigAttachInfo> = [];
   
   const transformComponent = new TransformComponent();

   const body1Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_1]);
   addHitboxToTransformComponent(transformComponent, body1Hitbox);

   const headOffset = new Point(0, 60);
   const headHitbox = new Hitbox(transformComponent, body1Hitbox, true, new CircularBox(x + headOffset.x, y + headOffset.y, headOffset.x, headOffset.y, 0, 28), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETI_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Head mandibles
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
         const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.2, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_MEDIUM]);
         mandibleHitbox.box.flipX = sideIsFlipped;
         // @Hack
         mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
         mandibleHitbox.box.pivotX = -0.5;
         mandibleHitbox.box.pivotY = -0.5;
         mandibleHitbox.box.pivotType = PivotPointType.normalised;
         addHitboxToTransformComponent(transformComponent, mandibleHitbox);
      }
   }

   const body2Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body2OffsetRotated = rotatePoint(body2Offset, angle);
   const body2Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x + body2OffsetRotated.x, y + body2OffsetRotated.y, body2Offset.x, body2Offset.y, 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_2]);
   addHitboxToTransformComponent(transformComponent, body2Hitbox);

   // Cow's seeker head
   {
      const seekerOffset = new Point(52, 52);
      const seekerOffsetRotated = rotatePoint(seekerOffset, angle);
      const seekerHeadConfig = createInguYetuksnoglurblidokowfleaSeekerHeadConfig(body2Hitbox.box.posX + seekerOffsetRotated.x, body2Hitbox.box.posY + seekerOffsetRotated.y, angle, seekerOffset.x, seekerOffset.y, true, 26);
      childConfigs.push({
         entityConfig: seekerHeadConfig,
         attachedHitbox: getConfigTransformComponent(seekerHeadConfig.components).hitboxes[0],
         parentHitbox: body2Hitbox,
         isPartOfParent: true
      });
   }
   
   const body3Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body3OffsetRotated = rotatePoint(body3Offset, angle);
   const body3Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body2Hitbox.box.posX + body3OffsetRotated.x, body2Hitbox.box.posY + body3OffsetRotated.y, 0, 0, 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_3]);
   addHitboxToTransformComponent(transformComponent, body3Hitbox);

   // Tukmok's seeker head
   {
      const seekerOffset = new Point(-52, 52);
      const seekerOffsetRotated = rotatePoint(seekerOffset, angle);
      const tukmokHeadConfig = createInguYetuksnoglurblidokowfleaSeekerHeadConfig(body3Hitbox.box.posX + seekerOffsetRotated.x, body3Hitbox.box.posY + seekerOffsetRotated.y, angle, seekerOffset.x, seekerOffset.y, false, 44);
      childConfigs.push({
         entityConfig: tukmokHeadConfig,
         attachedHitbox: getConfigTransformComponent(tukmokHeadConfig.components).hitboxes[0],
         parentHitbox: body3Hitbox,
         isPartOfParent: true
      });
   }
   
   const body4Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body4OffsetRotated = rotatePoint(body4Offset, angle);
   const body4Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body3Hitbox.box.posX + body4OffsetRotated.x, body3Hitbox.box.posY + body4OffsetRotated.y, 0, 0, 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_4]);
   addHitboxToTransformComponent(transformComponent, body4Hitbox);

   // Snobe tail
   const snobeTailOffset = new Point(0, -66);
   const snobeTailOffsetRotated = rotatePoint(snobeTailOffset, angle);
   const snobeTailHitbox = new Hitbox(transformComponent, body4Hitbox, true, new CircularBox(body4Hitbox.box.posX + snobeTailOffsetRotated.x, body4Hitbox.box.posY + snobeTailOffsetRotated.y, snobeTailOffset.x, snobeTailOffset.y, 0, 30), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_SNOBE_TAIL]);
   addHitboxToTransformComponent(transformComponent, snobeTailHitbox);

   let tailConfig!: EntityConfig;
   
   // Tail
   const NUM_TAIL_SEGMENTS = 32;
   const IDEAL_TAIL_SEGMENT_SEPARATION = 5;
   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < NUM_TAIL_SEGMENTS; i++) {
      let hitboxPosition: Point;
      let offset: Point;
      let parent: Hitbox | null;
      if (lastHitbox === null) {
         offset = new Point(0, -30);
         hitboxPosition = new Point(x, y);
         hitboxPosition.add(polarVec2(38, angle + Math.PI));
         parent = snobeTailHitbox;
      } else {
         offset = new Point(0, 0);
         hitboxPosition = new Point(lastHitbox.box.posX, lastHitbox.box.posY);
         hitboxPosition.add(polarVec2(IDEAL_TAIL_SEGMENT_SEPARATION, angle + Math.PI));
         parent = null;
      }

      let radius: number;
      let mass: number;
      let flags: Array<HitboxFlag>;
      if (i <= (NUM_TAIL_SEGMENTS - 1) / 3) {
         radius = 12;
         mass = 0.1;
         flags = [HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_BIG];
      } else if (i <= (NUM_TAIL_SEGMENTS - 1) / 3 * 2) {
         radius = 10;
         mass = 0.075;
         flags = [HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_MEDIUM];
      } else if (i < NUM_TAIL_SEGMENTS - 1) {
         radius = 8;
         mass = 0.05;
         flags = [HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_SMALL];
      } else {
         radius = 18;
         mass = 0.28;
         flags = [HitboxFlag.TUKMOK_TAIL_CLUB];
      }
      
      // The club segment gets its own entity, all others go directly on the tukmok
      let hitbox: Hitbox;
      if (i === NUM_TAIL_SEGMENTS - 1) {
         const config = createTukmokTailClubConfig(hitboxPosition.x, hitboxPosition.y, 0, offset.x, offset.y);
         hitbox = getConfigTransformComponent(config.components).hitboxes[0];
         tailConfig = config;
      } else {
         hitbox = new Hitbox(transformComponent, parent, true, new CircularBox(hitboxPosition.x, hitboxPosition.y, offset.x, offset.y, 0, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, flags);
         addHitboxToTransformComponent(transformComponent, hitbox);
      }

      if (lastHitbox !== null) {
         tetherHitboxes(hitbox, lastHitbox, IDEAL_TAIL_SEGMENT_SEPARATION, 50, 0.3);

         const lerpAmount = i / (NUM_TAIL_SEGMENTS - 1);
         // @Hack: method of adding
         hitbox.angularTethers.push({
            originHitbox: lastHitbox,
            idealAngle: Math.PI,
            springConstant: lerp(100, 35, lerpAmount),
            damping: 0.5,
            // start off stiff, get softer the further we go
            padding: lerp(Math.PI * 0.012, Math.PI * 0.04, lerpAmount),
            idealHitboxAngleOffset: Math.PI,
            useLeverage: false
         });
      }

      lastHitbox = hitbox;
   }
   
   const mainBodySegments = [body1Hitbox, body2Hitbox, body3Hitbox, body4Hitbox];

   // Dustflea dispension ports
   for (const bodySegmentHitbox of mainBodySegments) {
      for (let i = 0; i < 2; i++) {
         const offset = new Point(46 * (i === 0 ? 1 : -1), -46);
         const offsetRotated = rotatePoint(offset, angle);
         const hitbox = new Hitbox(transformComponent, bodySegmentHitbox, true, new CircularBox(bodySegmentHitbox.box.posX + offsetRotated.x, bodySegmentHitbox.box.posY + offsetRotated.y, offset.x, offset.y, i === 0 ? Math.PI * -0.25 : Math.PI * 0.25, 28), 0.3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_DUSTFLEA_DISPENSION_PORT]);
         addHitboxToTransformComponent(transformComponent, hitbox);
      }
   }
   
   for (let i = 0; i < mainBodySegments.length - 1; i++) {
      const bodySegment = mainBodySegments[i];
      const nextBodySegment = mainBodySegments[i + 1];

      // Make a glurb segment!
      const offset = new Point(0, -BODY_SEGMENT_SEPARATION * 0.5);
      const offsetRotated = rotatePoint(offset, angle);
      const glurbSegmentHitbox = new Hitbox(transformComponent, null, true, new CircularBox(bodySegment.box.posX + offsetRotated.x, bodySegment.box.posY + offsetRotated.y, 0, 0, angle, 28), 0.8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_GLURB_SEGMENT]);
      addHitboxToTransformComponent(transformComponent, glurbSegmentHitbox);

      const idealDist = BODY_SEGMENT_SEPARATION * 0.5;
      
      // Tethers
      tetherHitboxes(glurbSegmentHitbox, bodySegment, idealDist, 1000, 2);
      // @Hack: method of adding
      glurbSegmentHitbox.angularTethers.push({
         originHitbox: bodySegment,
         idealAngle: 0,
         springConstant: 150,
         damping: 0.85,
         padding: Math.PI * 0.1,
         idealHitboxAngleOffset: 0,
         useLeverage: false
      });
      tetherHitboxes(nextBodySegment, glurbSegmentHitbox, idealDist, 1000, 2);
      // @Hack: method of adding
      nextBodySegment.angularTethers.push({
         originHitbox: glurbSegmentHitbox,
         idealAngle: Math.PI,
         springConstant: 150,
         damping: 0.85,
         padding: Math.PI * 0.1,
         idealHitboxAngleOffset: Math.PI,
         useLeverage: false
      });
   }

   // Create claws on each body segment
   for (const bodySegment of mainBodySegments) {
      for (let i = 0; i < 2; i++) {
         const sideIsFlipped = i === 1;
         const clawConfig = createOkrenClawConfig(bodySegment.box.posX, bodySegment.box.posY, 0, OkrenAgeStage.youth, OkrenClawGrowthStage.FOUR, sideIsFlipped);

         const clawTransformComponent = getConfigTransformComponent(clawConfig.components);
         // @HACK
         clawTransformComponent.hitboxes[0].box.offsetX = 40;
         clawTransformComponent.hitboxes[0].box.offsetY = 40;
         childConfigs.push({
            entityConfig: clawConfig,
            attachedHitbox: clawTransformComponent.hitboxes[0],
            parentHitbox: bodySegment,
            isPartOfParent: true
         });
      }
   }
   
   const healthComponent = new HealthComponent(1000);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(body1Hitbox, 900, moveFunc, turnFunc);

   const inguYetuksnoglurblidokowfleaComponent = new InguYetuksnoglurblidokowfleaComponent();
   
   return [{
      entityType: EntityType.inguYetuksnoglurblidokowflea,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         inguYetuksnoglurblidokowfleaComponent
      ],
      lights: [],
      childConfigs: childConfigs,
   },tailConfig];
}