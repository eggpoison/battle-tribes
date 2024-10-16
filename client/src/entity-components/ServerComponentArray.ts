import { ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import { ComponentTint } from "../Entity";
import { ComponentArray, ComponentArrayFunctions, ComponentArrayType } from "./ComponentArray";

interface ServerComponentArrayFunctions<T extends object> extends ComponentArrayFunctions<T> {
   padData(reader: PacketReader): void;
   // Note: reader is before entity as every function will need the reader, but not all are guaranteed to need the entity
   updateFromData(reader: PacketReader, entity: EntityID, isInitialData: boolean): void;
   /** Updates the player instance from server data */
   updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   /** Called on the player instance after all components are updated from server data */
   updatePlayerAfterData?(): void;
   calculateTint?(entity: EntityID): ComponentTint;
}

export default class ServerComponentArray<T extends object = object, ComponentType extends ServerComponentType = ServerComponentType> extends ComponentArray<T, ComponentArrayType.server, ComponentType> implements ServerComponentArrayFunctions<T> {
   public padData: (reader: PacketReader) => void;
   public updateFromData: (reader: PacketReader, entity: EntityID, isInitialData: boolean) => void;
   public updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   public updatePlayerAfterData?(): void;
   public calculateTint?(entity: EntityID): ComponentTint;

   constructor(componentType: ComponentType, isActiveByDefault: boolean, functions: ServerComponentArrayFunctions<T>) {
      super(ComponentArrayType.server, componentType, isActiveByDefault, functions);

      this.padData = functions.padData;
      this.updateFromData = functions.updateFromData;
      this.updatePlayerFromData = functions.updatePlayerFromData;
      this.updatePlayerAfterData = functions.updatePlayerAfterData;
      this.calculateTint = functions.calculateTint;
   }
}