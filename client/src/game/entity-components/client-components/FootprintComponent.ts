import { Entity, TileType, randInt, Settings } from "webgl-test-shared";
import { playSound } from "../../sound";
import { createFootprintParticle } from "../../particles";
import { EntityComponentData, getEntityLayer } from "../../world";
import { TransformComponentArray } from "../server-components/TransformComponent";
import ClientComponentArray from "../ClientComponentArray";
import { ClientComponentType } from "../client-component-types";
import { getHitboxTile, getHitboxVelocity } from "../../hitboxes";
import { tickIntervalHasPassed } from "../../game";
import { getEntityClientComponentTypes } from "../../entity-component-types";
import { getClientComponentData } from "../../entity-component-types";
import { hitboxIsInWater } from "../../collision";

export interface FootprintComponentData {
   readonly footstepParticleIntervalSeconds: number;
   readonly footstepOffset: number;
   readonly footstepSize: number;
   readonly footstepLifetime: number;
   readonly footstepSoundIntervalDist: number;
   readonly doDoubleFootprints: boolean;
}

export interface FootprintComponent {
   readonly footstepParticleIntervalSeconds: number;
   readonly footstepOffset: number;
   readonly footstepSize: number;
   readonly footstepLifetime: number;
   readonly footstepSoundIntervalDist: number;
   readonly doDoubleFootprints: boolean;
   
   numFootstepsTaken: number;
   distanceTracker: number;
}

export const FootprintComponentArray = new ClientComponentArray<FootprintComponent>(ClientComponentType.footprint, true, createComponent, getMaxRenderParts);
FootprintComponentArray.onTick = onTick;

export function createFootprintComponentData(footstepParticleIntervalSeconds: number, footstepOffset: number, footstepSize: number, footstepLifetime: number, footstepSoundIntervalDist: number, doDoubleFootprints: boolean): FootprintComponentData {
   return {
      footstepParticleIntervalSeconds: footstepParticleIntervalSeconds,
      footstepOffset: footstepOffset,
      footstepSize: footstepSize,
      footstepLifetime: footstepLifetime,
      footstepSoundIntervalDist: footstepSoundIntervalDist,
      doDoubleFootprints: doDoubleFootprints
   };
}

function createComponent(entityComponentData: EntityComponentData): FootprintComponent {
   const clientComponentTypes = getEntityClientComponentTypes(entityComponentData.entityType);
   const footprintComponentData = getClientComponentData(entityComponentData.clientComponentData, clientComponentTypes, ClientComponentType.footprint);
   
   return {
      footstepParticleIntervalSeconds: footprintComponentData.footstepParticleIntervalSeconds,
      footstepOffset: footprintComponentData.footstepOffset,
      footstepSize: footprintComponentData.footstepSize,
      footstepLifetime: footprintComponentData.footstepLifetime,
      footstepSoundIntervalDist: footprintComponentData.footstepSoundIntervalDist,
      doDoubleFootprints: footprintComponentData.doDoubleFootprints,
      numFootstepsTaken: 0,
      distanceTracker: 0
   }
}

function getMaxRenderParts(): number {
   return 0;
}

const createFootstepSound = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const layer = getEntityLayer(entity);
   
   const tile = getHitboxTile(hitbox);
   switch (tile.type) {
      case TileType.grass:
      case TileType.sandyDirt: {
         playSound("grass-walk-" + randInt(1, 4) + ".mp3", 0.04, 1, hitbox.box.position, layer);
         break;
      }
      case TileType.sand: {
         playSound("sand-walk-" + randInt(1, 4) + ".mp3", 0.02, 1, hitbox.box.position, layer);
         break;
      }
      case TileType.snow: {
         playSound("snow-walk-" + randInt(1, 3) + ".mp3", 0.1, 1, hitbox.box.position, layer);
         break;
      }
      case TileType.rock: {
         playSound("rock-walk-" + randInt(1, 4) + ".mp3", 0.08, 1, hitbox.box.position, layer);
         break;
      }
      case TileType.water: {
         // @Hack
         // For walking on river stepping stones
         if (!hitboxIsInWater(hitbox)) {
            playSound("rock-walk-" + randInt(1, 4) + ".mp3", 0.08, 1, hitbox.box.position, layer);
         }
         break;
      }
   }
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const hitbox = transformComponent.hitboxes[0];
   if (hitbox.parent === null) {
      const footprintComponent = FootprintComponentArray.getComponent(entity);
      
      const velocity = getHitboxVelocity(hitbox);
      
      // Footsteps
      if (velocity.magnitude() >= 50 && !hitboxIsInWater(hitbox) && tickIntervalHasPassed(footprintComponent.footstepParticleIntervalSeconds)) {
         if (footprintComponent.doDoubleFootprints) {
            createFootprintParticle(entity, false, footprintComponent.footstepOffset, footprintComponent.footstepSize, footprintComponent.footstepLifetime);
            createFootprintParticle(entity, true, footprintComponent.footstepOffset, footprintComponent.footstepSize, footprintComponent.footstepLifetime);
         } else {
            createFootprintParticle(entity, footprintComponent.numFootstepsTaken % 2 === 0, footprintComponent.footstepOffset, footprintComponent.footstepSize, footprintComponent.footstepLifetime);
         }
         footprintComponent.numFootstepsTaken++;
      }
      footprintComponent.distanceTracker += velocity.magnitude() * Settings.DT_S;
      if (footprintComponent.distanceTracker > footprintComponent.footstepSoundIntervalDist) {
         footprintComponent.distanceTracker -= footprintComponent.footstepSoundIntervalDist;
         createFootstepSound(entity);
      }
   }
}