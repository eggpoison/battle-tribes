import { Biome } from "../../../../shared/src/biomes";
import { createAbsolutePivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Settings } from "../../../../shared/src/settings";
import { getTamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { lerp, Point, polarVec2, randInt, rotatePoint } from "../../../../shared/src/utils";
import { findAngleAlignment } from "../../ai-shared";
import WanderAI from "../../ai/WanderAI";
import { ChildConfigAttachInfo, EntityConfig } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { EnergyStomachComponent } from "../../components/EnergyStomachComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { createCarrySlot, RideableComponent } from "../../components/RideableComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TamingComponent } from "../../components/TamingComponent";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { TukmokComponent } from "../../components/TukmokComponent";
import { applyAcceleration, applyAccelerationFromGround, Hitbox, turnHitboxToAngle } from "../../hitboxes";
import Layer from "../../Layer";
import { registerEntityTamingSpec } from "../../taming-specs";
import { tetherHitboxes } from "../../tethers";
import { createTukmokSpurConfig } from "./tukmok-spur";
import { createTukmokTailClubConfig } from "./tukmok-tail-club";
import { createTukmokTrunkConfig } from "./tukmok-trunk";

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

const moveFunc = (tukmok: Entity, pos: Point, acceleration: number): void => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const bodyHitbox = transformComponent.hitboxes[0];

   const bodyToTargetDirection = bodyHitbox.box.position.angleTo(pos);

   // Move whole cow to the target
   const alignmentToTarget = findAngleAlignment(bodyHitbox.box.angle, bodyToTargetDirection);
   const accelerationMultiplier = lerp(0.3, 1, alignmentToTarget);
   applyAccelerationFromGround(bodyHitbox, polarVec2(acceleration * accelerationMultiplier, bodyToTargetDirection));
   
   // Move head to the target
   const headHitbox = transformComponent.hitboxes[1] as Hitbox;
   const headToTargetDirection = headHitbox.box.position.angleTo(pos);
   // @Hack?
   const headForce = acceleration * 1.2;
   applyAcceleration(headHitbox, polarVec2(headForce, headToTargetDirection));
}

const turnFunc = (tukmok: Entity, pos: Point, turnSpeed: number, damping: number): void => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const bodyHitbox = transformComponent.hitboxes[0];

   const bodyToTargetDirection = bodyHitbox.box.position.angleTo(pos);
   turnHitboxToAngle(bodyHitbox, bodyToTargetDirection, 0.5 * Math.PI, 1.2, false);
   
   const headHitbox = transformComponent.hitboxes[1] as Hitbox;
   const headToTargetDirection = headHitbox.box.position.angleTo(pos);
   turnHitboxToAngle(headHitbox, headToTargetDirection, 1.5 * Math.PI, 1, false);
}

function wanderPositionIsValid(tukmok: Entity, layer: Layer, x: number, y: number): boolean {
   // Only wander if its far enough away
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const bodyHitbox = transformComponent.hitboxes[0];
   const dist = bodyHitbox.box.position.distanceTo(new Point(x, y));
   if (dist < 300) {
      return false;
   }
   
   const biome = layer.getBiomeAtPosition(x, y);
   return biome === Biome.tundra;
}

