import { PacketReader, Point, randAngle, randFloat, randInt, randItem, Settings, DeathInfo, Entity, DamageSource, ServerComponentType, RectangularBox } from "webgl-test-shared";
import { createDirtParticle, createRockParticle, createRockSpeckParticle } from "../../particles";
import { playSound, playSoundOnHitbox, ROCK_DESTROY_SOUNDS, ROCK_HIT_SOUNDS } from "../../sound";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { EntityComponentData, getEntityAgeTicks, getEntityLayer } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface TombstoneComponentData {
   readonly tombstoneType: number;
   readonly zombieSpawnProgress: number;
   readonly zombieSpawnX: number;
   readonly zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

export interface TombstoneComponent {
   readonly tombstoneType: number;
   zombieSpawnProgress: number;
   zombieSpawnX: number;
   zombieSpawnY: number;
   readonly deathInfo: DeathInfo | null;
}

class _TombstoneComponentArray extends ServerComponentArray<TombstoneComponent> {
   public decodeData(reader: PacketReader): TombstoneComponentData {
      const tombstoneType = reader.readNumber();
      const zombieSpawnProgress = reader.readNumber();
      const zombieSpawnX = reader.readNumber();
      const zombieSpawnY = reader.readNumber();

      const hasDeathInfo = reader.readBool();
      
      let deathInfo: DeathInfo | null;
      if (hasDeathInfo) {
         const username = reader.readString();
         const damageSource = reader.readNumber() as DamageSource;
         deathInfo = {
            username: username,
            damageSource: damageSource
         };
      } else {
         deathInfo = null;
      }

      return {
         tombstoneType: tombstoneType,
         zombieSpawnProgress: zombieSpawnProgress,
         zombieSpawnX: zombieSpawnX,
         zombieSpawnY: zombieSpawnY,
         deathInfo: deathInfo
      };
   }

   public createComponent(entityComponentData: EntityComponentData): TombstoneComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tombstoneComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tombstone);
      return {
         tombstoneType: tombstoneComponentData.tombstoneType,
         zombieSpawnProgress: tombstoneComponentData.zombieSpawnProgress,
         zombieSpawnX: tombstoneComponentData.zombieSpawnX,
         zombieSpawnY: tombstoneComponentData.zombieSpawnY,
         deathInfo: tombstoneComponentData.deathInfo
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tombstoneComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tombstone);
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex(`entities/tombstone/tombstone${tombstoneComponentData.tombstoneType + 1}.png`)
         )
      );
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onTick(entity: Entity): void {
      const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
      if (tombstoneComponent.zombieSpawnProgress !== -1) {
         // Create zombie digging particles
         if (tombstoneComponent.zombieSpawnProgress < 0.8) {
            if (Math.random() < 7.5 * Settings.DT_S) {
               createDirtParticle(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY, ParticleRenderLayer.low);
            }
         } else {
            if (Math.random() < 20 * Settings.DT_S) {
               createDirtParticle(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY, ParticleRenderLayer.low);
            }
         }

         if (getEntityAgeTicks(entity) % 6 === 0) {
            playSound("zombie-dig-" + randInt(1, 5) + ".mp3", 0.15, 1, new Point(tombstoneComponent.zombieSpawnX, tombstoneComponent.zombieSpawnY), getEntityLayer(entity));
         }
      }
   }

   public updateFromData(data: TombstoneComponentData, entity: Entity): void {
      const tombstoneComponent = TombstoneComponentArray.getComponent(entity);
      
      tombstoneComponent.zombieSpawnProgress = data.zombieSpawnProgress;
      tombstoneComponent.zombieSpawnX = data.zombieSpawnX;
      tombstoneComponent.zombieSpawnY = data.zombieSpawnY;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      const width = (hitbox.box as RectangularBox).width;
      const height = (hitbox.box as RectangularBox).height;
      
      for (let i = 0; i < 4; i++) {
         const spawnPositionX = hitbox.box.position.x + randFloat(-width/2, width/2);
         const spawnPositionY = hitbox.box.position.y + randFloat(-height/2, height/2);

         // @HACK @Robustness
         let moveDirection = Math.PI/2 - Math.atan2(spawnPositionY, spawnPositionX);
         moveDirection += randFloat(-1, 1);
         
         createRockParticle(spawnPositionX, spawnPositionY, moveDirection, randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 8; i++) {
         const spawnPositionX = hitbox.box.position.x + randFloat(-width/2, width/2);
         const spawnPositionY = hitbox.box.position.y + randFloat(-height/2, height/2);

         createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
      }

      // @Hack @Temporary
      playSoundOnHitbox(randItem(ROCK_HIT_SOUNDS), 0.3, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      const width = (hitbox.box as RectangularBox).width;
      const height = (hitbox.box as RectangularBox).height;

      for (let i = 0; i < 8; i++) {
         const spawnPositionX = hitbox.box.position.x + randFloat(-width/2, width/2);
         const spawnPositionY = hitbox.box.position.y + randFloat(-height/2, height/2);

         createRockParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 125), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         const spawnPositionX = hitbox.box.position.x + randFloat(-width/2, width/2);
         const spawnPositionY = hitbox.box.position.y + randFloat(-height/2, height/2);

         createRockSpeckParticle(spawnPositionX, spawnPositionY, 0, 0, 0, ParticleRenderLayer.low);
      }

      // @Hack @Temporary
      playSoundOnHitbox(randItem(ROCK_DESTROY_SOUNDS), 0.4, 1, entity, hitbox, false);
   }
}

export const TombstoneComponentArray = registerServerComponentArray(ServerComponentType.tombstone, _TombstoneComponentArray, true);