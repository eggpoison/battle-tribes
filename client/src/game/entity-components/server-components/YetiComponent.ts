import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { randFloat, randAngle, Point, randItem, angle, lerp } from "../../../../../shared/src/utils";
import { VisualRenderPart } from "../../render-parts/render-parts";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createSnowParticle, createWhiteSmokeParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { randomSoundComponentArray, updateRandomSoundComponentSounds } from "../client-components/RandomSoundComponent";
import { TransformComponentArray } from "./TransformComponent";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";
import { getHitboxTag, Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

const enum Var {
   SNOW_THROW_OFFSET = 64
}

export interface YetiComponentData {
   readonly isAttacking: boolean;
   readonly attackProgress: number;
}

interface IntermediateInfo {
   readonly pawRenderParts: readonly VisualRenderPart[];
}

export interface YetiComponent {
   lastAttackProgress: number;
   attackProgress: number;

   readonly pawRenderParts: readonly VisualRenderPart[];
}

declare module "../component-registry" {
   interface ServerComponentRegistry {
      [ServerComponentType.yeti]: YetiComponentArray
   }
}

export const YETI_SIZE = 128;

const BLOOD_POOL_SIZE = 30;

const YETI_PAW_START_ANGLE = Math.PI/3;
const YETI_PAW_END_ANGLE = Math.PI/6;

const AMBIENT_SOUNDS: readonly string[] = ["yeti-ambient-1.mp3", "yeti-ambient-2.mp3", "yeti-ambient-3.mp3", "yeti-ambient-4.mp3", "yeti-ambient-5.mp3", "yeti-ambient-6.mp3"];
const ANGRY_SOUNDS: readonly string[] = ["yeti-angry-1.mp3", "yeti-angry-2.mp3", "yeti-angry-3.mp3", "yeti-angry-4.mp3", "yeti-angry-5.mp3"];
const HURT_SOUNDS: readonly string[] = ["yeti-hurt-1.mp3", "yeti-hurt-2.mp3", "yeti-hurt-3.mp3", "yeti-hurt-4.mp3", "yeti-hurt-5.mp3"];
const DEATH_SOUNDS: readonly string[] = ["yeti-death-1.mp3", "yeti-death-2.mp3"];

class YetiComponentArray extends ServerComponentArray<YetiComponent, YetiComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): YetiComponentData {
      const isAttacking = reader.readBool();
      const attackProgress = reader.readNumber();
      return {
         isAttacking: isAttacking,
         attackProgress: attackProgress
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

      const pawRenderParts: VisualRenderPart[] = [];
      for (const hitbox of transformComponentData.hitboxes) {
         const tag = getHitboxTag(hitbox);
         if (tag === HitboxTag.yetiBody) {
            const bodyRenderPart = new TexturedRenderPart(
               hitbox,
               1,
               0,
               0, 0,
               TextureIndex.entities_yeti_yeti
            );
            renderObject.attachRenderPart(bodyRenderPart);

            for (let i = 0; i < 2; i++) {
               const paw = new TexturedRenderPart(
                  bodyRenderPart,
                  0,
                  0,
                  0, 0,
                  TextureIndex.entities_yeti_yetiPaw
               );
               pawRenderParts.push(paw);
               renderObject.attachRenderPart(paw);
            }
         } else if (tag === HitboxTag.yetiHead) {
            const headRenderPart = new TexturedRenderPart(
               hitbox,
               1,
               0,
               0, 0,
               TextureIndex.entities_yeti_yetiHead
            );
            addRenderPartTag(headRenderPart, "tamingComponent:head");
            renderObject.attachRenderPart(headRenderPart);
         }
      }

      return {
         pawRenderParts: pawRenderParts
      };
   }

