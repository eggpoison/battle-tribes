import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { Point, randInt, randFloat, angle, randAngle } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxTag, Hitbox } from "../../hitboxes";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface TukmokComponentData {}

export interface TukmokComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tukmok, typeof TukmokComponentArray> {}
}

export const TukmokComponentArray = registerServerComponentArray(
   ServerComponentType.tukmok,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
TukmokComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TukmokComponentArray.onHit = onHit;
TukmokComponentArray.onDie = onDie;

function decodeData(): TukmokComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];
      
      const tag = getHitboxTag(hitbox);
      if (tag === HitboxTag.tukmokBody) {
         renderObject.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               1,
               0,
               0, 0,
               TextureIndex.entities_tukmok_body
            )
         );
      } else if (tag === HitboxTag.tukmokHead) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            2,
            0,
            0, 0,
            TextureIndex.entities_tukmok_head
         );
         addRenderPartTag(renderPart, "tamingComponent:head");
         renderObject.attachRenderPart(renderPart);
      } else if (tag === HitboxTag.tukmokTailMiddleSegmentSmall) {
         renderObject.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               0, 0,
               TextureIndex.entities_tukmok_tailSegmentSmall
            )
         );
      } else if (tag === HitboxTag.tukmokTailMiddleSegmentMedium) {
         renderObject.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               0, 0,
               TextureIndex.entities_tukmok_tailSegmentMedium
            )
         );
      } else {
         renderObject.attachRenderPart(
            new TexturedRenderPart(
               hitbox,
               i * 0.02,
               0,
               0, 0,
               TextureIndex.entities_tukmok_tailSegmentBig
            )
         );
      }
   }
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
      createBloodPoolParticle(hitbox.box.posX, hitbox.box.posY, 60);
   }
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = angle(hitPosition.x - hitbox.box.posX, hitPosition.y - hitbox.box.posY);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.posX + 60 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.posY + 60 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
   }
}

function onDie(tukmok: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const hitbox = transformComponent.hitboxes[0];
   
   for (let i = 0; i < 3; i++) {
      createBloodPoolParticle(hitbox.box.posX, hitbox.box.posY, 35);
   }

   createBloodParticleFountain(tukmok, 0.1, 1.1);

   playSoundOnHitbox("tukmok-death.mp3", 0.4, randFloat(0.94, 1.06), tukmok, hitbox, false);
}