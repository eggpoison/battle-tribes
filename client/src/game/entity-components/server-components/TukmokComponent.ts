import { Point, randAngle, randFloat, randInt, Entity, ServerComponentType, HitboxFlag } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface TukmokComponentData {}

interface IntermediateInfo {}

export interface TukmokComponent {}

export const TukmokComponentArray = new ServerComponentArray<TukmokComponent, TukmokComponentData, IntermediateInfo>(ServerComponentType.tukmok, true, createComponent, getMaxRenderParts, decodeData);
TukmokComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TukmokComponentArray.onHit = onHit;
TukmokComponentArray.onDie = onDie;

function decodeData(): TukmokComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;

   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];
      
      if (hitbox.flags.includes(HitboxFlag.TUKMOK_BODY)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               1,
               0,
               getTextureArrayIndex("entities/tukmok/body.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            2,
            0,
            getTextureArrayIndex("entities/tukmok/head.png")
         );
         renderPart.addTag("tamingComponent:head");
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_SMALL)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               getTextureArrayIndex("entities/tukmok/tail-segment-small.png")
            )
         );
      } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_MEDIUM)) {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               getTextureArrayIndex("entities/tukmok/tail-segment-medium.png")
            )
         );
      } else {
         renderInfo.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               getTextureArrayIndex("entities/tukmok/tail-segment-big.png")
            )
         );
      }
   }

   return {};
}

function createComponent(): TukmokComponent {
   return {};
}

function getMaxRenderParts(): number {
   // body, hitbox + 11 segments (club not included)
   // @HACK cuz we can't access the num segments constant defined in the server
   return 2 + 11;
}

function onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
   playSoundOnHitbox("tukmok-hit-flesh-" + randInt(1, 4) + ".mp3", randFloat(0.8, 1), randFloat(0.9, 1.1), entity, hitbox, false);

   // Blood pool particles
   for (let i = 0; i < 2; i++) {
      createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 60);
   }
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = hitbox.box.position.angleTo(hitPosition);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + 60 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + 60 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
   }
}

function onDie(tukmok: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const hitbox = transformComponent.hitboxes[0];
   
   for (let i = 0; i < 3; i++) {
      createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 35);
   }

   createBloodParticleFountain(tukmok, 0.1, 1.1);

   playSoundOnHitbox("tukmok-death.mp3", 0.4, randFloat(0.94, 1.06), tukmok, hitbox, false);
}