export function createTukmokConfig(position: Point, angle: number): ReadonlyArray<EntityConfig> {
   const entityConfigs = new Array<EntityConfig>();
   
   const transformComponent = new TransformComponent();

   const bodyHitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), angle, 104, 176), 8, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.TUKMOK_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const idealHeadDist = 108;

   const headOffset = new Point(0, idealHeadDist);
   const headPosition = position.copy();
   headPosition.add(rotatePoint(headOffset, angle));
   const headHitbox = new Hitbox(transformComponent, null, true, new CircularBox(headPosition, headOffset, 0, 40), 3.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.TUKMOK_HEAD]);
   headHitbox.box.pivot = createAbsolutePivotPoint(0, -20);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   tetherHitboxes(headHitbox, bodyHitbox, idealHeadDist, 400, 1.8);
   // @Hack: method of adding
   headHitbox.angularTethers.push({
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

   const childConfigs = new Array<ChildConfigAttachInfo>();

   // Head spurs
   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 0;
      
      const offset = new Point(38, 58);
      const spurPosition = position.copy();
      // @Hack
      const _offset = new Point(offset.x * (sideIsFlipped ? -1 : 1), offset.y);
      spurPosition.add(rotatePoint(_offset, angle));
      const trunkConfig = createTukmokSpurConfig(spurPosition, 0, offset, 0.75, HitboxFlag.TUKMOK_SPUR_HEAD, sideIsFlipped);
      childConfigs.push({
         entityConfig: trunkConfig,
         attachedHitbox: trunkConfig.components[ServerComponentType.transform]!.hitboxes[0],
         parentHitbox: headHitbox,
         isPartOfParent: true
      });
   }

   const shoulderSpurLeftFrontOffset = new Point(-58, 92);
   const shoulderSpurLeftFrontPosition = position.copy();
   shoulderSpurLeftFrontPosition.add(rotatePoint(shoulderSpurLeftFrontOffset, angle));
   const shoulderSpurLeftFrontConfig = createTukmokSpurConfig(shoulderSpurLeftFrontPosition, -Math.PI * 0.05, shoulderSpurLeftFrontOffset, 0.2, HitboxFlag.TUKMOK_SPUR_SHOULDER_LEFT_FRONT, false);
   childConfigs.push({
      entityConfig: shoulderSpurLeftFrontConfig,
      attachedHitbox: shoulderSpurLeftFrontConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const shoulderSpurLeftBackOffset = new Point(-70, 76);
   const shoulderSpurLeftBackPosition = position.copy();
   shoulderSpurLeftBackPosition.add(rotatePoint(shoulderSpurLeftBackOffset, angle));
   const shoulderSpurLeftBackConfig = createTukmokSpurConfig(shoulderSpurLeftBackPosition, 0, shoulderSpurLeftBackOffset, 0.2, HitboxFlag.TUKMOK_SPUR_SHOULDER_LEFT_BACK, false);
   childConfigs.push({
      entityConfig: shoulderSpurLeftBackConfig,
      attachedHitbox: shoulderSpurLeftBackConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const shoulderSpurRightFrontOffset = new Point(56, 80);
   const shoulderSpurRightFrontPosition = position.copy();
   shoulderSpurLeftFrontPosition.add(rotatePoint(shoulderSpurRightFrontOffset, angle));
   const shoulderSpurRightFrontConfig = createTukmokSpurConfig(shoulderSpurRightFrontPosition, -Math.PI * 0.04, shoulderSpurRightFrontOffset, 0.2, HitboxFlag.TUKMOK_SPUR_SHOULDER_RIGHT_FRONT, false);
   childConfigs.push({
      entityConfig: shoulderSpurRightFrontConfig,
      attachedHitbox: shoulderSpurRightFrontConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const shoulderSpurRightBackOffset = new Point(68, 62);
   const shoulderSpurRightBackPosition = position.copy();
   shoulderSpurRightBackPosition.add(rotatePoint(shoulderSpurRightBackOffset, angle));
   const shoulderSpurRightBackConfig = createTukmokSpurConfig(shoulderSpurRightBackPosition, Math.PI * 0.08, shoulderSpurRightBackOffset, 0.2, HitboxFlag.TUKMOK_SPUR_SHOULDER_RIGHT_BACK, false);
   childConfigs.push({
      entityConfig: shoulderSpurRightBackConfig,
      attachedHitbox: shoulderSpurRightBackConfig.components[ServerComponentType.transform]!.hitboxes[0],
      parentHitbox: bodyHitbox,
      isPartOfParent: true
   });

   const trunkOffset = new Point(0, 40);
   const trunkPosition = headHitbox.box.position.copy();
   trunkPosition.add(rotatePoint(trunkOffset, angle));
   const trunkConfig = createTukmokTrunkConfig(trunkPosition, angle, trunkOffset);
   childConfigs.push({
      entityConfig: trunkConfig,
      attachedHitbox: trunkConfig.components[ServerComponentType.transform]!.hitboxes[0],
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
         hitboxPosition = position.copy();
         hitboxPosition.add(polarVec2(102, angle + Math.PI));
         parent = bodyHitbox;
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
         hitbox = config.components[ServerComponentType.transform]!.hitboxes[0];
         entityConfigs.push(config);
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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.energyStomach]: energyStomachComponent,
         [ServerComponentType.rideable]: rideableComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.taming]: tamingComponent,
         [ServerComponentType.tukmok]: tukmokComponent
      },
      lights: [],
      childConfigs: childConfigs
   });
   return entityConfigs;
}