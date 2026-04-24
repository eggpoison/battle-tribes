import { TileType, ServerComponentType, PacketReader, Entity, FishColour, randAngle, randFloat, randInt, Settings } from "webgl-test-shared";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createWaterSplashParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { playSoundOnHitbox } from "../../sound";
import { getHitboxTile, Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface FishComponentData {
   readonly colour: FishColour;
}

export interface FishComponent {
   readonly colour: FishColour;
   readonly waterOpacityMultiplier: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fish, _FishComponentArray> {}
}

const TEXTURE_SOURCES: Record<FishColour, string> = {
   [FishColour.blue]: "entities/fish/fish-blue.png",
   [FishColour.gold]: "entities/fish/fish-gold.png",
   [FishColour.red]: "entities/fish/fish-red.png",
   [FishColour.lime]: "entities/fish/fish-lime.png"
};

class _FishComponentArray extends _ServerComponentArray<FishComponent, FishComponentData> {
   public decodeData(reader: PacketReader): FishComponentData {
      const colour = reader.readNumber();
      return {
         colour: colour
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const fishComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.fish);
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex(TEXTURE_SOURCES[fishComponentData.colour])
         )
      );
   }

   public createComponent(entityComponentData: EntityComponentData): FishComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const fishComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.fish);

      return {
         colour: fishComponentData.colour,
         waterOpacityMultiplier: randFloat(0.6, 1)
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onTick(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      
      const tile = getHitboxTile(hitbox);
      if (tile.type !== TileType.water && tickIntervalHasPassed(0.4 * Settings.TICK_RATE)) {
         for (let i = 0; i < 8; i++) {
            const spawnOffsetDirection = randAngle();
            const spawnPositionX = hitbox.box.position.x + 8 * Math.sin(spawnOffsetDirection);
            const spawnPositionY = hitbox.box.position.y + 8 * Math.cos(spawnOffsetDirection);

            createWaterSplashParticle(spawnPositionX, spawnPositionY);
         }
      }
   }
      
   public onHit(entity: Entity, hitbox: Hitbox): void {
      // Blood particles
      for (let i = 0; i < 5; i++) {
         const position = hitbox.box.position.offset(16, randAngle());
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, position.x, position.y, randAngle(), randFloat(150, 250), true);
      }

      playSoundOnHitbox("fish-hurt-" + randInt(1, 4) + ".mp3", 0.4, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      createBloodParticleFountain(entity, 0.1, 0.8);
      
      playSoundOnHitbox("fish-die-1.mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const FishComponentArray = registerServerComponentArray(ServerComponentType.fish, _FishComponentArray, true);