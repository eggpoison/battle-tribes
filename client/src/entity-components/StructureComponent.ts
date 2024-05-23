import { StructureComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class StructureComponent extends ServerComponent<ServerComponentType.structure> {
   public connectedSidesBitset: number;
   
   constructor(entity: Entity, data: StructureComponentData) {
      super(entity);

      this.connectedSidesBitset = data.connectedSidesBitset;
   }

   public updateFromData(data: StructureComponentData): void {
      this.connectedSidesBitset = data.connectedSidesBitset;
   }

   public isAttachedToWall(): boolean {
      // @Incomplete: check if they are walls
      return this.connectedSidesBitset !== 0;
   }
}

export default StructureComponent;