   public createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): YetiComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const yetiComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.yeti);
      
      return {
         lastAttackProgress: yetiComponentData.attackProgress,
         attackProgress: yetiComponentData.attackProgress,
         pawRenderParts: intermediateInfo.pawRenderParts
      };
   }

   public getMaxRenderParts(): number {
      return 4;
   }

   public onTick(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      
      const yetiComponent = yetiComponentArray.getComponent(entity);

      // Create snow impact particles when the Yeti does a throw attack
      if (yetiComponent.attackProgress === 0 && yetiComponent.lastAttackProgress !== 0) {
         const offsetMagnitude = Var.SNOW_THROW_OFFSET + 20;
         const impactPositionX = hitbox.box.posX + offsetMagnitude * Math.sin(hitbox.box.angle);
         const impactPositionY = hitbox.box.posY + offsetMagnitude * Math.cos(hitbox.box.angle);
         
         for (let i = 0; i < 30; i++) {
            const offsetMagnitude = randFloat(0, 20);
            const offsetDirection = randAngle();
            const positionX = impactPositionX + offsetMagnitude * Math.sin(offsetDirection);
            const positionY = impactPositionY + offsetMagnitude * Math.cos(offsetDirection);
            
            createSnowParticle(positionX, positionY, randFloat(40, 100));
         }

         // White smoke particles
         for (let i = 0; i < 10; i++) {
            const spawnPositionX = impactPositionX;
            const spawnPositionY = impactPositionY;
            createWhiteSmokeParticle(spawnPositionX, spawnPositionY, 1);
         }
      }
      yetiComponent.lastAttackProgress = yetiComponent.attackProgress;
   }

   public onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
      playSoundOnHitbox(randItem(HURT_SOUNDS), 0.7, 1, entity, hitbox, false);

      // Blood pool particle
      createBloodPoolParticle(hitbox.box.posX, hitbox.box.posY, BLOOD_POOL_SIZE);
      
      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = angle(hitPosition.x - hitbox.box.posX, hitPosition.y - hitbox.box.posY);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = hitbox.box.posX + YETI_SIZE / 2 * Math.sin(offsetDirection);
         const spawnPositionY = hitbox.box.posY + YETI_SIZE / 2 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
      }
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      playSoundOnHitbox(randItem(DEATH_SOUNDS), 0.7, 1, entity, hitbox, false);

      createBloodPoolParticle(hitbox.box.posX, hitbox.box.posY, BLOOD_POOL_SIZE);

      createBloodParticleFountain(entity, 0.15, 1.6);
   }

   public updateFromData(data: YetiComponentData, entity: Entity): void {
      const yetiComponent = yetiComponentArray.getComponent(entity);
      
      const isAttacking = data.isAttacking;
      yetiComponent.attackProgress = data.attackProgress;
      updatePaws(yetiComponent);

      const randomSoundComponent = randomSoundComponentArray.getComponent(entity);
      if (isAttacking) {
         updateRandomSoundComponentSounds(randomSoundComponent, 3.5 * Settings.TICK_RATE, 5.5 * Settings.TICK_RATE, ANGRY_SOUNDS, 0.7);
      } else {
         updateRandomSoundComponentSounds(randomSoundComponent, 7 * Settings.TICK_RATE, 11 * Settings.TICK_RATE, AMBIENT_SOUNDS, 0.7);
      }
   }
}

export const yetiComponentArray = registerServerComponentArray(ServerComponentType.yeti, YetiComponentArray, true);

const updatePaws = (yetiComponent: YetiComponent): void => {
   let attackProgress = yetiComponent.attackProgress;
   attackProgress = Math.pow(attackProgress, 0.75);
   
   for (let i = 0; i < 2; i++) {
      const paw = yetiComponent.pawRenderParts[i];

      const angle = lerp(YETI_PAW_END_ANGLE, YETI_PAW_START_ANGLE, attackProgress) * (i === 0 ? 1 : -1);
      paw.offsetX = YETI_SIZE/2 * Math.sin(angle);
      paw.offsetY = YETI_SIZE/2 * Math.cos(angle);
   }
}