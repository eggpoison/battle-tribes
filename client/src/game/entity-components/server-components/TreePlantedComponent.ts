import { HitFlags } from "../../../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Point, randAngle, randFloat, angle, randItem, randInt } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH, createWoodSpeckParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { TREE_HIT_SOUNDS, TREE_DESTROY_SOUNDS } from "./TreeComponent";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

const enum Var {
   NUM_SAPLING_STAGES = 11
}

export interface TreePlantedComponentData {
   readonly growthProgress: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface TreePlantedComponent {
   growthProgress: number;
   readonly renderPart: TexturedRenderPart;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.treePlanted, TreePlantedComponentArray> {}
}

class TreePlantedComponentArray extends ServerComponentArray<TreePlantedComponent, TreePlantedComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): TreePlantedComponentData {
      const growthProgress = reader.readNumber();
      return {
         growthProgress: growthProgress
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponent.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const growthProgress = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.treePlanted).growthProgress;
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         9,
         0,
         0, 0,
         getTextureIndex(growthProgress)
      );
      renderObject.attachRenderPart(renderPart);

      return {
         renderPart: renderPart
      };
   }

   public createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): TreePlantedComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const growthProgress = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.treePlanted).growthProgress;
      return {
         growthProgress: growthProgress,
         renderPart: intermediateInfo.renderPart
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public updateFromData(data: TreePlantedComponentData, entity: Entity): void {
      const treePlantedComponent = treePlantedComponentArray.getComponent(entity);
      treePlantedComponent.growthProgress = data.growthProgress;
      treePlantedComponent.renderPart.switchTextureSource(getTextureIndex(treePlantedComponent.growthProgress));
   }

   public onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point, hitFlags: number): void {
      const treePlantedComponent = treePlantedComponentArray.getComponent(entity);
      
      const radius = Math.floor(treePlantedComponent.growthProgress * 10);

      // @Cleanup: copy and paste
      const isDamagingHit = (hitFlags & HitFlags.NON_DAMAGING_HIT) === 0;
      
      // Create leaf particles
      {
         const moveDirection = randAngle();

         const spawnPositionX = hitbox.box.posX + radius * Math.sin(moveDirection);
         const spawnPositionY = hitbox.box.posY + radius * Math.cos(moveDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = Math.floor(treePlantedComponent.growthProgress * 7) + 2;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
      }

      if (isDamagingHit) {
         // Create wood specks at the point of hit

         let offsetDirection = angle(hitPosition.x - hitbox.box.posX, hitPosition.y - hitbox.box.posY);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = hitbox.box.posX + (radius + 2) * Math.sin(offsetDirection);
         const spawnPositionY = hitbox.box.posY + (radius + 2) * Math.cos(offsetDirection);
         for (let i = 0; i < 4; i++) {
            createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
         }
         
         playSoundOnHitbox(randItem(TREE_HIT_SOUNDS), 0.4, 1, entity, hitbox, false);
      } else {
         // @Temporary
         playSoundOnHitbox("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
      }
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, entity, hitbox, false);
   }
}

export const treePlantedComponentArray = registerServerComponentArray(ServerComponentType.treePlanted, TreePlantedComponentArray, true);

const getTextureIndex = (growthProgress: number): TextureIndex => {
   const idx = Math.floor(growthProgress * (Var.NUM_SAPLING_STAGES - 1))
   return TextureIndex.entities_plant_treeSapling01 + idx;
}