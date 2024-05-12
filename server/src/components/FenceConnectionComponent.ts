import { FenceConnectionComponentData } from "webgl-test-shared/dist/components";
import { ConnectedEntityIDs } from "../entities/tribes/tribe-member";
import { ComponentArray } from "./ComponentArray";

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
   // Mark opposite connections
   for (let i = 0; i < 4; i++) {
      const connectedEntityID = fenceConnectionComponent.connectedEntityIDs[i];

      if (connectedEntityID !== 0 && FenceConnectionComponentArray.hasComponent(connectedEntityID)) {
         const fenceConnectionComponent = FenceConnectionComponentArray.getComponent(connectedEntityID);

         const otherI = (i + 2) % 4;
         addFenceConnection(fenceConnectionComponent, otherI, entityID);
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