import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { randInt, Point, angle, randAngle, randFloat } from "../../../../../shared/src/utils";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { createBloodPoolParticle, createBloodParticle, BloodParticleSize, createBloodParticleFountain } from "../../particles";
import RenderAttachPoint from "../../render-parts/RenderAttachPoint";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface ZombieComponentData {
   readonly zombieType: number;
}

export interface ZombieComponent {
   readonly zombieType: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.zombie, typeof ZombieComponentArray> {}
}

const RADIUS = 32;

const ZOMBIE_TEXTURE_INDEXES: readonly TextureIndex[] = [TextureIndex.entities_zombie_zombie1, TextureIndex.entities_zombie_zombie2, TextureIndex.entities_zombie_zombie3, TextureIndex.entities_zombie_zombieGolden];

export const ZombieComponentArray = registerServerComponentArray(
   ServerComponentType.zombie,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
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

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const zombieComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.zombie);
   const inventoryUseComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.inventoryUse);

   const bodyRenderPart = new TexturedRenderPart(
      hitbox,
      2,
      0,
      0, 0,
      ZOMBIE_TEXTURE_INDEXES[zombieComponentData.zombieType]
   );
   renderObject.attachRenderPart(bodyRenderPart);

   // @Hack @Copynpaste

   // Hand render parts
   const handRenderParts: VisualRenderPart[] = [];
   for (let i = 0; i < inventoryUseComponentData.limbInfos.length; i++) {
      const attachPoint = new RenderAttachPoint(
         bodyRenderPart,
         1,
         0,
         0, 0
      );
      if (i === 1) {
         attachPoint.setFlipX(true);
      }
      addRenderPartTag(attachPoint, "inventoryUseComponent:attachPoint");
      renderObject.attachRenderPart(attachPoint);
      
      const renderPart = new TexturedRenderPart(
         attachPoint,
         1.2,
         0,
         0, 0,
         TextureIndex.entities_zombie_fist1 + zombieComponentData.zombieType
      );
      addRenderPartTag(renderPart, "inventoryUseComponent:hand");
      renderObject.attachRenderPart(renderPart);
      handRenderParts.push(renderPart);
   }
}

function createComponent(entityComponentData: EntityComponentData): ZombieComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const zombieComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.zombie);
   return {
      zombieType: zombieComponentData.zombieType
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
   createBloodPoolParticle(hitbox.box.posX, hitbox.box.posY, 20);
   
   // Blood particles
   for (let i = 0; i < 10; i++) {
      let offsetDirection = angle(hitPosition.x - hitbox.box.posX, hitPosition.y - hitbox.box.posY);
      offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

      const spawnPositionX = hitbox.box.posX + RADIUS * Math.sin(offsetDirection);
      const spawnPositionY = hitbox.box.posY + RADIUS * Math.cos(offsetDirection);
   
      createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
   }

   playSoundOnHitbox("zombie-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   createBloodPoolParticle(hitbox.box.posX, hitbox.box.posY, 20);
   createBloodParticleFountain(entity, 0.1, 1);

   playSoundOnHitbox("zombie-die-1.mp3", 0.4, 1, entity, hitbox, false);
}