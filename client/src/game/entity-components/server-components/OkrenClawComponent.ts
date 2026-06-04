import { HitboxTag } from "../../../../../shared/src/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { OkrenAgeStage } from "./OkrenComponent";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { getHitboxTag } from "../../hitboxes";
import { TextureIndex } from "../../../texture-index";

export interface OkrenClawComponentData {
   readonly size: OkrenAgeStage;
   readonly growthStage: number;
}

interface IntermediateInfo {
   // @Memory
   readonly bigArmSegment: TexturedRenderPart;
   readonly mediumArmSegment: TexturedRenderPart;
   readonly slashingArmSegment: TexturedRenderPart;
}

export interface OkrenClawComponent {
   growthStage: number;
   // @Memory
   readonly bigArmSegment: TexturedRenderPart;
   readonly mediumArmSegment: TexturedRenderPart;
   readonly slashingArmSegment: TexturedRenderPart;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.okrenClaw, _OkrenClawComponentArray> {}
}

class _OkrenClawComponentArray extends _ServerComponentArray<OkrenClawComponent, OkrenClawComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): OkrenClawComponentData {
      const size = reader.readNumber();
      const growthStage = reader.readNumber();
      return {
         size: size,
         growthStage: growthStage
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const okrenClawComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.okrenClaw);

      const size = okrenClawComponentData.size;
      const growthStage = okrenClawComponentData.growthStage;
      
      let bigArmSegment!: TexturedRenderPart;
      let mediumArmSegment!: TexturedRenderPart;
      let slashingArmSegment!: TexturedRenderPart;
      
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      for (const hitbox of transformComponentData.hitboxes) {
         switch (getHitboxTag(hitbox)) {
            case HitboxTag.okrenBigArmSegment: {
               bigArmSegment = new TexturedRenderPart(
                  hitbox,
                  2,
                  0,
                  0, 0,
                  getBigArmSegmentTextureIndex(size, growthStage)
               );
               renderObject.attachRenderPart(bigArmSegment);
               break;
            }
            case HitboxTag.okrenMediumArmSegment: {
               mediumArmSegment = new TexturedRenderPart(
                  hitbox,
                  1,
                  0,
                  0, 0,
                  getMediumArmSegmentTextureIndex(size, growthStage)
               );
               renderObject.attachRenderPart(mediumArmSegment);
               break;
            }
            case HitboxTag.okrenArmSegmentOfSlashingAndDestruction: {
               slashingArmSegment = new TexturedRenderPart(
                  hitbox,
                  0,
                  0,
                  0, 0,
                  getSlashingArmSegmentTextureIndex(size, growthStage)
               );
               renderObject.attachRenderPart(slashingArmSegment);
               break;
            }
         }
      }

      return {
         bigArmSegment: bigArmSegment,
         mediumArmSegment: mediumArmSegment,
         slashingArmSegment: slashingArmSegment
      };
   }

   public createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): OkrenClawComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const okrenClawComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.okrenClaw);

      return {
         growthStage: okrenClawComponentData.growthStage,
         bigArmSegment: intermediateInfo.bigArmSegment,
         mediumArmSegment: intermediateInfo.mediumArmSegment,
         slashingArmSegment: intermediateInfo.slashingArmSegment
      };
   }

   public getMaxRenderParts(): number {
      return 3;
   }

   public updateFromData(data: OkrenClawComponentData, entity: Entity): void {
      const size = data.size;
      const growthStage = data.growthStage;

      const okrenClawComponent = OkrenClawComponentArray.getComponent(entity);
      if (growthStage !== okrenClawComponent.growthStage) {
         okrenClawComponent.growthStage = growthStage;
         
         okrenClawComponent.bigArmSegment.switchTextureSource(getBigArmSegmentTextureIndex(size, growthStage));
         okrenClawComponent.mediumArmSegment.switchTextureSource(getMediumArmSegmentTextureIndex(size, growthStage));
         okrenClawComponent.slashingArmSegment.switchTextureSource(getSlashingArmSegmentTextureIndex(size, growthStage));
      }
   }
}

export const OkrenClawComponentArray = registerServerComponentArray(ServerComponentType.okrenClaw, _OkrenClawComponentArray, true);

const getSizeTextureIndex = (size: OkrenAgeStage): TextureIndex => {
   switch (size) {
      case OkrenAgeStage.juvenile: return TextureIndex.entities_okren_juvenile_armSegmentOfSlashingAndDestruction1;
      case OkrenAgeStage.youth:    return TextureIndex.entities_okren_youth_armSegmentOfSlashingAndDestruction1;
      case OkrenAgeStage.adult:    return TextureIndex.entities_okren_adult_armSegmentOfSlashingAndDestruction1;
      case OkrenAgeStage.elder:    return TextureIndex.entities_okren_elder_armSegmentOfSlashingAndDestruction1;
      case OkrenAgeStage.ancient:  return TextureIndex.entities_okren_ancient_armSegmentOfSlashingAndDestruction1;
   }
}

const getBigArmSegmentTextureIndex = (size: OkrenAgeStage, growthStage: number): TextureIndex => {
   return getSizeTextureIndex(size) + 4 + growthStage;
}

const getMediumArmSegmentTextureIndex = (size: OkrenAgeStage, growthStage: number): TextureIndex => {
   return getSizeTextureIndex(size) + 12 + growthStage;
}

const getSlashingArmSegmentTextureIndex = (size: OkrenAgeStage, growthStage: number): TextureIndex => {
   return getSizeTextureIndex(size) + growthStage;
}