import { HitboxTag } from "../../../shared/dist/boxes.js";
import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity, EntityType, DamageSource } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Settings } from "../../../shared/dist/settings.js";
import { angle, randFloat, Point, polarVec2 } from "../../../shared/dist/utils.js";
import { getConfigTransformComponent } from "../components.js";
import { createInguYetukLaserConfig } from "../entities/wtf/ingu-yetuk-laser.js";
import { addHitboxVelocity, applyAbsoluteKnockback, applyAcceleration, getHitboxTag, getHitboxVelocity, Hitbox, turnHitboxToAngle } from "../hitboxes.js";
import { createEntity, getEntityLayer, getEntityType } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";
import { TransformComponentArray } from "./TransformComponent.js";

export class InguYetuksnoglurblidokowfleaSeekerHeadComponent {
   readonly isCow: boolean;

   constructor(isCow: boolean) {
      this.isCow = isCow;
   }
}

export const InguYetuksnoglurblidokowfleaSeekerHeadComponentArray = new ComponentArray<InguYetuksnoglurblidokowfleaSeekerHeadComponent>(ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead, true, getDataLength, addDataToPacket);
InguYetuksnoglurblidokowfleaSeekerHeadComponentArray.onHitboxCollision = onHitboxCollision;

export function moveSeekerHeadToTarget(seekerHead: Entity, target: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(seekerHead);
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.hitboxes[0];

   const inguYetuksnoglurblidokowfleaSeekerHeadComponent = InguYetuksnoglurblidokowfleaSeekerHeadComponentArray.getComponent(seekerHead);
   
   // mov da head
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      // don't accelerate the base one cuz its attached to the monster
      if ((hitbox.parent !== null && hitbox.parent.entity !== seekerHead) || getHitboxTag(hitbox) === HitboxTag.yetukMandibleMedium || getHitboxTag(hitbox) === HitboxTag.yetukMandibleBig) {
         continue;
      }
      
      let mult = getHitboxTag(hitbox) === HitboxTag.cowHead ? 1 : 0.4;
      if (!inguYetuksnoglurblidokowfleaSeekerHeadComponent.isCow) {
         mult *= 1.2;
      }

      let dir = angle(targetHitbox.box.posX - hitbox.box.posX, targetHitbox.box.posY - hitbox.box.posY);
      if (i < Math.floor(transformComponent.hitboxes.length * 0.66)) {
         if (inguYetuksnoglurblidokowfleaSeekerHeadComponent.isCow) {
            dir += Math.PI * 0.33;
         } else {
            dir -= Math.PI * 0.33;
         }
      }
      
      applyAcceleration(hitbox, 900 * mult * Math.sin(dir), 900 * mult * Math.cos(dir));

      if (getHitboxTag(hitbox) === HitboxTag.cowHead) {
         turnHitboxToAngle(hitbox, dir, 2 * Math.PI, 0.5, false);
      }
   }

   if (Math.random() < 2 * Settings.DT_S) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
         const tag = getHitboxTag(hitbox);
         if (tag === HitboxTag.cowHead || tag === HitboxTag.tukmokHead) {
            const angle = hitbox.box.angle + randFloat(-0.5, 0.5);
            for (let i = 0; i < 2; i++) {
               const laserPosition = new Point(hitbox.box.posX, hitbox.box.posY).offset(50, angle);
               laserPosition.add(polarVec2(12, angle + (i === 0 ? -Math.PI * 0.5 : Math.PI * 0.5)));
               
               const config = createInguYetukLaserConfig(laserPosition.x, laserPosition.y, angle);
               const laserHitbox = getConfigTransformComponent(config.components).hitboxes[0];
               addHitboxVelocity(laserHitbox, polarVec2(800, angle));
               addHitboxVelocity(laserHitbox, getHitboxVelocity(hitbox));
               createEntity(config, getEntityLayer(seekerHead), 0);
            }
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