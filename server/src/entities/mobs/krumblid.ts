import { CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, getAbsAngleDiff, Point, randInt, HitboxCollisionType, HitboxFlag, CircularBox, Biome, Settings, ItemType, RectangularBox, createNormalisedPivotPoint, getTamingSkill, TamingSkillID } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import WanderAI from "../../ai/WanderAI.js";
import Layer from "../../Layer.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { EscapeAI } from "../../ai/EscapeAI.js";
import { FollowAI } from "../../ai/FollowAI.js";
import { KrumblidComponent } from "../../components/KrumblidComponent.js";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import {getHitboxVelocity, Hitbox } from "../../hitboxes.js";
import { EnergyStomachComponent } from "../../components/EnergyStomachComponent.js";
import { accelerateEntityToPosition, turnToPosition } from "../../ai-shared.js";
import { SandBallingAI } from "../../ai/SandBallingAI.js";
import { VegetationConsumeAI } from "../../ai/VegetationConsumeAI.js";
import { KrumblidCombatAI } from "../../ai/KrumblidCombatAI.js";
import { KrumblidHibernateAI } from "../../ai/KrumblidHibernateAI.js";
import { getEntityType } from "../../world.js";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent.js";
import { TamingComponent } from "../../components/TamingComponent.js";
import { registerEntityTamingSpec } from "../../taming-specs.js";

registerEntityTamingSpec(EntityType.krumblid, {
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
         skill: getTamingSkill(TamingSkillID.attack),
         x: 0,
         y: 30,
         parent: TamingSkillID.follow,
         requiredTamingTier: 2
      },
      {
         skill: getTamingSkill(TamingSkillID.imprint),
         x: 0,
         y: 50,
         parent: TamingSkillID.attack,
         requiredTamingTier: 3
      }
   ],
   foodItemType: ItemType.leaf,
   tierFoodRequirements: {
      0: 0,
      1: 5,
      2: 20,
      3: 60
   }
});

registerEntityLootOnDeath(EntityType.krumblid, {
   itemType: ItemType.rawCrabMeat,
   getAmount: () => randInt(2, 3)
});

function wanderPositionIsValid(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   const biome = layer.getBiomeAtPosition(x, y);
   return biome === Biome.desert || biome === Biome.desertOasis;
}

const moveFunc = (krumblid: Entity, pos: Point, acceleration: number): void => {
   accelerateEntityToPosition(krumblid, pos, acceleration);
}

const turnFunc = (krumblid: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(krumblid, pos, turnSpeed, turnDamping);
}

const extraEscapeCondition = (krumblid: Entity, escapeTarget: Entity): boolean => {
   // Run from okrens which look like they are going for the krumblid
   
   if (getEntityType(escapeTarget) !== EntityType.okren) {
      return false;
   }

   const krumblidTransformComponent = TransformComponentArray.getComponent(krumblid);
   const krumblidHitbox = krumblidTransformComponent.hitboxes[0];

   const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
   const escapeTargetHitbox = escapeTargetTransformComponent.hitboxes[0];

   const angleFromEscapeTarget = escapeTargetHitbox.box.position.angleTo(krumblidHitbox.box.position);
   const positionFromEscapeTarget = new Point(krumblidHitbox.box.position.x - escapeTargetHitbox.box.position.x, krumblidHitbox.box.position.y - escapeTargetHitbox.box.position.y);

   const escapeTargetVelocity = getHitboxVelocity(escapeTargetHitbox);
   
   return getAbsAngleDiff(angleFromEscapeTarget, escapeTargetHitbox.box.angle) < 0.4 && escapeTargetVelocity.calculateDotProduct(positionFromEscapeTarget) > 50;
}

export function createKrumblidConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.traction = 1.5;
   
   const bodyHitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 24), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.cactus, [HitboxFlag.KRUMBLID_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
   
   // Mandibles
   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 1;
      
      const offset = new Point(12, 28);
      const position = bodyHitbox.box.position.copy();
      position.add(offset);
      const mandibleHitbox = new Hitbox(transformComponent, bodyHitbox, true, new RectangularBox(position, offset, Math.PI * 0.1, 12, 16), 0.1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.cactus, [HitboxFlag.KRUMBLID_MANDIBLE]);
      mandibleHitbox.box.flipX = sideIsFlipped;
      // @Hack
      mandibleHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      mandibleHitbox.box.pivot = createNormalisedPivotPoint(-0.5, -0.5);
      addHitboxToTransformComponent(transformComponent, mandibleHitbox);
   }
   
   const healthComponent = new HealthComponent(15);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(bodyHitbox, 400, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(400, 5 * Math.PI, 0.4, 0.35, wanderPositionIsValid);
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(900, 5 * Math.PI, 0.4, 1, extraEscapeCondition);
   aiHelperComponent.ais[AIType.follow] = new FollowAI(8 * Settings.TICK_RATE, 16 * Settings.TICK_RATE, 0.05, 34);
   aiHelperComponent.ais[AIType.sandBalling] = new SandBallingAI(400, 1, 1);
   aiHelperComponent.ais[AIType.vegetationConsume] = new VegetationConsumeAI(400, 5 * Math.PI, 0.4);
   aiHelperComponent.ais[AIType.krumblidCombat] = new KrumblidCombatAI(900, 5 * Math.PI, 0.4);
   aiHelperComponent.ais[AIType.krumblidHibernate] = new KrumblidHibernateAI(240, 5 * Math.PI, 0.4);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TICK_RATE);
   
   const lootComponent = new LootComponent();

   const energyStoreComponent = new EnergyStoreComponent(500);
   
   const energyStomachComponent = new EnergyStomachComponent(300, 3, 1);
   
   const tamingComponent = new TamingComponent();
   
   const krumblidComponent = new KrumblidComponent();
   
   return {
      entityType: EntityType.krumblid,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         attackingEntitiesComponent,
         lootComponent,
         energyStoreComponent,
         energyStomachComponent,
         tamingComponent,
         krumblidComponent
      ],
      lights: []
   };
}