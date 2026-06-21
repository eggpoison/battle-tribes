import { Biome } from "../../../../shared/dist/biomes.js";
import { createRectangularBox, HitboxCollisionType, HitboxTag, createCircularBox } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { getTamingSkill, TamingSkillID } from "../../../../shared/dist/taming.js";
import { randInt, angle, lerp, polarVec2, distance, Point, rotatePoint } from "../../../../shared/dist/utils.js";
import { findAngleAlignment } from "../../ai-shared.js";
import WanderAI from "../../ai/WanderAI.js";
import { ChildConfigAttachInfo, EntityConfig, getConfigTransformComponent } from "../../components.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent.js";
import { EnergyStomachComponent } from "../../components/EnergyStomachComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { createCarrySlot, RideableComponent } from "../../components/RideableComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { TamingComponent } from "../../components/TamingComponent.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent.js";
import { TukmokComponent } from "../../components/TukmokComponent.js";
import { applyAcceleration, applyAccelerationFromGround, createHitbox, Hitbox, setHitboxTag, turnHitboxToAngle } from "../../hitboxes.js";
import Layer from "../../Layer.js";
import { registerEntityTamingSpec } from "../../taming-specs.js";
import { addHitboxAngularTether, tetherHitboxes } from "../../tethers.js";
import { createTukmokSpurConfig } from "./tukmok-spur.js";
import { createTukmokTailClubConfig } from "./tukmok-tail-club.js";
import { createTukmokTrunkConfig } from "./tukmok-trunk.js";

const NUM_TAIL_SEGMENTS = 12;

registerEntityLootOnDeath(EntityType.tukmok, {
   itemType: ItemType.rawTukmokMeat,
   getAmount: () => randInt(25, 36)
});
registerEntityLootOnDeath(EntityType.tukmok, {
   itemType: ItemType.tukmokFurHide,
   getAmount: () => randInt(9, 15)
});
registerEntityLootOnDeath(EntityType.tukmok, {
   itemType: ItemType.ivoryTusk,
   getAmount: () => Math.random() < 2/3 ? 1 : 0
});

registerEntityTamingSpec(EntityType.tukmok, {
   maxTamingTier: 3,
   skillNodes: [
      {
         skill: getTamingSkill(TamingSkillID.follow),
         x: 0,
         y: 10,
         parent: null,
         requiredTamingTier: 1
      },
      {
         skill: getTamingSkill(TamingSkillID.move),
         x: 0,
         y: 30,
         parent: TamingSkillID.follow,
         requiredTamingTier: 2
      },
      {
         skill: getTamingSkill(TamingSkillID.carry),
         x: 18,
         y: 50,
         parent: TamingSkillID.move,
         requiredTamingTier: 3
      },
      {
         skill: getTamingSkill(TamingSkillID.attack),
         x: -18,
         y: 50,
         parent: TamingSkillID.move,
         requiredTamingTier: 3
      }
   ],
   foodItemType: ItemType.leaf,
   tierFoodRequirements: {
      0: 0,
      1: 15,
      2: 40,
      3: 100
   }
});

const moveFunc = (tukmok: Entity, x: number, y: number, acceleration: number): void => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const bodyHitbox = transformComponent.hitboxes[0];

   const bodyToTargetDirection = angle(x - bodyHitbox.box.posX, y - bodyHitbox.box.posY);

   // Move whole cow to the target
   const alignmentToTarget = findAngleAlignment(bodyHitbox.box.angle, bodyToTargetDirection);
   const accelerationMultiplier = lerp(0.3, 1, alignmentToTarget);
   applyAccelerationFromGround(bodyHitbox, polarVec2(acceleration * accelerationMultiplier, bodyToTargetDirection));
   
   // Move head to the target
   const headHitbox = transformComponent.hitboxes[1] as Hitbox;
   const headToTargetDirection = angle(x - headHitbox.box.posX, y - headHitbox.box.posY);
   // @Hack?
   const headForce = acceleration * 1.2;
   applyAcceleration(headHitbox, headForce * Math.sin(headToTargetDirection), headForce * Math.cos(headToTargetDirection));
}

