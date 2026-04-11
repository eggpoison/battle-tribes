import { createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { Settings } from "../../../../shared/src/settings";
import { getAbsAngleDiff, lerp, Point, polarVec2, rotatePoint } from "../../../../shared/src/utils";
import { ChildConfigAttachInfo, EntityConfig, getConfigTransformComponent } from "../../components";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { InguYetuksnoglurblidokowfleaComponent } from "../../components/InguYetuksnoglurblidokowfleaComponent";
import { OkrenClawGrowthStage } from "../../components/OkrenClawComponent";
import { OkrenAgeStage } from "../../components/OkrenComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { applyAccelerationFromGround, Hitbox, turnHitboxToAngle } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";
import { getEntityAgeTicks } from "../../world";
import { createOkrenClawConfig } from "../desert/okren-claw";
import { createTukmokTailClubConfig } from "../tundra/tukmok-tail-club";
import { createInguYetuksnoglurblidokowfleaSeekerHeadConfig } from "./ingu-yetuksnoglurblidokowflea-seeker-head";

const moveFunc = (inguYetu: Entity, pos: Point, accelerationMagnitude: number): void => {
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
            moveDir = hitbox.box.position.angleTo(previousHitbox.box.position);
         }
         
         const isHeadHitbox = hitbox.flags.includes(HitboxFlag.YETUK_BODY_1);
         const acc = accelerationMagnitude * (isHeadHitbox ? 1.2 : 0.6) * 0.5;
         const connectingVel = polarVec2(acc, moveDir);

         // const dirToTarget = hitbox.box.position.angleTo(targetHitbox.box.position);
         const dirToTarget = hitbox.box.position.angleTo(pos);
         const velToTarget = polarVec2(accelerationMagnitude * (isHeadHitbox ? 1.2 : 0.6) * 0.5, dirToTarget);

         applyAccelerationFromGround(hitbox, new Point(connectingVel.x + velToTarget.x, connectingVel.y + velToTarget.y));
      }
   }
}

const turnFunc = (inguYetu: Entity, _pos: Point, turnSpeed: number, turnDamping: number): void => {
   // @HACKKK!!!!
   // const targetEntity = PlayerComponentArray.activeEntities[0];
   // const targetTransformComponent = TransformComponentArray.getComponent(targetEntity);
   // const targetHitbox = targetTransformComponent.hitboxes[0];

   // const pos = predictHitboxPos(targetHitbox, 0.3);
   const pos = _pos;

   const transformComponent = TransformComponentArray.getComponent(inguYetu);
   const headHitbox = transformComponent.rootHitboxes[0];

   const targetDirection = headHitbox.box.position.angleTo(pos);

   const absDiff = getAbsAngleDiff(headHitbox.box.angle, targetDirection);
   const angleDiffStopWiggle = 0.85;
   const wiggleMultiplier = 1 - Math.pow(Math.min(absDiff, angleDiffStopWiggle) / angleDiffStopWiggle, 2);
   
   // const idealAngle = targetDirection + Math.PI * 0.45 * Math.sin(getEntityAgeTicks(serpent) * Settings.DT_S * 7) * wiggleMultiplier;
   const idealAngle = targetDirection + Math.PI * 0.45 * Math.sin(getEntityAgeTicks(inguYetu) * Settings.DT_S * 7);
   turnHitboxToAngle(headHitbox, idealAngle, turnSpeed, turnDamping, false);
}

