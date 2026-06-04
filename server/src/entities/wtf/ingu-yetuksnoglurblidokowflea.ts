import { HitboxTag, createCircularBox, HitboxCollisionType, createRectangularBox, setBoxFlipX, setBoxPivotType, PivotPointType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { Entity, EntityType } from "../../../../shared/dist/entities.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { angle, polarVec2, Point, getAbsAngleDiff, rotatePoint, lerp } from "../../../../shared/dist/utils.js";
import { ChildConfigAttachInfo, EntityConfig, getConfigTransformComponent } from "../../components.js";
import { AIHelperComponent } from "../../components/AIHelperComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { InguYetuksnoglurblidokowfleaComponent } from "../../components/InguYetuksnoglurblidokowfleaComponent.js";
import { OkrenClawGrowthStage } from "../../components/OkrenClawComponent.js";
import { OkrenAgeStage } from "../../components/OkrenComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent.js";
import { applyAccelerationFromGround, createHitbox, getHitboxTag, Hitbox, setHitboxTag, turnHitboxToAngle } from "../../hitboxes.js";
import { addHitboxAngularTether, tetherHitboxes } from "../../tethers.js";
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
      const tag = getHitboxTag(hitbox);
      if (tag === HitboxTag.yetukBody1 || tag === HitboxTag.yetukBody2 || tag === HitboxTag.yetukBody3 || tag === HitboxTag.yetukGlurbSegment) {
         let moveDir: number;
         if (i === 0) {
            moveDir = hitbox.box.angle;
         } else {
            const previousHitbox = transformComponent.hitboxes[i - 1] as Hitbox;
            moveDir = angle(previousHitbox.box.posX - hitbox.box.posX, previousHitbox.box.posY - hitbox.box.posY);
         }
         
         const isHeadHitbox = tag === HitboxTag.yetukBody1;
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

   const body1Hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(body1Hitbox, HitboxTag.yetukBody1);
   addHitboxToTransformComponent(transformComponent, body1Hitbox);

   const headOffset = new Point(0, 60);
   const headHitbox = createHitbox(transformComponent, body1Hitbox, createCircularBox(x + headOffset.x, y + headOffset.y, headOffset.x, headOffset.y, 0, 28), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(headHitbox, HitboxTag.yetiHead);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Head mandibles
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
         const mandibleHitbox = createHitbox(transformComponent, headHitbox, createRectangularBox(headHitbox.box.posX + mandibleOffset.x, headHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.2, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
         setHitboxTag(mandibleHitbox, HitboxTag.yetukMandibleMedium);
         setBoxFlipX(mandibleHitbox.box, sideIsFlipped);
         mandibleHitbox.box.pivotX = -0.5;
         mandibleHitbox.box.pivotY = -0.5;
         setBoxPivotType(mandibleHitbox.box, PivotPointType.normalised);
         addHitboxToTransformComponent(transformComponent, mandibleHitbox);
      }
   }

   const body2Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body2OffsetRotated = rotatePoint(body2Offset, angle);
   const body2Hitbox = createHitbox(transformComponent, null, createCircularBox(x + body2OffsetRotated.x, y + body2OffsetRotated.y, body2Offset.x, body2Offset.y, 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(body2Hitbox, HitboxTag.yetukBody2);
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
   const body3Hitbox = createHitbox(transformComponent, null, createCircularBox(body2Hitbox.box.posX + body3OffsetRotated.x, body2Hitbox.box.posY + body3OffsetRotated.y, 0, 0, 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(body3Hitbox, HitboxTag.yetukBody3);
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
   const body4Hitbox = createHitbox(transformComponent, null, createCircularBox(body3Hitbox.box.posX + body4OffsetRotated.x, body3Hitbox.box.posY + body4OffsetRotated.y, 0, 0, 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(body4Hitbox, HitboxTag.yetukBody4);
   addHitboxToTransformComponent(transformComponent, body4Hitbox);

   // Snobe tail
   const snobeTailOffset = new Point(0, -66);
   const snobeTailOffsetRotated = rotatePoint(snobeTailOffset, angle);
   const snobeTailHitbox = createHitbox(transformComponent, body4Hitbox, createCircularBox(body4Hitbox.box.posX + snobeTailOffsetRotated.x, body4Hitbox.box.posY + snobeTailOffsetRotated.y, snobeTailOffset.x, snobeTailOffset.y, 0, 30), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(snobeTailHitbox, HitboxTag.yetukSnobeTail);
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
      let tag: HitboxTag;
      if (i <= (NUM_TAIL_SEGMENTS - 1) / 3) {
         radius = 12;
         mass = 0.1;
         tag = HitboxTag.tukmokTailMiddleSegmentBig;
      } else if (i <= (NUM_TAIL_SEGMENTS - 1) / 3 * 2) {
         radius = 10;
         mass = 0.075;
         tag = HitboxTag.tukmokTailMiddleSegmentMedium;
      } else if (i < NUM_TAIL_SEGMENTS - 1) {
         radius = 8;
         mass = 0.05;
         tag = HitboxTag.tukmokTailMiddleSegmentSmall;
      } else {
         radius = 18;
         mass = 0.28;
         tag = HitboxTag.tukmokTailClub;
      }
      
      // The club segment gets its own entity, all others go directly on the tukmok
      let hitbox: Hitbox;
      if (i === NUM_TAIL_SEGMENTS - 1) {
         const config = createTukmokTailClubConfig(hitboxPosition.x, hitboxPosition.y, 0, offset.x, offset.y);
         hitbox = getConfigTransformComponent(config.components).hitboxes[0];
         tailConfig = config;
      } else {
         hitbox = createHitbox(transformComponent, parent, createCircularBox(hitboxPosition.x, hitboxPosition.y, offset.x, offset.y, 0, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
         setHitboxTag(hitbox, tag);
         addHitboxToTransformComponent(transformComponent, hitbox);
      }

      if (lastHitbox !== null) {
         tetherHitboxes(hitbox, lastHitbox, IDEAL_TAIL_SEGMENT_SEPARATION, 50, 0.3);

         const lerpAmount = i / (NUM_TAIL_SEGMENTS - 1);
         // @Hack: method of adding
         addHitboxAngularTether(hitbox, {
            hitbox: hitbox,
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
         const hitbox = createHitbox(transformComponent, bodySegmentHitbox, createCircularBox(bodySegmentHitbox.box.posX + offsetRotated.x, bodySegmentHitbox.box.posY + offsetRotated.y, offset.x, offset.y, i === 0 ? Math.PI * -0.25 : Math.PI * 0.25, 28), 0.3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
         setHitboxTag(hitbox, HitboxTag.yetukDustfleaDispensionPort)
         addHitboxToTransformComponent(transformComponent, hitbox);
      }
   }
   
   for (let i = 0; i < mainBodySegments.length - 1; i++) {
      const bodySegment = mainBodySegments[i];
      const nextBodySegment = mainBodySegments[i + 1];

      // Make a glurb segment!
      const offset = new Point(0, -BODY_SEGMENT_SEPARATION * 0.5);
      const offsetRotated = rotatePoint(offset, angle);
      const glurbSegmentHitbox = createHitbox(transformComponent, null, createCircularBox(bodySegment.box.posX + offsetRotated.x, bodySegment.box.posY + offsetRotated.y, 0, 0, angle, 28), 0.8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxTag(glurbSegmentHitbox, HitboxTag.yetukGlurbSegment)
      addHitboxToTransformComponent(transformComponent, glurbSegmentHitbox);

      const idealDist = BODY_SEGMENT_SEPARATION * 0.5;
      
      // Tethers
      tetherHitboxes(glurbSegmentHitbox, bodySegment, idealDist, 1000, 2);
      // @Hack: method of adding
      addHitboxAngularTether(glurbSegmentHitbox, {
         hitbox: glurbSegmentHitbox,
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
      addHitboxAngularTether(nextBodySegment, {
         hitbox: nextBodySegment,
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