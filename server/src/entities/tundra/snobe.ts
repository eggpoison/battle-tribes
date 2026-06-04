import { TransformComponent, TransformComponentArray, addHitboxToTransformComponent } from "../../components/TransformComponent.js";
import { applyAbsoluteKnockback, createHitbox, setHitboxTag } from "../../hitboxes.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { SnobeComponent } from "../../components/SnobeComponent.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { turnToPosition } from "../../ai-shared.js";
import { EscapeAI } from "../../ai/EscapeAI.js";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent.js";
import { addHitboxAngularConstraint, addHitboxAngularTether, tetherHitboxes } from "../../tethers.js";
import { getEntityAgeTicks } from "../../world.js";
import WanderAI from "../../ai/WanderAI.js";
import Layer from "../../Layer.js";
import { FollowAI } from "../../ai/FollowAI.js";
import { TamingComponent } from "../../components/TamingComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { registerEntityTamingSpec } from "../../taming-specs.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { EntityConfig } from "../../components.js";
import { Biome } from "../../../../shared/dist/biomes.js";
import { createCircularBox, HitboxCollisionType, HitboxTag, setBoxFlipX } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { getTamingSkill, TamingSkillID } from "../../../../shared/dist/taming.js";
import { randInt, angle, polarVec2, Point } from "../../../../shared/dist/utils.js";

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

const moveFunc = (snobe: Entity, x: number, y: number, acceleration: number): void => {
   const ageTicks = getEntityAgeTicks(snobe);
   if ((ageTicks + snobe) % Math.floor(Settings.TICK_RATE / 3.5) === 0) {
      const transformComponent = TransformComponentArray.getComponent(snobe);
      const hitbox = transformComponent.hitboxes[0];
      
      const direction = angle(x - hitbox.box.posX, y - hitbox.box.posY);
      // @HACK: so that snobes get affected by freezing from ingu serpents. But this shouldn't have to be thought about here!!
      applyAbsoluteKnockback(hitbox, polarVec2(320 / 1600 * acceleration * transformComponent.moveSpeedMultiplier, direction));
   }
}

const turnFunc = (snobe: Entity, x: number, y: number, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(snobe, x, y, turnSpeed, turnDamping);
}

export function createSnobeConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 24), 0.45, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(bodyHitbox, HitboxTag.snobeBody);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
   
   const idealButtDistance = 20;
   const buttOffset = new Point(0, -idealButtDistance);
   const buttHitbox = createHitbox(transformComponent, null, createCircularBox(x + buttOffset.x, y + buttOffset.y, 0, 0, 0, 12), 0.15, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(buttHitbox, HitboxTag.snobeButt);
   addHitboxToTransformComponent(transformComponent, buttHitbox);
   
   tetherHitboxes(buttHitbox, bodyHitbox, idealButtDistance, 25, 1);
   addHitboxAngularTether(buttHitbox, {
      hitbox: buttHitbox,
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
      const earHitbox = createHitbox(transformComponent, bodyHitbox, createCircularBox(x + earOffset.x, y + earOffset.y, earOffset.x, earOffset.y, SNOBE_EAR_IDEAL_ANGLE, 8), 0.05, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxTag(earHitbox, HitboxTag.snobeEar);
      setBoxFlipX(earHitbox.box, sideIsFlipped);
      addHitboxAngularConstraint(earHitbox, {
         hitbox: earHitbox,
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