export function createInguYetuksnoglurblidokowfleaConfig(position: Point, angle: number): ReadonlyArray<EntityConfig> {
   const BODY_SEGMENT_SEPARATION = 140;

   const childConfigs = new Array<ChildConfigAttachInfo>();
   
   const transformComponent = new TransformComponent();

   const body1Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_1]);
   addHitboxToTransformComponent(transformComponent, body1Hitbox);

   const headOffset = new Point(0, 60);
   const headPosition = position.copy();
   headPosition.add(headOffset);
   const headHitbox = new Hitbox(transformComponent, body1Hitbox, true, new CircularBox(headPosition, headOffset, 0, 28), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETI_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Head mandibles
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
         const mandibleHitbox = new Hitbox(transformComponent, headHitbox, true, new RectangularBox(mandiblePosition, mandibleOffset, Math.PI * 0.2, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_MANDIBLE_MEDIUM]);
         mandibleHitbox.box.flipX = sideIsFlipped;
         // @Hack
         mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
         mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
         addHitboxToTransformComponent(transformComponent, mandibleHitbox);
      }
   }

   const body2Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body2Position = position.copy();
   body2Position.add(rotatePoint(body2Offset, angle));
   const body2Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body2Position, new Point(0, 0), 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_2]);
   addHitboxToTransformComponent(transformComponent, body2Hitbox);

   // Cow's seeker head
   {
      const seekerOffset = new Point(52, 52);
      const trunkPosition = body2Hitbox.box.position.copy();
      trunkPosition.add(rotatePoint(seekerOffset, angle));
      const seekerHeadConfig = createInguYetuksnoglurblidokowfleaSeekerHeadConfig(trunkPosition, angle, seekerOffset, true, 26);
      childConfigs.push({
         entityConfig: seekerHeadConfig,
         attachedHitbox: getConfigTransformComponent(seekerHeadConfig.components).hitboxes[0],
         parentHitbox: body2Hitbox,
         isPartOfParent: true
      });
   }
   
   const body3Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body3Position = body2Position.copy();
   body3Position.add(rotatePoint(body3Offset, angle));
   const body3Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body3Position, new Point(0, 0), 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_3]);
   addHitboxToTransformComponent(transformComponent, body3Hitbox);

   // Tukmok's seeker head
   {
      const seekerOffset = new Point(-52, 52);
      const trunkPosition = body3Hitbox.box.position.copy();
      trunkPosition.add(rotatePoint(seekerOffset, angle));
      const tukmokHeadConfig = createInguYetuksnoglurblidokowfleaSeekerHeadConfig(trunkPosition, angle, seekerOffset, false, 44);
      childConfigs.push({
         entityConfig: tukmokHeadConfig,
         attachedHitbox: getConfigTransformComponent(tukmokHeadConfig.components).hitboxes[0],
         parentHitbox: body3Hitbox,
         isPartOfParent: true
      });
   }
   
   const body4Offset = new Point(0, -BODY_SEGMENT_SEPARATION);
   const body4Position = body3Position.copy();
   body4Position.add(rotatePoint(body4Offset, angle));
   const body4Hitbox = new Hitbox(transformComponent, null, true, new CircularBox(body4Position, new Point(0, 0), 0, 60), 6, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_BODY_4]);
   addHitboxToTransformComponent(transformComponent, body4Hitbox);

   // Snobe tail
   const snobeTailOffset = new Point(0, -66);
   const snobeTailPosition = body4Position.copy();
   snobeTailPosition.add(rotatePoint(snobeTailOffset, angle));
   const snobeTailHitbox = new Hitbox(transformComponent, body4Hitbox, true, new CircularBox(snobeTailPosition, snobeTailOffset, 0, 30), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_SNOBE_TAIL]);
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
         hitboxPosition = position.copy();
         hitboxPosition.add(polarVec2(38, angle + Math.PI));
         parent = snobeTailHitbox;
      } else {
         offset = new Point(0, 0);
         hitboxPosition = lastHitbox.box.position.copy();
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
         const config = createTukmokTailClubConfig(hitboxPosition, 0, offset);
         hitbox = getConfigTransformComponent(config.components).hitboxes[0];
         tailConfig = config;
      } else {
         hitbox = new Hitbox(transformComponent, parent, true, new CircularBox(hitboxPosition, offset, 0, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, flags);
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
         const hitboxPosition = bodySegmentHitbox.box.position.copy();
         hitboxPosition.add(rotatePoint(offset, angle));
         const hitbox = new Hitbox(transformComponent, bodySegmentHitbox, true, new CircularBox(hitboxPosition, offset, i === 0 ? Math.PI * -0.25 : Math.PI * 0.25, 28), 0.3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_DUSTFLEA_DISPENSION_PORT]);
         addHitboxToTransformComponent(transformComponent, hitbox);
      }
   }
   
   for (let i = 0; i < mainBodySegments.length - 1; i++) {
      const bodySegment = mainBodySegments[i];
      const nextBodySegment = mainBodySegments[i + 1];

      // Make a glurb segment!
      const offset = new Point(0, -BODY_SEGMENT_SEPARATION * 0.5);
      const glurbSegmentPosition = bodySegment.box.position.copy();
      glurbSegmentPosition.add(rotatePoint(offset, angle));
      const glurbSegmentHitbox = new Hitbox(transformComponent, null, true, new CircularBox(glurbSegmentPosition, new Point(0, 0), angle, 28), 0.8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETUK_GLURB_SEGMENT]);
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
         const clawConfig = createOkrenClawConfig(bodySegment.box.position.copy(), 0, OkrenAgeStage.youth, OkrenClawGrowthStage.FOUR, sideIsFlipped);

         const clawTransformComponent = getConfigTransformComponent(clawConfig.components);
         // @HACK
         clawTransformComponent.hitboxes[0].box.offset.x = 40;
         clawTransformComponent.hitboxes[0].box.offset.y = 40;
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