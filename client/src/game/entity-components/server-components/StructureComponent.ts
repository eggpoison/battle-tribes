import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity, EntityType } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { playSoundOnHitbox } from "../../sound";
import { createStructureConnection, StructureConnection } from "../../structure-placement";
import { EntityComponentData, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { addFenceConnection, FenceComponentArray, removeFenceConnection } from "./FenceComponent";
import { TransformComponentArray } from "./TransformComponent";

export interface StructureComponentData {
   readonly hasActiveBlueprint: boolean;
   readonly connections: Array<StructureConnection>;
}

export interface StructureComponent {
   hasActiveBlueprint: boolean;
   readonly connections: Array<StructureConnection>;
}

export const StructureComponentArray = new ServerComponentArray<StructureComponent, StructureComponentData, never>(ServerComponentType.structure, true, createComponent, getMaxRenderParts, decodeData);
StructureComponentArray.onSpawn = onSpawn;
StructureComponentArray.updateFromData = updateFromData;

export function createStructureComponentData(): StructureComponentData {
   return {
      hasActiveBlueprint: false,
      connections: []
   };
}

function decodeData(reader: PacketReader): StructureComponentData {
   const hasActiveBlueprint = reader.readBool();

   const connections = new Array<StructureConnection>();
   const numConnections = reader.readNumber();
   for (let i = 0; i < numConnections; i++) {
      const entity = reader.readNumber() as Entity;
      const relativeOffsetDirection = reader.readNumber();

      const connection = createStructureConnection(entity, relativeOffsetDirection);
      connections.push(connection);
   }

   return {
      hasActiveBlueprint: hasActiveBlueprint,
      connections: connections
   };
}

function createComponent(entityComponentData: EntityComponentData): StructureComponent {
   const structureComponentData = entityComponentData.serverComponentData[ServerComponentType.structure]!;
   
   return {
      hasActiveBlueprint: structureComponentData.hasActiveBlueprint,
      connections: structureComponentData.connections
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onSpawn(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   switch (getEntityType(entity)) {
      case EntityType.wall: {
         // @Incomplete: Add sounds for stone+ walls
         playSoundOnHitbox("wooden-wall-place.mp3", 0.3, 1, entity, hitbox, false);
         break;
      }
      case EntityType.barrel: {
         playSoundOnHitbox("barrel-place.mp3", 0.4, 1, entity, hitbox, false);
         break;
      }
      case EntityType.campfire: {
         playSoundOnHitbox("wooden-wall-place.mp3", 0.3, 1, entity, hitbox, false);
         break;
      }
      case EntityType.planterBox: {
         // @Temporary
         playSoundOnHitbox("wooden-wall-place.mp3", 0.3, 1, entity, hitbox, false);
         break;
      }
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks:
      case EntityType.floorSpikes:
      case EntityType.wallSpikes: {
         playSoundOnHitbox("spike-place.mp3", 0.5, 1, entity, hitbox, false);
         break;
      }
      case EntityType.researchBench: {
         // @Temporary
         playSoundOnHitbox("wooden-wall-place.mp3", 0.3, 1, entity, hitbox, false);
         break;
      }
      case EntityType.bracings: {
         playSoundOnHitbox("wooden-bracings-place.mp3", 0.4, 1, entity, hitbox, false);
         break;
      }
   }
}

function addConnection(entity: Entity, structureComponent: StructureComponent, connection: StructureConnection): void {
   structureComponent.connections.push(connection);

   if (FenceComponentArray.hasComponent(entity)) {
      addFenceConnection(entity, connection);
   }
}

function removeConnection(entity: Entity, structureComponent: StructureComponent, connection: StructureConnection, connectionIdx: number): void {
   structureComponent.connections.splice(connectionIdx, 1);

   if (FenceComponentArray.hasComponent(entity)) {
      removeFenceConnection(entity, connection);
   }
}

// @Garbage
function updateFromData(data: StructureComponentData, entity: Entity): void {
   const structureComponent = StructureComponentArray.getComponent(entity);

   structureComponent.hasActiveBlueprint = data.hasActiveBlueprint;

   const newConnectedEntities = new Array<Entity>();
   for (let i = 0; i < data.connections.length; i++) {
      const connectionData = data.connections[i];
      const connectedEntity = connectionData.entity;
      const relativeOffsetDirection = connectionData.relativeOffsetDirection;

      newConnectedEntities.push(connectedEntity);

      let alreadyExists = false;
      for (const connection of structureComponent.connections) {
         if (connection.entity === connectedEntity) {
            alreadyExists = true;
            break;
         }
      }

      if (!alreadyExists) {
         const connection = createStructureConnection(connectedEntity, relativeOffsetDirection);
         addConnection(entity, structureComponent, connection);
      }
   }

   for (let i = 0; i < structureComponent.connections.length; i++) {
      const connection = structureComponent.connections[i];

      let isInNewConnections = false;
      for (const entity of newConnectedEntities) {
         if (connection.entity === entity) {
            isInNewConnections = true;
            break;
         }
      }

      if (!isInNewConnections) {
         removeConnection(entity, structureComponent, connection, i);
         i--;
      }
   }
}