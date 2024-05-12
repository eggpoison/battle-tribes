import { FenceConnectionComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class FenceConnectionComponent extends ServerComponent<ServerComponentType.fenceConnection> {
   public connectedSidesBitset: number;
   
   constructor(entity: Entity, data: FenceConnectionComponentData) {
      super(entity);

      this.connectedSidesBitset = data.connectedSidesBitset;
   }

   public updateFromData(data: FenceConnectionComponentData): void {
      this.connectedSidesBitset = data.connectedSidesBitset;
   }
}

export default FenceConnectionComponent;