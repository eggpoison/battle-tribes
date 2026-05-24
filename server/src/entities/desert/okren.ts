import { createAbsolutePivotPoint, createNormalisedPivotPoint, PivotPoint, HitboxCollisionType, HitboxFlag, CircularBox, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, ItemType, Point, randInt, getTamingSkill, TamingSkillID, Biome, PivotPointType } from "battletribes-shared";
import { accelerateEntityToPosition, moveEntityToPosition, turnToPosition } from "../../ai-shared.js";
import { OkrenCombatAI } from "../../ai/OkrenCombatAI.js";
import { SandBallingAI } from "../../ai/SandBallingAI.js";
import { ChildConfigAttachInfo, EntityConfig, getConfigTransformComponent } from "../../components.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { EnergyStomachComponent } from "../../components/EnergyStomachComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { OkrenClawGrowthStage } from "../../components/OkrenClawComponent.js";
import { OkrenAgeStage, OkrenComponent, OkrenComponentArray } from "../../components/OkrenComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { createOkrenClawConfig } from "./okren-claw.js";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent.js";
import { registerEntityTamingSpec } from "../../taming-specs.js";
import { TamingComponent } from "../../components/TamingComponent.js";
import WanderAI from "../../ai/WanderAI.js";
import Layer from "../../Layer.js";
import { createCarrySlot, RideableComponent } from "../../components/RideableComponent.js";

const HEALTHS = [50, 80, 115, 150, 200];
const VISION_RANGES = [500, 550, 600, 650, 700];

const ENERGIES = [2000, 2500, 3000, 3500, 4000];

registerEntityTamingSpec(EntityType.okren, {
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
         skill: getTamingSkill(TamingSkillID.riding),
         x: -18,
         y: 30,
         parent: TamingSkillID.follow,
         requiredTamingTier: 2
      },
      {
         skill: getTamingSkill(TamingSkillID.move),
         x: 18,
         y: 30,
         parent: TamingSkillID.follow,
         requiredTamingTier: 2
      },
      {
         skill: getTamingSkill(TamingSkillID.carry),
         x: -30,
         y: 50,
         parent: TamingSkillID.riding,
         requiredTamingTier: 3
      },
      {
         skill: getTamingSkill(TamingSkillID.attack),
         x: 6,
         y: 50,
         parent: TamingSkillID.move,
         requiredTamingTier: 3
      }
   ],
   foodItemType: ItemType.berry,
   tierFoodRequirements: {
      0: 0,
      1: 5,
      2: 20,
      3: 60
   }
});

registerEntityLootOnDeath(EntityType.okren, {
   itemType: ItemType.rawCrabMeat,
   getAmount: (okren: Entity) => {
      const okrenComponent = OkrenComponentArray.getComponent(okren);
      
      switch (okrenComponent.size) {
         case OkrenAgeStage.juvenile: return randInt(5, 7);
         case OkrenAgeStage.youth: return randInt(7, 10);
         case OkrenAgeStage.adult: return randInt(11, 15);
         case OkrenAgeStage.elder: return randInt(16, 21);
         case OkrenAgeStage.ancient: return randInt(22, 30);
      }
   }
});
registerEntityLootOnDeath(EntityType.okren, {
   itemType: ItemType.chitin,
   getAmount: (okren: Entity) => {
      const okrenComponent = OkrenComponentArray.getComponent(okren);
      
      switch (okrenComponent.size) {
         case OkrenAgeStage.juvenile: return randInt(1, 2);
         case OkrenAgeStage.youth: return randInt(2, 3);
         case OkrenAgeStage.adult: return randInt(4, 6);
         case OkrenAgeStage.elder: return randInt(7, 10);
         case OkrenAgeStage.ancient: return randInt(11, 15);
      }
   }
});

function wanderPositionIsValid(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   const biome = layer.getBiomeAtPosition(x, y);
   return biome === Biome.desert || biome === Biome.desertOasis;
}

const moveFunc = (okren: Entity, x: number, y: number, acceleration: number): void => {
   accelerateEntityToPosition(okren, x, y, acceleration);
}

const turnFunc = (okren: Entity, x: number, y: number, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(okren, x, y, turnSpeed, turnDamping);
}

