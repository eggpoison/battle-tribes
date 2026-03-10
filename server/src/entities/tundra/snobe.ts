import { ServerComponentType } from "battletribes-shared/components";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point, polarVec2, randInt } from "battletribes-shared/utils";
import { HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { EntityConfig } from "../../components";
import { TransformComponent, TransformComponentArray, addHitboxToTransformComponent } from "../../components/TransformComponent";
import { applyAbsoluteKnockback, Hitbox } from "../../hitboxes";
import { HealthComponent } from "../../components/HealthComponent";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { SnobeComponent } from "../../components/SnobeComponent";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { turnToPosition } from "../../ai-shared";
import { EscapeAI } from "../../ai/EscapeAI";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { Settings } from "../../../../shared/src/settings";
import { tetherHitboxes } from "../../tethers";
import { getEntityAgeTicks } from "../../world";
import WanderAI from "../../ai/WanderAI";
import { Biome } from "../../../../shared/src/biomes";
import Layer from "../../Layer";
import { FollowAI } from "../../ai/FollowAI";
import { TamingComponent } from "../../components/TamingComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { registerEntityTamingSpec } from "../../taming-specs";
import { getTamingSkill, TamingSkillID } from "../../../../shared/src/taming";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";

export const SNOBE_EAR_IDEAL_ANGLE = -Math.PI * 0.2;

registerEntityLootOnDeath(EntityType.snobe, {
   itemType: ItemType.rawSnobeMeat,
   getAmount: () => randInt(2, 3)
});
registerEntityLootOnDeath(EntityType.snobe, {
   itemType: ItemType.snobeHide,
   getAmount: () => randInt(1, 2)
});

registerEntityTamingSpec(EntityType.snobe, {
   maxTamingTier: 1,
   skillNodes: [
      {
         skill: getTamingSkill(TamingSkillID.follow),
         x: 0,
         y: 10,
         parent: null,
         requiredTamingTier: 1
      }
   ],
   foodItemType: ItemType.snowberry,
   tierFoodRequirements: {
      0: 0,
      1: 5
   }
});

function wanderPositionIsValid(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   const biome = layer.getBiomeAtPosition(x, y);
   return biome === Biome.tundra;
}

const moveFunc = (snobe: Entity, pos: Point, acceleration: number): void => {
   const ageTicks = getEntityAgeTicks(snobe);
   if ((ageTicks + snobe) % Math.floor(Settings.TICK_RATE / 3.5) === 0) {
      const transformComponent = TransformComponentArray.getComponent(snobe);
      const hitbox = transformComponent.hitboxes[0];
      
      const direction = hitbox.box.position.angleTo(pos);
      // @HACK: so that snobes get affected by freezing from ingu serpents. But this shouldn't have to be thought about here!!
      applyAbsoluteKnockback(hitbox, polarVec2(320 / 1600 * acceleration * transformComponent.moveSpeedMultiplier, direction));
   }
}

const turnFunc = (snobe: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(snobe, pos, turnSpeed, turnDamping);
}

export function createSnobeConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 24), 0.45, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.SNOBE_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
   
   const idealButtDistance = 20;
   const buttOffset = new Point(0, -idealButtDistance);
   const buttPosition = position.copy();
   buttPosition.add(buttOffset);
   const buttHitbox = new Hitbox(transformComponent, null, true, new CircularBox(buttPosition, new Point(0, 0), 0, 12), 0.15, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.SNOBE_BUTT]);
   addHitboxToTransformComponent(transformComponent, buttHitbox);
   
   tetherHitboxes(buttHitbox, bodyHitbox, idealButtDistance, 25, 1);
   // @Hack: method of adding
   buttHitbox.angularTethers.push({
      originHitbox: bodyHitbox,
      idealAngle: Math.PI,
      springConstant: 18,
      damping: 0,
      padding: Math.PI * 0.06,
      idealHitboxAngleOffset: 0,
      useLeverage: false
   });

   for (let i = 0; i < 2; i++) {
      const sideIsFlipped = i === 0;

      const earOffset = new Point(22, -8);
      const earPosition = position.copy();
      earPosition.add(earOffset);
      const earHitbox = new Hitbox(transformComponent, bodyHitbox, true, new CircularBox(earPosition, earOffset, SNOBE_EAR_IDEAL_ANGLE, 8), 0.05, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.SNOBE_EAR]);
      earHitbox.box.flipX = sideIsFlipped;
      // @Hack
      earHitbox.box.totalFlipXMultiplier = sideIsFlipped ? -1 : 1;
      earHitbox.relativeAngleConstraints.push({
         idealAngle: earHitbox.box.relativeAngle,
         springConstant: 30,
         damping: 0.15
      });

      addHitboxToTransformComponent(transformComponent, earHitbox);
   }
   
   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(bodyHitbox, 360, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(1000, 6 * Math.PI, 1, 0.5, wanderPositionIsValid);
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(1600, 6 * Math.PI, 1, 5);
   aiHelperComponent.ais[AIType.follow] = new FollowAI(8 * Settings.TICK_RATE, 16 * Settings.TICK_RATE, 0.1, 34);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TICK_RATE);
   
   const tamingComponent = new TamingComponent();
   
   const lootComponent = new LootComponent();
   
   const snobeComponent = new SnobeComponent();
   
   return {
      entityType: EntityType.snobe,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         attackingEntitiesComponent,
         tamingComponent,
         lootComponent,
         snobeComponent
      ],
      lights: []
   };
}