import { HitboxTag, ServerComponentType, DamageSource, Entity, EntityType, AttackEffectiveness, Settings, Point, polarVec2, randAngle, distance, angle } from "battletribes-shared";
import { createDustfleaConfig } from "../entities/desert/dustflea.js";
import { Hitbox, applyAbsoluteKnockback, getHitboxTag } from "../hitboxes.js";
import { createEntity, getEntityLayer, getEntityType } from "../world.js";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";
import { moveSeekerHeadToTarget } from "./InguYetuksnoglurblidokowfleaSeekerHeadComponent.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { TribeMemberComponentArray } from "./TribeMemberComponent.js";

export class InguYetuksnoglurblidokowfleaComponent {}

export const InguYetuksnoglurblidokowfleaComponentArray = new ComponentArray<InguYetuksnoglurblidokowfleaComponent>(ServerComponentType.inguYetuksnoglurblidokowflea, true, getDataLength, addDataToPacket);
InguYetuksnoglurblidokowfleaComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
InguYetuksnoglurblidokowfleaComponentArray.onHitboxCollision = onHitboxCollision;

const isTarget = (entity: Entity): boolean => {
   return TribeMemberComponentArray.hasComponent(entity);
}

const getTarget = (inguYetu: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(inguYetu);
   const hitbox = transformComponent.hitboxes[0];
   
   let target: Entity | null = null;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!isTarget(entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const targetHitbox = entityTransformComponent.hitboxes[0];
      const dist = distance(hitbox.box.posX, hitbox.box.posY, targetHitbox.box.posX, targetHitbox.box.posY);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

function onTick(inguYetu: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(inguYetu);
   
   const target = getTarget(inguYetu, aiHelperComponent);
   if (target === null) {
      return;
   }

   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.hitboxes[0];

   const transformComponent = TransformComponentArray.getComponent(inguYetu);
   for (const hitbox of transformComponent.hitboxes) {
      const tag = getHitboxTag(hitbox);
      if (tag === HitboxTag.yetukBody1 || tag === HitboxTag.yetukBody2 || tag === HitboxTag.yetukBody3 || tag === HitboxTag.yetukBody4) {
         aiHelperComponent.moveFunc(inguYetu, targetHitbox.box.posX, targetHitbox.box.posY, 650);
         aiHelperComponent.turnFunc(inguYetu, targetHitbox.box.posX, targetHitbox.box.posY, Math.PI, 1.5);
      }
   }

   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.inguYetuksnoglurblidokowfleaSeekerHead) {
            const seekerHead = childHitbox.entity;
            moveSeekerHeadToTarget(seekerHead, target);
         }
      }
   }

   // Create dustfleas
   for (const hitbox of transformComponent.hitboxes) {
      if (getHitboxTag(hitbox) === HitboxTag.yetukDustfleaDispensionPort) {
         if (Math.random() < 1 * Settings.DT_S) {
            const config = createDustfleaConfig(hitbox.box.posX, hitbox.box.posY, randAngle());
            createEntity(config, getEntityLayer(inguYetu), 0);
         }
      }
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   if (getEntityType(collidingEntity) === EntityType.dustflea) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "yetukshit")) {
      return;
   }

   const hitDir = angle(collidingHitbox.box.posX - hitbox.box.posX, collidingHitbox.box.posY - hitbox.box.posY);

   damageEntity(collidingHitbox, hitbox.entity, 2, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(400, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, "yetukshit", 0.25);
}