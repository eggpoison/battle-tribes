import { StructureConnectionInfo, getSnapDirection, getStructureSnapOrigin } from "webgl-test-shared/dist/structures";
import Board from "../Board";
import { createStructureGrassBlockers } from "../grass-blockers";
import { BlueprintComponentArray } from "./BlueprintComponent";
import { ComponentArray } from "./ComponentArray";
import { ConnectedEntityIDs } from "../entities/tribes/tribe-member";
import { Mutable } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TribeComponentArray } from "./TribeComponent";
import { TransformComponentArray } from "./TransformComponent";
import { Packet } from "webgl-test-shared/dist/packets";

export interface StructureComponentParams {
   connectionInfo: StructureConnectionInfo;
}

export class StructureComponent implements Mutable<StructureConnectionInfo> {
   /** The blueprint currently placed on the structure. 0 if none is present */
   public activeBlueprint = 0;
   
   public connectedSidesBitset: number;
   public connectedEntityIDs: ConnectedEntityIDs;

   constructor(params: StructureComponentParams) {
      this.connectedSidesBitset = params.connectionInfo.connectedSidesBitset;
      this.connectedEntityIDs = params.connectionInfo.connectedEntityIDs;
   }
}

export const StructureComponentArray = new ComponentArray<StructureComponent>(ServerComponentType.structure, true, {
   onJoin: onJoin,
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
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

function onJoin(entity: EntityID): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   tribeComponent.tribe.addBuilding(entity);

   createStructureGrassBlockers(entity);

   const structureComponent = StructureComponentArray.getComponent(entity);
   
   // Mark opposite connections
   for (let i = 0; i < 4; i++) {
      const connectedEntity = structureComponent.connectedEntityIDs[i];

      if (connectedEntity !== 0 && StructureComponentArray.hasComponent(connectedEntity)) {
         const otherStructureComponent = StructureComponentArray.getComponent(connectedEntity);
         const connectedEntityTransformComponent = TransformComponentArray.getComponent(connectedEntity);

         const worldInfo = Board.getWorldInfo();
         const snapOrigin = getStructureSnapOrigin(worldInfo.getEntityCallback(entity));
         const connectedSnapOrigin = getStructureSnapOrigin(worldInfo.getEntityCallback(connectedEntity));
         const connectionDirection = getSnapDirection(connectedSnapOrigin.calculateAngleBetween(snapOrigin), connectedEntityTransformComponent.rotation);

         addConnection(otherStructureComponent, connectionDirection, entity);
      }
   }
}

function onRemove(entity: EntityID): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   tribeComponent.tribe.removeBuilding(entity);

   const structureComponent = StructureComponentArray.getComponent(entity);

   for (let i = 0; i < 4; i++) {
      const currentConnectedEntityID = structureComponent.connectedEntityIDs[i];
      if (StructureComponentArray.hasComponent(currentConnectedEntityID)) {
         removeConnectionWithStructure(currentConnectedEntityID, entity);
      }
   }

   if (BlueprintComponentArray.hasComponent(structureComponent.activeBlueprint)) {
      Board.destroyEntity(structureComponent.activeBlueprint);
   }
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const structureComponent = StructureComponentArray.getComponent(entity);
   packet.addBoolean(BlueprintComponentArray.hasComponent(structureComponent.activeBlueprint));
   packet.padOffset(3);
   packet.addNumber(structureComponent.connectedSidesBitset);
}