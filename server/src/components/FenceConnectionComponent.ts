import { FenceConnectionComponentData } from "webgl-test-shared/dist/components";
import { ConnectedEntityIDs } from "../entities/tribes/tribe-member";
import { ComponentArray } from "./ComponentArray";
import { getSnapDirection } from "webgl-test-shared/dist/structures";
import Board from "../Board";

export class FenceConnectionComponent {
   public connectedSidesBitset: number;
   public connectedEntityIDs: ConnectedEntityIDs;

   constructor(connectedSidesBitset: number, connectedEntityIDs: ConnectedEntityIDs) {
      this.connectedSidesBitset = connectedSidesBitset;
      this.connectedEntityIDs = connectedEntityIDs;
   }
}

export const FenceConnectionComponentArray = new ComponentArray<FenceConnectionComponent>(true, onJoin);

export function onJoin(entityID: number, fenceConnectionComponent: FenceConnectionComponent): void {
   // @Incomplete: change to be done when every structure is joined. Which will necessitate a structure component, so that they can store the connected values.
   // @Bug: walls don't register secondary connections with connected fences
   
   // Mark opposite connections
   for (let i = 0; i < 4; i++) {
      const connectedEntityID = fenceConnectionComponent.connectedEntityIDs[i];

      if (connectedEntityID !== 0 && FenceConnectionComponentArray.hasComponent(connectedEntityID)) {
         const fenceConnectionComponent = FenceConnectionComponentArray.getComponent(connectedEntityID);

         const entity = Board.entityRecord[entityID]!;
         const connectedEntity = Board.entityRecord[connectedEntityID]!;
         const connectionDirection = getSnapDirection(connectedEntity.position.calculateAngleBetween(entity.position), connectedEntity.rotation);
         addFenceConnection(fenceConnectionComponent, connectionDirection, entityID);
      }
   }
}

export function addFenceConnection(fenceConnectionComponent: FenceConnectionComponent, connectionIdx: number, connectedEntityID: number): void {
   fenceConnectionComponent.connectedEntityIDs[connectionIdx] = connectedEntityID;
   fenceConnectionComponent.connectedSidesBitset |= 1 << connectionIdx;
}

export function removeFenceConnection(fenceConnectionComponent: FenceConnectionComponent, connectionIdx: number): void {
   fenceConnectionComponent.connectedEntityIDs[connectionIdx] = 0;
   fenceConnectionComponent.connectedSidesBitset &= ~(1 << connectionIdx);
}

export function serialiseFenceConnectionComponent(entityID: number): FenceConnectionComponentData {
   const fenceConnectionComponent = FenceConnectionComponentArray.getComponent(entityID);
   return {
      connectedSidesBitset: fenceConnectionComponent.connectedSidesBitset
   };
}