import { assert, Entity, ServerComponentType } from "webgl-test-shared";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData, getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { RenderPart } from "../../render-parts/render-parts";
import { StructureConnection } from "../../structure-placement";
import { Hitbox } from "../../hitboxes";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface FenceComponentData {}

interface IntermediateInfo {
   readonly connectingRenderParts: Partial<Record<Entity, RenderPart>>;
}

export interface FenceComponent {
   /** For each connecting entity, stores the associated connecting render part */
   readonly connectingRenderParts: Partial<Record<Entity, RenderPart>>;
}

export const FenceComponentArray = new ServerComponentArray<FenceComponent, FenceComponentData, IntermediateInfo>(ServerComponentType.fence, true, createComponent, getMaxRenderParts, decodeData);
FenceComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createFenceComponentData(): FenceComponentData {
   return {};
}

function decodeData(): FenceComponentData {
   return {};
}

const createConnectingRenderPart = (connection: StructureConnection, parentHitbox: Hitbox): RenderPart => {
   const offsetMagnitude = 22;
   const relativeOffsetDirection = connection.relativeOffsetDirection;
   // let textureSource: string;
   // let offsetX: number;
   // let offsetY: number;
   // switch (railBit) {
   //    case 0b0001: {
   //       textureSource = "entities/fence/fence-top-rail.png";
   //       offsetX = 0;
   //       offsetY = 22;
   //       break;
   //    }
   //    case 0b0010: {
   //       textureSource = "entities/fence/fence-right-rail.png";
   //       offsetX = 22;
   //       offsetY = 0;
   //       break;
   //    }
   //    case 0b0100: {
   //       textureSource = "entities/fence/fence-bottom-rail.png";
   //       offsetX = 0;
   //       offsetY = -22;
   //       break;
   //    }
   //    case 0b1000: {
   //       textureSource = "entities/fence/fence-left-rail.png";
   //       offsetX = -22;
   //       offsetY = 0;
   //       break;
   //    }
   // }
   
   const renderPart = new TexturedRenderPart(
      parentHitbox,
      0,
      relativeOffsetDirection,
      getTextureArrayIndex("entities/fence/fence-top-rail.png")
   );
   renderPart.offset.x = offsetMagnitude * Math.sin(relativeOffsetDirection);
   renderPart.offset.y = offsetMagnitude * Math.cos(relativeOffsetDirection);
   
   return renderPart;
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponent.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         getTextureArrayIndex("entities/fence/fence-node.png")
      )
   );

   const connectingRenderParts: Record<Entity, RenderPart> = {};

   // Create initial connecting render parts
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const structureComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.structure);
   for (const connection of structureComponentData.connections) {
      const renderPart = createConnectingRenderPart(connection, hitbox);
      renderInfo.attachRenderPart(renderPart);
      connectingRenderParts[connection.entity] = renderPart;
   }

   return {
      connectingRenderParts: connectingRenderParts,
   };
}

function createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): FenceComponent {
   return {
      connectingRenderParts: intermediateInfo.connectingRenderParts
   };
}

function getMaxRenderParts(): number {
   // Fence node plus 4 connections
   return 5;
}

export function addFenceConnection(fence: Entity, connection: StructureConnection): void {
   const transformComponent = TransformComponentArray.getComponent(fence);
   const hitbox = transformComponent.hitboxes[0];
   
   const fenceComponent = FenceComponentArray.getComponent(fence);

   const renderInfo = getEntityRenderInfo(fence);
   
   const renderPart = createConnectingRenderPart(connection, hitbox);
   renderInfo.attachRenderPart(renderPart);
   fenceComponent.connectingRenderParts[connection.entity] = renderPart;
}

export function removeFenceConnection(fence: Entity, connection: StructureConnection): void {
   const fenceComponent = FenceComponentArray.getComponent(fence);

   const renderPart = fenceComponent.connectingRenderParts[connection.entity];
   assert(typeof renderPart !== "undefined");

   const renderInfo = getEntityRenderInfo(fence);
   renderInfo.removeRenderPart(renderPart);
   
   delete fenceComponent.connectingRenderParts[connection.entity];
}