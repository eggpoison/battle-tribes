import { ServerComponentType } from "webgl-test-shared/src/components";
import { Settings } from "webgl-test-shared/src/settings";
import { randAngle, randFloat } from "webgl-test-shared/src/utils";
import { createFlyParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { Entity, EntityType } from "../../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface PunjiSticksComponentData {}

interface IntermediateInfo {}

export interface PunjiSticksComponent {
   ticksSinceLastFly: number;
   ticksSinceLastFlySound: number;
}

export const PunjiSticksComponentArray = new ServerComponentArray<PunjiSticksComponent, PunjiSticksComponentData, IntermediateInfo>(ServerComponentType.punjiSticks, true, createComponent, getMaxRenderParts, decodeData);
PunjiSticksComponentArray.populateIntermediateInfo = populateIntermediateInfo;
PunjiSticksComponentArray.onTick = onTick;
PunjiSticksComponentArray.onHit = onHit;
PunjiSticksComponentArray.onDie = onDie;

export function createPunjiSticksComponentData(): PunjiSticksComponentData {
   return {};
}

function decodeData(): PunjiSticksComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const isAttachedToWall = entityComponentData.entityType === EntityType.wallPunjiSticks;
   let textureArrayIndex: number;
   if (isAttachedToWall) {
      textureArrayIndex = getTextureArrayIndex("entities/wall-punji-sticks/wall-punji-sticks.png");
   } else {
      textureArrayIndex = getTextureArrayIndex("entities/floor-punji-sticks/floor-punji-sticks.png");
   }

   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      textureArrayIndex
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): PunjiSticksComponent {
   return {
      ticksSinceLastFly: 0,
      ticksSinceLastFlySound: 0
   };
}

function getMaxRenderParts(): number {
   return 1;
}
   
function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const punjiSticksComponent = PunjiSticksComponentArray.getComponent(entity);

   punjiSticksComponent.ticksSinceLastFly++;
   const flyChance = ((punjiSticksComponent.ticksSinceLastFly * Settings.DT_S) - 0.25) * 0.2;
   if (Math.random() * Settings.DT_S < flyChance) {
      const hitbox = transformComponent.hitboxes[0];
      
      const offsetMagnitude = 32 * Math.random();
      const offsetDirection = randAngle();
      const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
      createFlyParticle(x, y);
      punjiSticksComponent.ticksSinceLastFly = 0;
   }

   punjiSticksComponent.ticksSinceLastFlySound++;
   const soundChance = ((punjiSticksComponent.ticksSinceLastFlySound * Settings.DT_S) - 0.3) * 2;
   if (Math.random() < soundChance * Settings.DT_S) {
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("flies.mp3", 0.15, randFloat(0.9, 1.1), entity, hitbox, false);
      punjiSticksComponent.ticksSinceLastFlySound = 0;
   }
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("wooden-spikes-hit.mp3", 0.3, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("wooden-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
}