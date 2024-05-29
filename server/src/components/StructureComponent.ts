import { StructureConnectionInfo, StructureType, getSnapDirection, getStructureSnapOrigin } from "webgl-test-shared/dist/structures";
import Board from "../Board";
import Entity from "../Entity";
import { createStructureGrassBlockers } from "../grass-blockers";
import { BlueprintComponentArray } from "./BlueprintComponent";
import { ComponentArray } from "./ComponentArray";
import { ConnectedEntityIDs } from "../entities/tribes/tribe-member";
import { Mutable } from "webgl-test-shared/dist/utils";
import { ServerComponentType, StructureComponentData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { TribeComponentArray } from "./TribeComponent";

export class StructureComponent implements Mutable<StructureConnectionInfo> {
   /** The ID of any blueprint currently placed on the structure */
   public activeBlueprintID = 0;
   
   public connectedSidesBitset: number;
   public connectedEntityIDs: ConnectedEntityIDs;

   constructor(structureInfo: StructureConnectionInfo) {
      this.connectedSidesBitset = structureInfo.connectedSidesBitset;
      this.connectedEntityIDs = structureInfo.connectedEntityIDs;
   }
}

export const StructureComponentArray = new ComponentArray<ServerComponentType.structure, StructureComponent>(true, {
   onJoin: onJoin,
   onRemove: onRemove,
   serialise: serialise
});

const addConnection = (structureComponent: StructureComponent, connectionIdx: number, connectedEntityID: number): void => {
   structureComponent.connectedEntityIDs[connectionIdx] = connectedEntityID;
   structureComponent.connectedSidesBitset |= 1 << connectionIdx;
}

const removeConnection = (structureComponent: StructureComponent, connectionIdx: number): void => {
   structureComponent.connectedEntityIDs[connectionIdx] = 0;
   structureComponent.connectedSidesBitset &= ~(1 << connectionIdx);
}

const removeConnectionWithStructure = (structureID: number, connectedStructureID: number): void => {
   const structureComponent = StructureComponentArray.getComponent(structureID);
   
   for (let i = 0; i < 4; i++) {
      const entityID = structureComponent.connectedEntityIDs[i];
      if (entityID === connectedStructureID) {
         removeConnection(structureComponent, i);
         break;
      }
   }
}

function onJoin(entityID: number): void {
   // @Hack
   const entity = Board.entityRecord[entityID]! as Entity<StructureType>;

   const tribeComponent = TribeComponentArray.getComponent(entityID);
   tribeComponent.tribe.addBuilding(entity);

   createStructureGrassBlockers(entity);

   const structureComponent = StructureComponentArray.getComponent(entityID);
   
   // Mark opposite connections
   for (let i = 0; i < 4; i++) {
      const connectedEntityID = structureComponent.connectedEntityIDs[i];

      if (connectedEntityID !== 0 && StructureComponentArray.hasComponent(connectedEntityID)) {
         const otherStructureComponent = StructureComponentArray.getComponent(connectedEntityID);

         // @Cleanup
         const entity = Board.entityRecord[entityID]! as Entity<StructureType>;
         const connectedEntity = Board.entityRecord[connectedEntityID]! as Entity<StructureType>;
         
         const snapOrigin = getStructureSnapOrigin(entity);
         const connectedSnapOrigin = getStructureSnapOrigin(connectedEntity);
         const connectionDirection = getSnapDirection(connectedSnapOrigin.calculateAngleBetween(snapOrigin), connectedEntity.rotation);

         addConnection(otherStructureComponent, connectionDirection, entityID);
      }
   }
}

function onRemove(entityID: number): void {
   // @Hack
   const entity = Board.entityRecord[entityID]! as Entity<StructureType>;

   const tribeComponent = TribeComponentArray.getComponent(entityID);
   tribeComponent.tribe.removeBuilding(entity);

   const structureComponent = StructureComponentArray.getComponent(entityID);

   for (let i = 0; i < 4; i++) {
      const currentConnectedEntityID = structureComponent.connectedEntityIDs[i];
      if (StructureComponentArray.hasComponent(currentConnectedEntityID)) {
         removeConnectionWithStructure(currentConnectedEntityID, entityID);
      }
   }

   if (BlueprintComponentArray.hasComponent(structureComponent.activeBlueprintID)) {
      const blueprintEntity = Board.entityRecord[structureComponent.activeBlueprintID]!;
      blueprintEntity.destroy();
   }
}

function serialise(entityID: number): StructureComponentData {
   const structureComponent = StructureComponentArray.getComponent(entityID);
   
   return {
      componentType: ServerComponentType.structure,
      hasActiveBlueprint: BlueprintComponentArray.hasComponent(structureComponent.activeBlueprintID),
      connectedSidesBitset: structureComponent.connectedSidesBitset
   };
}

export function isAttachedToWall(connectionInfo: StructureConnectionInfo): boolean {
   for (let i = 0; i < connectionInfo.connectedEntityIDs.length; i++) {
      const entityID = connectionInfo.connectedEntityIDs[i];

      const entity = Board.entityRecord[entityID];
      if (typeof entity !== "undefined" && entity.type === EntityType.wall) {
         return true;
      }
   }

   return false;
}