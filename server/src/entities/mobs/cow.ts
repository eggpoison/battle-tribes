import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { CowSpecies, Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { lerp, Point, polarVec2, randInt } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { Biome } from "battletribes-shared/biomes";
import Layer from "../../Layer";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { EscapeAI } from "../../ai/EscapeAI";
import { CowComponent } from "../../components/CowComponent";
import { FollowAI } from "../../ai/FollowAI";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { createCarrySlot, RideableComponent } from "../../components/RideableComponent";
import { TamingComponent } from "../../components/TamingComponent";
import { getTamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { ItemType } from "../../../../shared/src/items/items";
import { registerEntityTamingSpec } from "../../taming-specs";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { applyAcceleration, applyAccelerationFromGround, getRootHitbox, Hitbox, turnHitboxToAngle } from "../../hitboxes";
import { tetherHitboxes } from "../../tethers";
import { findAngleAlignment } from "../../ai-shared";
import { createNormalisedPivotPoint } from "../../../../shared/src/boxes/BaseBox";
import { DustfleaHibernateAI } from "../../ai/DustfleaHibernateAI";

registerEntityTamingSpec(EntityType.cow, {
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
      },
      {
         skill: getTamingSkill(TamingSkillID.shatteredWill),
         x: 30,
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

registerEntityLootOnDeath(EntityType.cow, {
   itemType: ItemType.raw_beef,
   getAmount: () => randInt(2, 3)
});
registerEntityLootOnDeath(EntityType.cow, {
   itemType: ItemType.leather,
   getAmount: () => randInt(1, 2)
});

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return layer.getBiomeAtPosition(x, y) === Biome.grasslands;
}

const moveFunc = (cow: Entity, pos: Point, accelerationMagnitude: number): void => {
   const transformComponent = TransformComponentArray.getComponent(cow);
   const cowBodyHitbox = transformComponent.rootHitboxes[0];

   const bodyToTargetDirection = cowBodyHitbox.box.position.angleTo(pos);

   // Move whole cow to the target
   const alignmentToTarget = findAngleAlignment(cowBodyHitbox.box.angle, bodyToTargetDirection);
   const accelerationMultiplier = lerp(0.3, 1, alignmentToTarget);
   applyAccelerationFromGround(cowBodyHitbox, polarVec2(accelerationMagnitude * accelerationMultiplier, bodyToTargetDirection));
   
   // Move head to the target
   const headHitbox = transformComponent.hitboxes[1];
   const headToTargetDirection = headHitbox.box.position.angleTo(pos);
   // @HACK @INCOMPLETE doesn't let ppl move the head faster or slower.
   // const headAcc = 1500 * 0.9;
   const headAcc = 1500 * 0.5 * 0.65;
   applyAcceleration(headHitbox, polarVec2(headAcc, headToTargetDirection));
}

const turnFunc = (cow: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   const transformComponent = TransformComponentArray.getComponent(cow);
   const cowBodyHitbox = transformComponent.rootHitboxes[0];

   const bodyToTargetDirection = cowBodyHitbox.box.position.angleTo(pos);
   // @HACK
   const turnSpeed2 = turnSpeed * 0.6;
   turnHitboxToAngle(cowBodyHitbox, bodyToTargetDirection, turnSpeed2, turnDamping, false);
   
   // Turn the head to face the target
   const headHitbox = transformComponent.hitboxes[1];
   const headToTargetDirection = headHitbox.box.position.angleTo(pos);
   turnHitboxToAngle(headHitbox, headToTargetDirection, 5 * Math.PI, 2.5, false);
}

export function createCowConfig(position: Point, angle: number, species: CowSpecies): EntityConfig {
   const transformComponent = new TransformComponent();

   // Body hitbox
   const bodyHitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, -20), angle, 50, 80), 1.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.COW_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
 
   const idealHeadDist = 50;

   // Head hitbox
   const headPosition = position.offset(idealHeadDist, angle);
   // @Hack(ish): head initial angle is set to the angle too cuz it's not a direct child
   const headHitbox = new Hitbox(transformComponent, null, true, new CircularBox(headPosition, new Point(0, 0), angle, 30), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.COW_HEAD]);
   headHitbox.box.pivot = createNormalisedPivotPoint(0, -0.5);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   tetherHitboxes(headHitbox, bodyHitbox, idealHeadDist, 150, 2);
   // @Hack: method of adding
   headHitbox.angularTethers.push({
      originHitbox: bodyHitbox,
      idealAngle: 0,
      springConstant: 50,
      damping: 0,
      padding: Math.PI * 0.05,
      idealHitboxAngleOffset: 0,
      useLeverage: true
   });

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(headHitbox, 320, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI, 0.4, 0.6, positionIsValidCallback)
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(650, Math.PI, 0.4, 1);
   aiHelperComponent.ais[AIType.follow] = new FollowAI(15 * Settings.TICK_RATE, 30 * Settings.TICK_RATE, 0.2, 60);
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TICK_RATE);
   
   const rideableComponent = new RideableComponent();
   rideableComponent.carrySlots.push(createCarrySlot(bodyHitbox, new Point(0, -14), new Point(48, 0)));
   
   const lootComponent = new LootComponent();
   
   const tamingComponent = new TamingComponent();
   
   const cowComponent = new CowComponent(species);
   
   return {
      entityType: EntityType.cow,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.rideable]: rideableComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.taming]: tamingComponent,
         [ServerComponentType.cow]: cowComponent
      },
      lights: []
   };
}