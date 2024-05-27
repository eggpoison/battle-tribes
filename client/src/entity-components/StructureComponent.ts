import { StructureComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";

class StructureComponent extends ServerComponent<ServerComponentType.structure> {
   public hasActiveBlueprint: boolean;
   public connectedSidesBitset: number;
   
   constructor(entity: Entity, data: StructureComponentData) {
      super(entity);

      this.hasActiveBlueprint = data.hasActiveBlueprint;
      this.connectedSidesBitset = data.connectedSidesBitset;
   }

   public updateFromData(data: StructureComponentData): void {
      this.hasActiveBlueprint = data.hasActiveBlueprint;
      this.connectedSidesBitset = data.connectedSidesBitset;
   }
}

export default StructureComponent;