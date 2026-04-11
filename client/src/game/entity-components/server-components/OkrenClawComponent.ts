import { PacketReader, Entity, ServerComponentType, HitboxFlag } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { OkrenAgeStage } from "./OkrenComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

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

export const OkrenClawComponentArray = new ServerComponentArray<OkrenClawComponent, OkrenClawComponentData, IntermediateInfo>(ServerComponentType.okrenClaw, true, createComponent, getMaxRenderParts, decodeData);
OkrenClawComponentArray.populateIntermediateInfo = populateIntermediateInfo;
OkrenClawComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): OkrenClawComponentData {
   const size = reader.readNumber();
   const growthStage = reader.readNumber();
   return {
      size: size,
      growthStage: growthStage
   };
}

const getSizeString = (size: OkrenAgeStage): string => {
   switch (size) {
      case OkrenAgeStage.juvenile: return "juvenile";
      case OkrenAgeStage.youth:    return "youth";
      case OkrenAgeStage.adult:    return "adult";
      case OkrenAgeStage.elder:    return "elder";
      case OkrenAgeStage.ancient:  return "ancient";
   }
}

const getGrowthStageString = (growthStage: number): string => {
   return (growthStage + 1).toString();
}

const getBigArmSegmentTextureSource = (sizeString: string, growthStageString: string): string => {
   return "entities/okren/" + sizeString + "/big-arm-segment-" + growthStageString + ".png";
}

const getMediumArmSegmentTextureSource = (sizeString: string, growthStageString: string): string => {
   return "entities/okren/" + sizeString + "/medium-arm-segment-" + growthStageString + ".png";
}

const getSlashingArmSegmentTextureSource = (sizeString: string, growthStageString: string): string => {
   return "entities/okren/" + sizeString + "/arm-segment-of-slashing-and-destruction-" + growthStageString + ".png";
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const okrenClawComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.okrenClaw);

   const sizeString = getSizeString(okrenClawComponentData.size);
   const growthStageString = getGrowthStageString(okrenClawComponentData.growthStage);
   
   let bigArmSegment!: TexturedRenderPart;
   let mediumArmSegment!: TexturedRenderPart;
   let slashingArmSegment!: TexturedRenderPart;
   
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   for (const hitbox of transformComponentData.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.OKREN_BIG_ARM_SEGMENT)) {
         bigArmSegment = new TexturedRenderPart(
            hitbox,
            2,
            0,
            0, 0,
            getTextureArrayIndex(getBigArmSegmentTextureSource(sizeString, growthStageString))
         );
         renderObject.attachRenderPart(bigArmSegment);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT)) {
         mediumArmSegment = new TexturedRenderPart(
            hitbox,
            1,
            0,
            0, 0,
            getTextureArrayIndex(getMediumArmSegmentTextureSource(sizeString, growthStageString))
         )
         renderObject.attachRenderPart(mediumArmSegment);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
         slashingArmSegment = new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex(getSlashingArmSegmentTextureSource(sizeString, growthStageString))
         )
         renderObject.attachRenderPart(slashingArmSegment);
      }
   }

   return {
      bigArmSegment: bigArmSegment,
      mediumArmSegment: mediumArmSegment,
      slashingArmSegment: slashingArmSegment
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): OkrenClawComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const okrenClawComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.okrenClaw);

   return {
      growthStage: okrenClawComponentData.growthStage,
      bigArmSegment: intermediateInfo.bigArmSegment,
      mediumArmSegment: intermediateInfo.mediumArmSegment,
      slashingArmSegment: intermediateInfo.slashingArmSegment
   };
}

function getMaxRenderParts(): number {
   return 3;
}

function updateFromData(data: OkrenClawComponentData, entity: Entity): void {
   const size = data.size;
   const growthStage = data.growthStage;

   const okrenClawComponent = OkrenClawComponentArray.getComponent(entity);
   if (growthStage !== okrenClawComponent.growthStage) {
      okrenClawComponent.growthStage = growthStage;
      
      const sizeString = getSizeString(size);
      const growthStageString = getGrowthStageString(growthStage);
      okrenClawComponent.bigArmSegment.switchTextureSource(getBigArmSegmentTextureSource(sizeString, growthStageString));
      okrenClawComponent.mediumArmSegment.switchTextureSource(getMediumArmSegmentTextureSource(sizeString, growthStageString));
      okrenClawComponent.slashingArmSegment.switchTextureSource(getSlashingArmSegmentTextureSource(sizeString, growthStageString));
   }
}