import { HitboxFlag, Point, randAngle, randFloat, randInt, Entity, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain, createKrumblidChitinParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { HealthComponentArray } from "./HealthComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface KrumblidComponentData {}

export interface KrumblidComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.krumblid, _KrumblidComponentArray, KrumblidComponentData> {}
}

class _KrumblidComponentArray extends _ServerComponentArray<KrumblidComponent, KrumblidComponentData> {
   public decodeData(): KrumblidComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      for (const hitbox of transformComponentData.hitboxes) {
         if (hitbox.flags.includes(HitboxFlag.KRUMBLID_BODY)) {
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  1,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/krumblid/krumblid.png")
               )
            );
         } else {
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  0,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/krumblid/mandible.png")
               )
            );
         }
      }
   }

   public createComponent(): KrumblidComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 3;
   }

   public onHit(krumblid: Entity, hitbox: Hitbox, hitPosition: Point): void {
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

   public onDie(krumblid: Entity): void {
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
}

export const KrumblidComponentArray = registerServerComponentArray(ServerComponentType.krumblid, _KrumblidComponentArray, true);