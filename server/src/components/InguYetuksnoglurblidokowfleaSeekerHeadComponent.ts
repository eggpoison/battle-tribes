import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Settings } from "../../../shared/src/settings";
import { Point, polarVec2, randFloat } from "../../../shared/src/utils";
import { createInguYetukLaserConfig } from "../entities/wtf/ingu-yetuk-laser";
import { addHitboxVelocity, applyAbsoluteKnockback, applyAcceleration, getHitboxVelocity, Hitbox, turnHitboxToAngle } from "../hitboxes";
import { createEntity, getEntityLayer, getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { TransformComponentArray } from "./TransformComponent";

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
      if ((hitbox.parent !== null && hitbox.parent.entity !== seekerHead) || hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_MEDIUM) || hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_BIG)) {
         continue;
      }
      
      let mult = hitbox.flags.includes(HitboxFlag.COW_HEAD) ? 1 : 0.4;
      if (!inguYetuksnoglurblidokowfleaSeekerHeadComponent.isCow) {
         mult *= 1.2;
      }

      let dir = hitbox.box.position.angleTo(targetHitbox.box.position);
      if (i < Math.floor(transformComponent.hitboxes.length * 0.66)) {
         if (inguYetuksnoglurblidokowfleaSeekerHeadComponent.isCow) {
            dir += Math.PI * 0.33;
         } else {
            dir -= Math.PI * 0.33;
         }
      }
      
      applyAcceleration(hitbox, polarVec2(900 * mult, dir));

      if (hitbox.flags.includes(HitboxFlag.COW_HEAD)) {
         turnHitboxToAngle(hitbox, dir, 2 * Math.PI, 0.5, false);
      }
   }

   if (Math.random() < 2 * Settings.DT_S) {
      for (let i = 0; i < transformComponent.hitboxes.length; i++) {
         const hitbox = transformComponent.hitboxes[i];
         if (hitbox.flags.includes(HitboxFlag.COW_HEAD) || hitbox.flags.includes(HitboxFlag.TUKMOK_HEAD)) {
            const angle = hitbox.box.angle + randFloat(-0.5, 0.5);
            for (let i = 0; i < 2; i++) {
               const laserPosition = hitbox.box.position.offset(50, angle);
               laserPosition.add(polarVec2(12, angle + (i === 0 ? -Math.PI * 0.5 : Math.PI * 0.5)));
               
               const config = createInguYetukLaserConfig(laserPosition, angle);
               const laserHitbox = config.components[ServerComponentType.transform]!.hitboxes[0];
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

   const hitDir = hitbox.box.position.angleTo(collidingHitbox.box.position);

   damageEntity(collidingHitbox, hitbox.entity, 2, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(400, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, "yetukshit", 0.25);
}