// @Temporary: remove size parameter
export function createOkrenConfig(x: number, y: number, angle: number, size: OkrenAgeStage): EntityConfig {
   const transformComponent = new TransformComponent();
   
   // Flesh body hitbox
   let bodyRadius: number;
   switch (size) {
      case OkrenAgeStage.juvenile: bodyRadius = 48; break;
      case OkrenAgeStage.youth:    bodyRadius = 56; break;
      case OkrenAgeStage.adult:    bodyRadius = 64; break;
      case OkrenAgeStage.elder:    bodyRadius = 72; break;
      case OkrenAgeStage.ancient:  bodyRadius = 80; break;
   }
   const bodyHitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, bodyRadius), 5, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const childConfigs: Array<ChildConfigAttachInfo> = [];

   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 1;
      
      let eyeOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: eyeOffset = new Point(34, 60); break;
         case OkrenAgeStage.youth:    eyeOffset = new Point(36, 66); break;
         case OkrenAgeStage.adult:    eyeOffset = new Point(42, 72); break;
         case OkrenAgeStage.elder:    eyeOffset = new Point(46, 80); break;
         case OkrenAgeStage.ancient:  eyeOffset = new Point(46, 88); break;
      }
      let eyeRadius: number;
      switch (size) {
         // In all of these, the radius put in is 4 larger than the radius of the actual eye sprite to make it easier to hit
         case OkrenAgeStage.juvenile: eyeRadius = 18; break;
         case OkrenAgeStage.youth:    eyeRadius = 18; break;
         case OkrenAgeStage.adult:    eyeRadius = 18; break;
         case OkrenAgeStage.elder:    eyeRadius = 18; break;
         case OkrenAgeStage.ancient:  eyeRadius = 18; break;
      }
      const eyeHitbox = new Hitbox(transformComponent, bodyHitbox, true, new CircularBox(bodyHitbox.box.posX + eyeOffset.x, bodyHitbox.box.posY + eyeOffset.y, eyeOffset.x, eyeOffset.y, 0, eyeRadius), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_EYE]);
      eyeHitbox.box.flipX = sideIsFlipped;
      // @Hack
      eyeHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      addHitboxToTransformComponent(transformComponent, eyeHitbox);

      let mandibleOffset: Point;
      switch (size) {
         case OkrenAgeStage.juvenile: mandibleOffset = new Point(16, 80);  break;
         case OkrenAgeStage.youth:    mandibleOffset = new Point(18, 84);  break;
         case OkrenAgeStage.adult:    mandibleOffset = new Point(20, 92);  break;
         case OkrenAgeStage.elder:    mandibleOffset = new Point(22, 98);  break;
         case OkrenAgeStage.ancient:  mandibleOffset = new Point(22, 106); break;
      }
      const mandibleHitbox = new Hitbox(transformComponent, bodyHitbox, true, new RectangularBox(bodyHitbox.box.posX + mandibleOffset.x, bodyHitbox.box.posY + mandibleOffset.y, mandibleOffset.x, mandibleOffset.y, Math.PI * 0.1, 16, 28), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.OKREN_MANDIBLE]);
      mandibleHitbox.box.flipX = sideIsFlipped;
      // @Hack
      mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      mandibleHitbox.box.pivotX = -0.5;
      mandibleHitbox.box.pivotY = -0.5;
      mandibleHitbox.box.pivotType = PivotPointType.normalised;
      addHitboxToTransformComponent(transformComponent, mandibleHitbox);

      const clawConfig = createOkrenClawConfig(bodyHitbox.box.posX, bodyHitbox.box.posY, 0, size, OkrenClawGrowthStage.FOUR, sideIsFlipped);
      childConfigs.push({
         entityConfig: clawConfig,
         attachedHitbox: getConfigTransformComponent(clawConfig.components).hitboxes[0],
         parentHitbox: bodyHitbox,
         isPartOfParent: true
      });
   }
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(HEALTHS[size]);

   const aiHelperComponent = new AIHelperComponent(bodyHitbox, VISION_RANGES[size], moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(400, 5 * Math.PI, 0.6, 0.35, wanderPositionIsValid);
   aiHelperComponent.ais[AIType.okrenCombat] = new OkrenCombatAI(350, Math.PI * 1.6, 0.6);
   aiHelperComponent.ais[AIType.sandBalling] = new SandBallingAI(0, 0, 4);
   
   const energyStoreComponent = new EnergyStoreComponent(ENERGIES[size]);
   
   const energyStomachComponent = new EnergyStomachComponent(1000, 4, 5);
   
   const rideableComponent = new RideableComponent();
   rideableComponent.carrySlots.push(createCarrySlot(bodyHitbox, new Point(0, -40), new Point(72, 0)));
   rideableComponent.carrySlots.push(createCarrySlot(bodyHitbox, new Point(30, 20), new Point(72, 0)));
   rideableComponent.carrySlots.push(createCarrySlot(bodyHitbox, new Point(-30, 20), new Point(72, 0)));
   
   const lootComponent = new LootComponent();
   
   const tamingComponent = new TamingComponent();
   
   const okrenComponent = new OkrenComponent(size);
   
   return {
      entityType: EntityType.okren,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         aiHelperComponent,
         energyStoreComponent,
         energyStomachComponent,
         rideableComponent,
         lootComponent,
         tamingComponent,
         okrenComponent
      ],
      lights: [],
      childConfigs: childConfigs
   };
}