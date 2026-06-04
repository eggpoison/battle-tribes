import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { Point, randAngle, randFloat, angle, randInt } from "../../../../../shared/src/utils";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { getHitboxTag, Hitbox } from "../../hitboxes";
import { TransformComponentArray } from "./TransformComponent";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain, createHighSnowParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { HealthComponentArray } from "./HealthComponent";
import { randomSoundComponentArray, updateRandomSoundComponentSounds } from "../client-components/RandomSoundComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

const AMBIENT_SOUNDS: ReadonlyArray<string> = ["snobe-ambient-1.mp3", "snobe-ambient-2.mp3", "snobe-ambient-3.mp3", "snobe-ambient-4.mp3"];

export interface SnobeComponentData {
   readonly isDigging: boolean;
   readonly diggingProgress: number;
}

export interface SnobeComponent {
   isDigging: boolean;
   diggingProgress: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.snobe, _SnobeComponentArray> {}
}

class _SnobeComponentArray extends _ServerComponentArray<SnobeComponent, SnobeComponentData> {
   public decodeData(reader: PacketReader): SnobeComponentData {
      const isDigging = reader.readBool();
      const diggingProgress = reader.readNumber();
      return {
         isDigging: isDigging,
         diggingProgress: diggingProgress
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      for (const hitbox of transformComponentData.hitboxes) {
         switch (getHitboxTag(hitbox)) {
            case HitboxTag.snobeBody: {
               const renderPart = new TexturedRenderPart(
                  hitbox,
                  2,
                  0,
                  0, 0,
                  TextureIndex.entities_snobe_body
               );
               addRenderPartTag(renderPart, "tamingComponent:head")
               renderObject.attachRenderPart(renderPart);
               break;
            }
            case HitboxTag.snobeButt: {
               renderObject.attachRenderPart(
                  new TexturedRenderPart(
                     hitbox,
                     1,
                     0,
                     0, 0,
                     TextureIndex.entities_snobe_butt
                  )
               );
               break;
            }
            case HitboxTag.snobeEar: {
               renderObject.attachRenderPart(
                  new TexturedRenderPart(
                     hitbox,
                     3,
                     0,
                     0, 0,
                     TextureIndex.entities_snobe_ear
                  )
               );
               break;
            }
         }
      }
   }

   public createComponent(entityComponentData: EntityComponentData): SnobeComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const snobeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.snobe);
      
      return {
         isDigging: snobeComponentData.isDigging,
         diggingProgress: snobeComponentData.diggingProgress
      };
   }

   public getMaxRenderParts(): number {
      return 4;
   }

   public onTick(snobe: Entity): void {
      const randomSoundComponent = randomSoundComponentArray.getComponent(snobe);
      updateRandomSoundComponentSounds(randomSoundComponent, 3 * Settings.TICK_RATE, 7 * Settings.TICK_RATE, AMBIENT_SOUNDS, 0.3);

      const snobeComponent = SnobeComponentArray.getComponent(snobe);
      if (snobeComponent.isDigging && snobeComponent.diggingProgress < 1 && Math.random() < 15 * Settings.DT_S) {
         const transformComponent = TransformComponentArray.getComponent(snobe);
         const hitbox = transformComponent.hitboxes[0];

         const position = new Point(hitbox.box.posX, hitbox.box.posY).offset(32 * Math.random(), randAngle());
         createHighSnowParticle(position.x, position.y, randFloat(30, 50));
      }
   }
      
   public updateFromData(data: SnobeComponentData, snobe: Entity): void {
      const snobeComponent = SnobeComponentArray.getComponent(snobe);
      snobeComponent.isDigging = data.isDigging;

      snobeComponent.diggingProgress = data.diggingProgress;
      const opacity = 1 - Math.pow(snobeComponent.diggingProgress, 2);
      const renderObject = getEntityRenderObject(snobe);
      for (const renderPart of renderObject.renderPartsByZIndex) {
         // @HACK
         if (renderPart instanceof TexturedRenderPart) {
            renderPart.opacity = opacity;
         }
      }
   }

   public onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
      // @Hack
      const healthComponent = HealthComponentArray.getComponent(entity);
      if (healthComponent.health <= 0) {
         return;
      }

      // Blood pool particles
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(hitbox.box.posX, hitbox.box.posY, 20);
      }
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitPosition.x - hitbox.box.posX, hitPosition.y - hitbox.box.posY);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = hitbox.box.posX + 32 * Math.sin(offsetDirection);
         const spawnPositionY = hitbox.box.posY + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
      }

      playSoundOnHitbox("snobe-hit-" + randInt(1, 3) + ".mp3", 0.2, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      for (let i = 0; i < 3; i++) {
         createBloodPoolParticle(hitbox.box.posX, hitbox.box.posY, 35);
      }

      createBloodParticleFountain(entity, 0.1, 1.1);

      playSoundOnHitbox("snobe-death-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const SnobeComponentArray = registerServerComponentArray(ServerComponentType.snobe, _SnobeComponentArray, true);