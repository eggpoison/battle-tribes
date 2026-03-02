import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Settings } from "../../../shared/src/settings";
import { Point, polarVec2, randAngle } from "../../../shared/src/utils";
import { createDustfleaConfig } from "../entities/desert/dustflea";
import { Hitbox, applyAbsoluteKnockback } from "../hitboxes";
import { createEntity, getEntityLayer, getEntityType } from "../world";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { moveSeekerHeadToTarget } from "./InguYetuksnoglurblidokowfleaSeekerHeadComponent";
import { TransformComponentArray } from "./TransformComponent";
import { TribeMemberComponentArray } from "./TribeMemberComponent";

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
      const dist = hitbox.box.position.distanceTo(targetHitbox.box.position);
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
      if (hitbox.flags.includes(HitboxFlag.YETUK_BODY_1) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_2) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_3) || hitbox.flags.includes(HitboxFlag.YETUK_BODY_4)) {
         aiHelperComponent.moveFunc(inguYetu, targetHitbox.box.position, 650);
         aiHelperComponent.turnFunc(inguYetu, targetHitbox.box.position, Math.PI, 1.5);
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
      if (hitbox.flags.includes(HitboxFlag.YETUK_DUSTFLEA_DISPENSION_PORT)) {
         if (Math.random() < 1 * Settings.DT_S) {
            const config = createDustfleaConfig(hitbox.box.position.copy(), randAngle());
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

   const hitDir = hitbox.box.position.angleTo(collidingHitbox.box.position);

   damageEntity(collidingHitbox, hitbox.entity, 2, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(400, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, "yetukshit", 0.25);
}