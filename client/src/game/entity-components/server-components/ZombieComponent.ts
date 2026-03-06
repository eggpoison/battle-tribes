import { Entity, PacketReader, Point, randAngle, randFloat, randInt, Settings, ServerComponentType } from "webgl-test-shared";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain } from "../../particles";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface ZombieComponentData {
   readonly zombieType: number;
}

interface IntermediateInfo {}
   
export interface ZombieComponent {
   readonly zombieType: number;
}

const RADIUS = 32;

const ZOMBIE_TEXTURE_SOURCES: ReadonlyArray<string> = ["entities/zombie/zombie1.png", "entities/zombie/zombie2.png", "entities/zombie/zombie3.png", "entities/zombie/zombie-golden.png"];
const ZOMBIE_HAND_TEXTURE_SOURCES: ReadonlyArray<string> = ["entities/zombie/fist-1.png", "entities/zombie/fist-2.png", "entities/zombie/fist-3.png", "entities/zombie/fist-4.png"];

export const ZombieComponentArray = new ServerComponentArray<ZombieComponent, ZombieComponentData, IntermediateInfo>(ServerComponentType.zombie, true, createComponent, getMaxRenderParts, decodeData);
ZombieComponentArray.populateIntermediateInfo = populateIntermediateInfo;
ZombieComponentArray.onTick = onTick;
ZombieComponentArray.onHit = onHit;
ZombieComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): ZombieComponentData {
   const zombieType = reader.readNumber();
   return {
      zombieType: zombieType
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const zombieComponentData = entityComponentData.serverComponentData.get(ServerComponentType.zombie)!;
   const inventoryUseComponentData = entityComponentData.serverComponentData.get(ServerComponentType.inventoryUse)!;

   const bodyRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      getTextureArrayIndex(ZOMBIE_TEXTURE_SOURCES[zombieComponentData.zombieType])
   );
   renderInfo.attachRenderPart(bodyRenderPart);

   // @Hack @Copynpaste

   // Hand render parts
   const handTextureSource = ZOMBIE_HAND_TEXTURE_SOURCES[zombieComponentData.zombieType];
   const handRenderParts = new Array<VisualRenderPart>();
   for (let i = 0; i < inventoryUseComponentData.limbInfos.length; i++) {
      const attachPoint = new RenderAttachPoint(
         bodyRenderPart,
         1,
         0
      );
      if (i === 1) {
         attachPoint.setFlipX(true);
      }
      attachPoint.addTag("inventoryUseComponent:attachPoint");
      renderInfo.attachRenderPart(attachPoint);
      
      const renderPart = new TexturedRenderPart(
         attachPoint,
         1.2,
         0,
         getTextureArrayIndex(handTextureSource)
      );
      renderPart.addTag("inventoryUseComponent:hand");
      renderInfo.attachRenderPart(renderPart);
      handRenderParts.push(renderPart);
   }

   return {};
}

function createComponent(entityComponentData: EntityComponentData): ZombieComponent {
   return {
      zombieType: entityComponentData.serverComponentData.get(ServerComponentType.zombie)!.zombieType
   };
}

function getMaxRenderParts(): number {
   // @Speed: 2 of these are attach points... can they be removed?
   return 5;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   // @Sync should be a server event
   if (Math.random() < 0.1 * Settings.DT_S) {
      playSoundOnHitbox("zombie-ambient-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, true);
   }
}

function onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
   // Blood pool particle
   createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = hitbox.box.position.angleTo(hitPosition);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.position.x + RADIUS * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.position.y + RADIUS * Math.cos(offsetDirection);
   
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
   }

   playSoundOnHitbox("zombie-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
   createBloodParticleFountain(entity, 0.1, 1);

   playSoundOnHitbox("zombie-die-1.mp3", 0.4, 1, entity, hitbox, false);
}