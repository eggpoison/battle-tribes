import { HitboxFlag, Point, randAngle, randFloat, randInt, Entity, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain, createKrumblidChitinParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { HealthComponentArray } from "./HealthComponent";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getTransformComponentData } from "../../entity-component-types";

export interface KrumblidComponentData {}

interface IntermediateInfo {}

export interface KrumblidComponent {}

export const KrumblidComponentArray = new ServerComponentArray<KrumblidComponent, KrumblidComponentData, IntermediateInfo>(ServerComponentType.krumblid, true, createComponent, getMaxRenderParts, decodeData);
KrumblidComponentArray.populateIntermediateInfo = populateIntermediateInfo;
KrumblidComponentArray.onHit = onHit;
KrumblidComponentArray.onDie = onDie;

function decodeData(): KrumblidComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   for (const hitbox of transformComponentData.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.KRUMBLID_BODY)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/krumblid/krumblid.png")
            )
         );
      } else {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               0,
               0,
               getTextureArrayIndex("entities/krumblid/mandible.png")
            )
         );
      }
   }

   return {};
}

function createComponent(): KrumblidComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}

function onHit(krumblid: Entity, hitbox: Hitbox, hitPosition: Point): void {
   createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   
   // Blood particles
   for (let i = 0; i < 5; i++) {
      let offsetDirection = hitbox.box.position.angleTo(hitPosition);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
   }

   playSoundOnHitbox("krumblid-hit-shell.mp3", 0.6, randFloat(0.9, 1.1), krumblid, hitbox, false);
   playSoundOnHitbox("krumblid-hit-flesh-" + randInt(1, 2) + ".mp3", 0.6, randFloat(0.9, 1.1), krumblid, hitbox, false);
}

function onDie(krumblid: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(krumblid);
   if (healthComponent.health > 0) {
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(krumblid);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 2; i++) {
      createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 35);
   }

   createBloodParticleFountain(krumblid, 0.1, 0.8);

   for (let i = 0; i < 10; i++) {
      const offsetDirection = randAngle();
      const spawnPositionX = hitbox.box.position.x + 20 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 20 * Math.cos(offsetDirection);
      createKrumblidChitinParticle(spawnPositionX, spawnPositionY);
   }

   playSoundOnHitbox("krumblid-death.mp3", 0.6, randFloat(0.9, 1.1), krumblid, hitbox, false);
}