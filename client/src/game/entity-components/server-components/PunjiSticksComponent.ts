import { Entity, EntityType, randAngle, randFloat, Settings, ServerComponentType } from "webgl-test-shared";
import { createFlyParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface PunjiSticksComponentData {}

export interface PunjiSticksComponent {
   ticksSinceLastFly: number;
   ticksSinceLastFlySound: number;
}

class _PunjiSticksComponentArray extends ServerComponentArray<PunjiSticksComponent, PunjiSticksComponentData> {
   public decodeData(): PunjiSticksComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const isAttachedToWall = entityComponentData.entityType === EntityType.wallPunjiSticks;
      let textureArrayIndex: number;
      if (isAttachedToWall) {
         textureArrayIndex = getTextureArrayIndex("entities/wall-punji-sticks/wall-punji-sticks.png");
      } else {
         textureArrayIndex = getTextureArrayIndex("entities/floor-punji-sticks/floor-punji-sticks.png");
      }

      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         textureArrayIndex
      );
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): PunjiSticksComponent {
      return {
         ticksSinceLastFly: 0,
         ticksSinceLastFlySound: 0
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }
      
   public onTick(entity: Entity): void {
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

   public onHit(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("wooden-spikes-hit.mp3", 0.3, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("wooden-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const PunjiSticksComponentArray = registerServerComponentArray(ServerComponentType.punjiSticks, _PunjiSticksComponentArray, true);

export function createPunjiSticksComponentData(): PunjiSticksComponentData {
   return {};
}