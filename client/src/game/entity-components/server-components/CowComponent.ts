import { HitboxFlag, PacketReader, CowSpecies, Entity, Point, randAngle, randFloat, randInt, Settings, ServerComponentType } from "webgl-test-shared";
import { BloodParticleSize, createBloodParticle, createBloodParticleFountain, createBloodPoolParticle, createDirtParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { RenderPart } from "../../render-parts/render-parts";
import { getHitboxTile, Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";

export interface CowComponentData {
   readonly species: CowSpecies;
   readonly grazeProgress: number;
   readonly isRamming: boolean;
   readonly stamina: number;
}

interface IntermediateInfo {
   readonly headRenderPart: RenderPart;
}

export interface CowComponent {
   readonly species: CowSpecies;
   grazeProgress: number;

   isRamming: boolean;
   
   readonly headRenderPart: RenderPart;

   stamina: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.cow, _CowComponentArray> {}
}

class _CowComponentArray extends _ServerComponentArray<CowComponent, CowComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): CowComponentData {
      const species = reader.readNumber();
      const grazeProgress = reader.readNumber();
      const isRamming = reader.readBool();
      const stamina = reader.readNumber();
      return {
         species: species,
         grazeProgress: grazeProgress,
         isRamming: isRamming,
         stamina: stamina
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const cowComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.cow);
      const cowNum = cowComponentData.species === CowSpecies.brown ? 1 : 2;

      let headRenderPart!: RenderPart;
      for (const hitbox of transformComponentData.hitboxes) {
         if (hitbox.flags.includes(HitboxFlag.COW_BODY)) {
            const bodyRenderPart = new TexturedRenderPart(
               hitbox,
               0,
               0,
               0, 0,
               getTextureArrayIndex(`entities/cow/cow-body-${cowNum}.png`)
            );
            renderObject.attachRenderPart(bodyRenderPart);
         } else if (hitbox.flags.includes(HitboxFlag.COW_HEAD)) {
            // Head
            headRenderPart = new TexturedRenderPart(
               hitbox,
               1,
               0,
               0, 0,
               getTextureArrayIndex(`entities/cow/cow-head-${cowNum}.png`)
            );
            addRenderPartTag(headRenderPart, "tamingComponent:head");
            renderObject.attachRenderPart(headRenderPart);
         }
      }

      return {
         headRenderPart: headRenderPart
      };
   }

   public createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): CowComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const cowComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.cow);
      
      return {
         species: cowComponentData.species,
         grazeProgress: cowComponentData.grazeProgress,
         isRamming: cowComponentData.isRamming,
         headRenderPart: intermediateInfo.headRenderPart,
         stamina: cowComponentData.stamina
      };
   }

   public getMaxRenderParts(): number {
      return 2;
   }

   public onTick(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const cowComponent = CowComponentArray.getComponent(entity);

      if (cowComponent.grazeProgress !== -1 && tickIntervalHasPassed(0.1 * Settings.TICK_RATE)) {
         const hitbox = transformComponent.hitboxes[0];
         
         const spawnOffsetMagnitude = 30 * Math.random();
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createDirtParticle(spawnPositionX, spawnPositionY, ParticleRenderLayer.low);
      }

      if (Math.random() < 0.1 * Settings.DT_S) {
         const hitbox = transformComponent.hitboxes[0];
         playSoundOnHitbox("cow-ambient-" + randInt(1, 3) + ".mp3", 0.2, 1, entity, hitbox, true);
      }
   }

   public updateFromData(data: CowComponentData, entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const cowComponent = CowComponentArray.getComponent(entity);
      
      const grazeProgress = data.grazeProgress;
      
      // When the cow has finished grazing, create a bunch of dirt particles
      if (grazeProgress < cowComponent.grazeProgress) {
         const hitbox = transformComponent.hitboxes[0];
         
         const tile = getHitboxTile(hitbox);
         for (let i = 0; i < 15; i++) {
            const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
            const y = (tile.y + Math.random()) * Settings.TILE_SIZE;
            createDirtParticle(x, y, ParticleRenderLayer.low);
         }
      }
      cowComponent.grazeProgress = grazeProgress;

      const isRamming = data.isRamming;
      if (isRamming && !cowComponent.isRamming) {
         const hitbox = transformComponent.hitboxes[0];
         playSoundOnHitbox("cow-angry.mp3", 0.4, 1, entity, hitbox, true);
      }
      cowComponent.isRamming = isRamming;

      cowComponent.stamina = data.stamina;
   }

   public onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
      // Blood pool particles
      for (let i = 0; i < 2; i++) {
         createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
      }

      // Blood particles
      for (let i = 0; i < 10; i++) {
         let offsetDirection = hitbox.box.position.angleTo(hitPosition);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = hitbox.box.position.x + 32 * Math.sin(offsetDirection);
         const spawnPositionY = hitbox.box.position.y + 32 * Math.cos(offsetDirection);
         createBloodParticle(Math.random() < 0.6 ? BloodParticleSize.small : BloodParticleSize.large, spawnPositionX, spawnPositionY, randAngle(), randFloat(150, 250), true);
      }

      playSoundOnHitbox("cow-hurt-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      for (let i = 0; i < 3; i++) {
         createBloodPoolParticle(hitbox.box.position.x, hitbox.box.position.y, 35);
      }

      createBloodParticleFountain(entity, 0.1, 1.1);

      playSoundOnHitbox("cow-die-1.mp3", 0.2, 1, entity, hitbox, false);
   }
}

export const CowComponentArray = registerServerComponentArray(ServerComponentType.cow, _CowComponentArray, true);