import { PacketReader, Settings, Point, randAngle, randFloat, randInt, Entity, HitboxFlag, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import { Hitbox } from "../../hitboxes";
import { TransformComponentArray } from "./TransformComponent";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain, createHighSnowParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { HealthComponentArray } from "./HealthComponent";
import { RandomSoundComponentArray, updateRandomSoundComponentSounds } from "../client-components/RandomSoundComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";

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
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.snobe, _SnobeComponentArray, SnobeComponentData> {}
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
         if (hitbox.flags.includes(HitboxFlag.SNOBE_BODY)) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               2,
               0,
               0, 0,
               getTextureArrayIndex("entities/snobe/body.png")
            );
            addRenderPartTag(renderPart, "tamingComponent:head")
            renderObject.attachRenderPart(renderPart);
         } else if (hitbox.flags.includes(HitboxFlag.SNOBE_BUTT)) {
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  1,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/snobe/butt.png")
               )
            );
         } else if (hitbox.flags.includes(HitboxFlag.SNOBE_EAR)) {
            renderObject.attachRenderPart(
               new TexturedRenderPart(
                  hitbox,
                  3,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/snobe/ear.png")
               )
            );
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
      const randomSoundComponent = RandomSoundComponentArray.getComponent(snobe);
      updateRandomSoundComponentSounds(randomSoundComponent, 3 * Settings.TICK_RATE, 7 * Settings.TICK_RATE, AMBIENT_SOUNDS, 0.3);

      const snobeComponent = SnobeComponentArray.getComponent(snobe);
      if (snobeComponent.isDigging && snobeComponent.diggingProgress < 1 && Math.random() < 15 * Settings.DT_S) {
         const transformComponent = TransformComponentArray.getComponent(snobe);
         const hitbox = transformComponent.hitboxes[0];

         const position = hitbox.box.position.offset(32 * Math.random(), randAngle());
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
         createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
      }
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = hitbox.box.position.angleTo(hitPosition);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
      }

      playSoundOnHitbox("snobe-hit-" + randInt(1, 3) + ".mp3", 0.2, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      for (let i = 0; i < 3; i++) {
         createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 35);
      }

      createBloodParticleFountain(entity, 0.1, 1.1);

      playSoundOnHitbox("snobe-death-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const SnobeComponentArray = registerServerComponentArray(ServerComponentType.snobe, _SnobeComponentArray, true);