const turnFunc = (tukmok: Entity, x: number, y: number, turnSpeed: number, damping: number): void => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const bodyHitbox = transformComponent.hitboxes[0];

   const bodyToTargetDirection = angle(x - bodyHitbox.box.posX, y - bodyHitbox.box.posY);
   turnHitboxToAngle(bodyHitbox, bodyToTargetDirection, 0.5 * Math.PI, 1.2, false);
   
   const headHitbox = transformComponent.hitboxes[1] as Hitbox;
   const headToTargetDirection = angle(x - headHitbox.box.posX, y - headHitbox.box.posY);
   turnHitboxToAngle(headHitbox, headToTargetDirection, 1.5 * Math.PI, 1, false);
}

function wanderPositionIsValid(tukmok: Entity, layer: Layer, x: number, y: number): boolean {
   // Only wander if its far enough away
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const bodyHitbox = transformComponent.hitboxes[0];
   const dist = distance(bodyHitbox.box.posX, bodyHitbox.box.posY, x, y);
   if (dist < 300) {
      return false;
   }
   
   const biome = layer.getBiomeAtPosition(x, y);
   return biome === Biome.tundra;
}

export function createTukmokConfig(x: number, y: number, angle: number): readonly EntityConfig[] {
   const entityConfigs: EntityConfig[] = [];
   
   const transformComponent = new TransformComponent();

   const bodyHitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 104, 176), 8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(bodyHitbox, HitboxTag.tukmokBody);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const idealHeadDist = 108;

   const headOffset = new Point(0, idealHeadDist);
   const headOffsetRotated = rotatePoint(headOffset, angle);
   const headHitbox = createHitbox(transformComponent, null, createCircularBox(x + headOffsetRotated.x, y + headOffsetRotated.y, headOffset.x, headOffset.y, 0, 40), 3.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(headHitbox, HitboxTag.tukmokHead);
   headHitbox.box.pivotY = -20;
   addHitboxToTransformComponent(transformComponent, headHitbox);

   tetherHitboxes(headHitbox, bodyHitbox, idealHeadDist, 400, 1.8);
   addHitboxAngularTether(headHitbox, {
      hitbox: headHitbox,
      originHitbox: bodyHitbox,
      idealAngle: 0,
      // @CLEANUP is it ok that this is so large???
      springConstant: 50000,
      damping: 0.4,
      padding: Math.PI * 0.05,
      idealHitboxAngleOffset: 0,
      useLeverage: false
   });
   
   // 
   // Children
   // 

   const childConfigs: ChildConfigAttachInfo[] = [];

   // Head spurs
   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 0;
      
      const offset = new Point(38, 58);
      // @Hack
      const _offset = new Point(offset.x * (sideIsFlipped ? -1 : 1), offset.y);
      const offsetRotated = rotatePoint(_offset, angle);
      const trunkConfig = createTukmokSpurConfig(x + offsetRotated.x, y + offsetRotated.y, 0, offset.x, offset.y, 0.75, HitboxTag.tukmokSpurHead, sideIsFlipped);
      childConfigs.push({
         entityConfig: trunkConfig,
         attachedHitbox: getConfigTransformComponent(trunkConfig.components).hitboxes[0],
         parentHitbox: headHitbox,
         isPartOfParent: true
      });
   }

   const shoulderSpurLeftFrontOffset = new Point(-58, 92);
   const shoulderSpurLeftFrontOffsetRotated = rotatePoint(shoulderSpurLeftFrontOffset, angle);
   const shoulderSpurLeftFrontConfig = createTukmokSpurConfig(x + shoulderSpurLeftFrontOffsetRotated.x, y + shoulderSpurLeftFrontOffsetRotated.y, -Math.PI * 0.05, shoulderSpurLeftFrontOffset.x, shoulderSpurLeftFrontOffset.y, 0.2, HitboxTag.tukmokSpurShoulderLeftFront, false);
   childConfigs.push({
      entityConfig: shoulderSpurLeftFrontConfig,
      attachedHitbox: getConfigTransformComponent(shoulderSpurLeftFrontConfig.components).hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const shoulderSpurLeftBackOffset = new Point(-70, 76);
   const shoulderSpurLeftBackOffsetRotated = rotatePoint(shoulderSpurLeftBackOffset, angle);
   const shoulderSpurLeftBackConfig = createTukmokSpurConfig(x + shoulderSpurLeftBackOffsetRotated.x, y + shoulderSpurLeftBackOffsetRotated.y, 0, shoulderSpurLeftBackOffset.x, shoulderSpurLeftBackOffset.y, 0.2, HitboxTag.tukmokSpurShoulderLeftBack, false);
   childConfigs.push({
      entityConfig: shoulderSpurLeftBackConfig,
      attachedHitbox: getConfigTransformComponent(shoulderSpurLeftBackConfig.components).hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const shoulderSpurRightFrontOffset = new Point(56, 80);
   const shoulderSpurRightFrontOffsetRotated = rotatePoint(shoulderSpurRightFrontOffset, angle);
   const shoulderSpurRightFrontConfig = createTukmokSpurConfig(x + shoulderSpurRightFrontOffsetRotated.x, y + shoulderSpurRightFrontOffsetRotated.y, -Math.PI * 0.04, shoulderSpurRightFrontOffset.x, shoulderSpurRightFrontOffset.y, 0.2, HitboxTag.tukmokSpurShoulderRightFront, false);
   childConfigs.push({
      entityConfig: shoulderSpurRightFrontConfig,
      attachedHitbox: getConfigTransformComponent(shoulderSpurRightFrontConfig.components).hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const shoulderSpurRightBackOffset = new Point(68, 62);
   const shoulderSpurRightBackOffsetRotated = rotatePoint(shoulderSpurRightBackOffset, angle);
   const shoulderSpurRightBackConfig = createTukmokSpurConfig(x + shoulderSpurRightBackOffsetRotated.x, y + shoulderSpurRightBackOffsetRotated.y, Math.PI * 0.08, shoulderSpurRightBackOffset.x, shoulderSpurRightBackOffset.y, 0.2, HitboxTag.tukmokSpurShoulderRightBack, false);
   childConfigs.push({
      entityConfig: shoulderSpurRightBackConfig,
      attachedHitbox: getConfigTransformComponent(shoulderSpurRightBackConfig.components).hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const trunkOffset = new Point(0, 40);
   const trunkOffsetRotated = rotatePoint(trunkOffset, angle);
   const trunkConfig = createTukmokTrunkConfig(headHitbox.box.posX + trunkOffsetRotated.x, headHitbox.box.posY + trunkOffsetRotated.y, angle, trunkOffset.x, trunkOffset.y);
   childConfigs.push({
      entityConfig: trunkConfig,
      attachedHitbox: getConfigTransformComponent(trunkConfig.components).hitboxes[0],
      parentHitbox: headHitbox,
      isPartOfParent: true
   });

   
   // Tail
   const IDEAL_TAIL_SEGMENT_SEPARATION = 5;
   let lastHitbox: Hitbox | null = null;
   for (let i = 0; i < NUM_TAIL_SEGMENTS; i++) {
      let hitboxPosition: Point;
      let offset: Point;
      let parent: Hitbox | null;
      if (lastHitbox === null) {
         offset = new Point(0, -102);
         hitboxPosition = new Point(x, y);
         hitboxPosition.add(polarVec2(102, angle + Math.PI));
         parent = bodyHitbox;
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
         entityConfigs.push(config);
      } else {
         hitbox = createHitbox(transformComponent, parent, createCircularBox(hitboxPosition.x, hitboxPosition.y, offset.x, offset.y, 0, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
         setHitboxTag(hitbox, tag);
         addHitboxToTransformComponent(transformComponent, hitbox);
      }

      if (lastHitbox !== null) {
         tetherHitboxes(hitbox, lastHitbox, IDEAL_TAIL_SEGMENT_SEPARATION, 50, 0.3);

         const lerpAmount = i / (NUM_TAIL_SEGMENTS - 1);
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

   const healthComponent = new HealthComponent(250);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(headHitbox, 666, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(400, 1 * Math.PI, 1, 0.35, wanderPositionIsValid);
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(12 * Settings.TICK_RATE);
   
   const energyStomachComponent = new EnergyStomachComponent(800, 4, 5);
   
   const rideableComponent = new RideableComponent();
   // head carry
   rideableComponent.carrySlots.push(createCarrySlot(headHitbox, new Point(0, -22), new Point(72, 0)));
   // body front carry
   rideableComponent.carrySlots.push(createCarrySlot(bodyHitbox, new Point(0, 28), new Point(84, 0)));
   // body back carry
   rideableComponent.carrySlots.push(createCarrySlot(bodyHitbox, new Point(0, -36), new Point(84, 0)));
   
   const lootComponent = new LootComponent();

   const tamingComponent = new TamingComponent();

   const tukmokComponent = new TukmokComponent();
   
   entityConfigs.push({
      entityType: EntityType.tukmok,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         attackingEntitiesComponent,
         energyStomachComponent,
         rideableComponent,
         lootComponent,
         tamingComponent,
         tukmokComponent
      ],
      lights: [],
      childConfigs: childConfigs
   });
   return entityConfigs;
}