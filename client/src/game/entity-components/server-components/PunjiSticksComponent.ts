import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityType, Entity } from "../../../../../shared/src/entities";
import { Settings } from "../../../../../shared/src/settings";
import { randAngle, randFloat } from "../../../../../shared/src/utils";
import { createFlyParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";
import ServerComponentArray from "../ServerComponentArray";

export interface PunjiSticksComponentData {}

export interface PunjiSticksComponent {
   ticksSinceLastFly: number;
   ticksSinceLastFlySound: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.punjiSticks, typeof PunjiSticksComponentArray> {}
}

export const PunjiSticksComponentArray = registerServerComponentArray(
   ServerComponentType.punjiSticks,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
PunjiSticksComponentArray.populateIntermediateInfo = populateIntermediateInfo;
PunjiSticksComponentArray.onTick = onTick;
PunjiSticksComponentArray.onHit = onHit;
PunjiSticksComponentArray.onDie = onDie;

function decodeData(): PunjiSticksComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const isAttachedToWall = entityComponentData.entityType === EntityType.wallPunjiSticks;
   let textureIndex: number;
   if (isAttachedToWall) {
      textureIndex = TextureIndex.entities_wallPunjiSticks_wallPunjiSticks;
   } else {
      textureIndex = TextureIndex.entities_floorPunjiSticks_floorPunjiSticks;
   }

   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      textureIndex
   );
   renderObject.attachRenderPart(renderPart);
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
      const x = hitbox.box.posX+ offsetMagnitude * Math.sin(offsetDirection);
      const y = hitbox.box.posY + offsetMagnitude * Math.cos(offsetDirection);
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

export function createPunjiSticksComponentData(): PunjiSticksComponentData {
   return {};
}