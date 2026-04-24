import { assert, Entity, ServerComponentType } from "webgl-test-shared";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { RenderPart } from "../../render-parts/render-parts";
import { StructureConnection } from "../../structure-placement";
import { Hitbox } from "../../hitboxes";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface FenceComponentData {}

interface IntermediateInfo {
   readonly connectingRenderParts: Partial<Record<Entity, RenderPart>>;
}

export interface FenceComponent {
   /** For each connecting entity, stores the associated connecting render part */
   readonly connectingRenderParts: Partial<Record<Entity, RenderPart>>;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fence, _FenceComponentArray> {}
}

class _FenceComponentArray extends _ServerComponentArray<FenceComponent, FenceComponentData, IntermediateInfo> {
   public decodeData(): FenceComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponent.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            1,
            0,
            0, 0,
            getTextureArrayIndex("entities/fence/fence-node.png")
         )
      );

      const connectingRenderParts: Record<Entity, RenderPart> = {};

      // Create initial connecting render parts
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const structureComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.structure);
      for (const connection of structureComponentData.connections) {
         const renderPart = createConnectingRenderPart(connection, hitbox);
         renderObject.attachRenderPart(renderPart);
         connectingRenderParts[connection.entity] = renderPart;
      }

      return {
         connectingRenderParts: connectingRenderParts,
      };
   }

   public createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): FenceComponent {
      return {
         connectingRenderParts: intermediateInfo.connectingRenderParts
      };
   }

   public getMaxRenderParts(): number {
      // Fence node plus 4 connections
      return 5;
   }
}

export const FenceComponentArray = registerServerComponentArray(ServerComponentType.fence, _FenceComponentArray, true);

export function createFenceComponentData(): FenceComponentData {
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
      offsetMagnitude * Math.sin(relativeOffsetDirection), offsetMagnitude * Math.cos(relativeOffsetDirection),
      getTextureArrayIndex("entities/fence/fence-top-rail.png")
   );
   
   return renderPart;
}

export function addFenceConnection(fence: Entity, connection: StructureConnection): void {
   const transformComponent = TransformComponentArray.getComponent(fence);
   const hitbox = transformComponent.hitboxes[0];
   
   const fenceComponent = FenceComponentArray.getComponent(fence);

   const renderObject = getEntityRenderObject(fence);
   
   const renderPart = createConnectingRenderPart(connection, hitbox);
   renderObject.attachRenderPart(renderPart);
   fenceComponent.connectingRenderParts[connection.entity] = renderPart;
}

export function removeFenceConnection(fence: Entity, connection: StructureConnection): void {
   const fenceComponent = FenceComponentArray.getComponent(fence);

   const renderPart = fenceComponent.connectingRenderParts[connection.entity];
   assert(renderPart !== undefined);

   const renderObject = getEntityRenderObject(fence);
   renderObject.removeRenderPart(renderPart);
   
   delete fenceComponent.connectingRenderParts[connection.entity];
}