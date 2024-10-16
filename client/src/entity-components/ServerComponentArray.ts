import { ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { PacketReader } from "../../../shared/src/packets";
import { ComponentTint, EntityRenderInfo } from "../Entity";
import { ComponentArray, ComponentArrayFunctions, ComponentArrayType } from "./ComponentArray";

// @Robustness: Make RenderParts automatically inferred

interface ServerComponentArrayFunctions<
   T extends object,
   ComponentConfig extends object,
   RenderParts extends object = never
> extends ComponentArrayFunctions<T> {
   createComponent(config: ComponentConfig, renderParts: RenderParts): void;
   createRenderParts?(renderInfo: EntityRenderInfo, config: ComponentConfig): RenderParts;
   padData(reader: PacketReader): void;
   // Note: reader is before entity as every function will need the reader, but not all are guaranteed to need the entity
   updateFromData(reader: PacketReader, entity: EntityID, isInitialData: boolean): void;
   /** Updates the player instance from server data */
   updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   /** Called on the player instance after all components are updated from server data */
   updatePlayerAfterData?(): void;
   calculateTint?(entity: EntityID): ComponentTint;
}

export default class ServerComponentArray<
      T extends object,
      ComponentType extends ServerComponentType = ServerComponentType,
      ComponentConfig extends object = object,
      RenderParts extends object = object
   > extends ComponentArray<T, ComponentArrayType.server, ComponentType> implements ServerComponentArrayFunctions<T, ComponentConfig, RenderParts> {
   public readonly createComponent: (config: ComponentConfig, renderParts: RenderParts) => void;
   public createRenderParts?(renderInfo: EntityRenderInfo, config: ComponentConfig): RenderParts;
   public padData: (reader: PacketReader) => void;
   public updateFromData: (reader: PacketReader, entity: EntityID, isInitialData: boolean) => void;
   public updatePlayerFromData?(reader: PacketReader, isInitialData: boolean): void;
   public updatePlayerAfterData?(): void;
   public calculateTint?(entity: EntityID): ComponentTint;

   constructor(componentType: ComponentType, isActiveByDefault: boolean, functions: ServerComponentArrayFunctions<T, ComponentConfig, RenderParts>) {
      super(ComponentArrayType.server, componentType, isActiveByDefault, functions);

      this.createComponent = functions.createComponent;
      this.createRenderParts = functions.createRenderParts;
      this.padData = functions.padData;
      this.updateFromData = functions.updateFromData;
      this.updatePlayerFromData = functions.updatePlayerFromData;
      this.updatePlayerAfterData = functions.updatePlayerAfterData;
      this.calculateTint = functions.calculateTint;
   }
}