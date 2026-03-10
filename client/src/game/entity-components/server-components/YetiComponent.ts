import { HitboxFlag, Entity, Settings, ServerComponentType, PacketReader, lerp, Point, randAngle, randFloat, randItem } from "webgl-test-shared";
import { VisualRenderPart } from "../../render-parts/render-parts";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createSnowParticle, createWhiteSmokeParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { RandomSoundComponentArray, updateRandomSoundComponentSounds } from "../client-components/RandomSoundComponent";
import { TransformComponentArray } from "./TransformComponent";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

const enum Vars {
   SNOW_THROW_OFFSET = 64
}

export interface YetiComponentData {
   readonly isAttacking: boolean;
   readonly attackProgress: number;
}

interface IntermediateInfo {
   readonly pawRenderParts: ReadonlyArray<VisualRenderPart>;
}

export interface YetiComponent {
   lastAttackProgress: number;
   attackProgress: number;

   readonly pawRenderParts: ReadonlyArray<VisualRenderPart>;
}

export const YETI_SIZE = 128;

const BLOOD_POOL_SIZE = 30;

const YETI_PAW_START_ANGLE = Math.PI/3;
const YETI_PAW_END_ANGLE = Math.PI/6;

const AMBIENT_SOUNDS: ReadonlyArray<string> = ["yeti-ambient-1.mp3", "yeti-ambient-2.mp3", "yeti-ambient-3.mp3", "yeti-ambient-4.mp3", "yeti-ambient-5.mp3", "yeti-ambient-6.mp3"];
const ANGRY_SOUNDS: ReadonlyArray<string> = ["yeti-angry-1.mp3", "yeti-angry-2.mp3", "yeti-angry-3.mp3", "yeti-angry-4.mp3", "yeti-angry-5.mp3"];
const HURT_SOUNDS: ReadonlyArray<string> = ["yeti-hurt-1.mp3", "yeti-hurt-2.mp3", "yeti-hurt-3.mp3", "yeti-hurt-4.mp3", "yeti-hurt-5.mp3"];
const DEATH_SOUNDS: ReadonlyArray<string> = ["yeti-death-1.mp3", "yeti-death-2.mp3"];

export const YetiComponentArray = new ServerComponentArray<YetiComponent, YetiComponentData, IntermediateInfo>(ServerComponentType.yeti, true, createComponent, getMaxRenderParts, decodeData);
YetiComponentArray.populateIntermediateInfo = populateIntermediateInfo;
YetiComponentArray.onTick = onTick;
YetiComponentArray.onHit = onHit;
YetiComponentArray.onDie = onDie;
YetiComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): YetiComponentData {
   const isAttacking = reader.readBool();
   const attackProgress = reader.readNumber();
   return {
      isAttacking: isAttacking,
      attackProgress: attackProgress
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

   const pawRenderParts = new Array<VisualRenderPart>();
   for (const hitbox of transformComponentData.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.YETI_BODY)) {
         const bodyRenderPart = new TexturedRenderPart(
            hitbox,
            1,
            0,
            getTextureArrayIndex("entities/yeti/yeti.png")
         );
         renderInfo.attachRenderPart(bodyRenderPart);

         for (let i = 0; i < 2; i++) {
            const paw = new TexturedRenderPart(
               bodyRenderPart,
               0,
               0,
               getTextureArrayIndex("entities/yeti/yeti-paw.png")
            );
            pawRenderParts.push(paw);
            renderInfo.attachRenderPart(paw);
         }
      } else if (hitbox.flags.includes(HitboxFlag.YETI_HEAD)) {
         const headRenderPart = new TexturedRenderPart(
            hitbox,
            1,
            0,
            getTextureArrayIndex("entities/yeti/yeti-head.png")
         );
         headRenderPart.addTag("tamingComponent:head");
         renderInfo.attachRenderPart(headRenderPart);
      }
   }

   return {
      pawRenderParts: pawRenderParts
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): YetiComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const yetiComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.yeti);
   
   return {
      lastAttackProgress: yetiComponentData.attackProgress,
      attackProgress: yetiComponentData.attackProgress,
      pawRenderParts: intermediateInfo.pawRenderParts
   };
}

function getMaxRenderParts(): number {
   return 4;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const yetiComponent = YetiComponentArray.getComponent(entity);

   // Create snow impact particles when the Yeti does a throw attack
   if (yetiComponent.attackProgress === 0 && yetiComponent.lastAttackProgress !== 0) {
      const offsetMagnitude = Vars.SNOW_THROW_OFFSET + 20;
      const impactPositionX = hitbox.box.position.x + offsetMagnitude * Math.sin(hitbox.box.angle);
      const impactPositionY = hitbox.box.position.y + offsetMagnitude * Math.cos(hitbox.box.angle);
      
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

function onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
   playSoundOnHitbox(randItem(HURT_SOUNDS), 0.7, 1, entity, hitbox, false);

   // Blood pool particle
   createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, BLOOD_POOL_SIZE);
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = hitbox.box.position.angleTo(hitPosition);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + YETI_SIZE / 2 * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + YETI_SIZE / 2 * Math.cos(offsetDirection);
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   playSoundOnHitbox(randItem(DEATH_SOUNDS), 0.7, 1, entity, hitbox, false);

   createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, BLOOD_POOL_SIZE);

   createBloodParticleFountain(entity, 0.15, 1.6);
}

const updatePaws = (yetiComponent: YetiComponent): void => {
   let attackProgress = yetiComponent.attackProgress;
   attackProgress = Math.pow(attackProgress, 0.75);
   
   for (let i = 0; i < 2; i++) {
      const paw = yetiComponent.pawRenderParts[i];

      const angle = lerp(YETI_PAW_END_ANGLE, YETI_PAW_START_ANGLE, attackProgress) * (i === 0 ? 1 : -1);
      paw.offset.x = YETI_SIZE/2 * Math.sin(angle);
      paw.offset.y = YETI_SIZE/2 * Math.cos(angle);
   }
}

function updateFromData(data: YetiComponentData, entity: Entity): void {
   const yetiComponent = YetiComponentArray.getComponent(entity);
   
   const isAttacking = data.isAttacking;
   yetiComponent.attackProgress = data.attackProgress;
   updatePaws(yetiComponent);

   const randomSoundComponent = RandomSoundComponentArray.getComponent(entity);
   if (isAttacking) {
      updateRandomSoundComponentSounds(randomSoundComponent, 3.5 * Settings.TICK_RATE, 5.5 * Settings.TICK_RATE, ANGRY_SOUNDS, 0.7);
   } else {
      updateRandomSoundComponentSounds(randomSoundComponent, 7 * Settings.TICK_RATE, 11 * Settings.TICK_RATE, AMBIENT_SOUNDS, 0.7);
   }
}