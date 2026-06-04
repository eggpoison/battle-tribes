import { Biome } from "../../../../shared/dist/biomes.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { Entity, EntityType } from "../../../../shared/dist/entities.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { angle, polarVec2, getAbsAngleDiff } from "../../../../shared/dist/utils.js";
import { turnToPosition } from "../../ai-shared.js";
import { DustfleaHibernateAI } from "../../ai/DustfleaHibernateAI.js";
import { EscapeAI } from "../../ai/EscapeAI.js";
import WanderAI from "../../ai/WanderAI.js";
import { EntityConfig } from "../../components.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent.js";
import { DustfleaComponent } from "../../components/DustfleaComponent.js";
import { EnergyStomachComponent } from "../../components/EnergyStomachComponent.js";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent.js";
import { applyAbsoluteKnockback, createHitbox } from "../../hitboxes.js";
import Layer from "../../Layer.js";
import { getEntityAgeTicks, getEntityType } from "../../world.js";

function wanderPositionIsValid(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   const biome = layer.getBiomeAtPosition(x, y);
   return biome === Biome.desert || biome === Biome.desertOasis;
}

const moveFunc = (dustflea: Entity, x: number, y: number, acceleration: number): void => {
   const ageTicks = getEntityAgeTicks(dustflea);
   if ((ageTicks + dustflea) % Math.floor(Settings.TICK_RATE / 2.3) === 0) {
      const transformComponent = TransformComponentArray.getComponent(dustflea);
      const hitbox = transformComponent.hitboxes[0];
      
      const direction = angle(x - hitbox.box.posX, y - hitbox.box.posY);
      applyAbsoluteKnockback(hitbox, polarVec2(125, direction));
   }
}

const turnFunc = (dustflea: Entity, x: number, y: number, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(dustflea, x, y, turnSpeed, turnDamping);
}

const extraEscapeCondition = (dustflea: Entity, escapeTarget: Entity): boolean => {
   if (getEntityType(escapeTarget) !== EntityType.krumblid) {
      return false;
   }

   const dustfleaTransformComponent = TransformComponentArray.getComponent(dustflea);
   const dustfleaHitbox = dustfleaTransformComponent.hitboxes[0];

   const escapeTargetTransformComponent = TransformComponentArray.getComponent(escapeTarget);
   const escapeTargetHitbox = escapeTargetTransformComponent.hitboxes[0];

   const angleFromEscapeTarget = angle(dustfleaHitbox.box.posX - escapeTargetHitbox.box.posX, dustfleaHitbox.box.posY - escapeTargetHitbox.box.posY);

   return getAbsAngleDiff(angleFromEscapeTarget, escapeTargetHitbox.box.angle) < 0.4;
}

export function createDustfleaConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 8), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const healthComponent = new HealthComponent(2);

   const aiHelperComponent = new AIHelperComponent(hitbox, 180, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, 4 * Math.PI, 0.25, 99999, wanderPositionIsValid);
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(200, 4 * Math.PI, 0.25, 1, extraEscapeCondition);
   aiHelperComponent.ais[AIType.dustfleaHibernate] = new DustfleaHibernateAI(200, 4 * Math.PI, 0.25);
   // aiHelperComponent.ais[AIType.hoppingMovementAI] = new HoppingMovementAI();
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(3 * Settings.TICK_RATE);
   
   const energyStoreComponent = new EnergyStoreComponent(30);

   const energyStomachComponent = new EnergyStomachComponent(30, 0.15, 1);
   
   const dustfleaComponent = new DustfleaComponent();
   
   return {
      entityType: EntityType.dustflea,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         aiHelperComponent,
         attackingEntitiesComponent,
         energyStoreComponent,
         energyStomachComponent,
         dustfleaComponent
      ],
      lights: []
   };
}