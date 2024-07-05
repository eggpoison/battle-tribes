import Entity from "../Entity";
import Board from "../Board";
import { ComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID } from "webgl-test-shared/dist/entities";
import { ComponentRecord } from "../components";

export const ComponentArrays = new Array<ComponentArray>();

interface ComponentArrayFunctions<C extends ServerComponentType> {
   onJoin?(entityID: EntityID): void;
   onRemove?(entityID: EntityID): void;
   /** Called after all the components for an entity are created, before the entity has joined the world. */
   onInitialise?(entity: Entity, componentRecord: ComponentRecord): void;
   serialise(entityID: EntityID, playerID: EntityID | null): ComponentData<C>;
}

export class ComponentArray<C extends ServerComponentType = ServerComponentType, T extends object = object> {
   private readonly isActiveByDefault: boolean;
   
   public components = new Array<T>();
   private componentBuffer = new Array<T>();

   /** Maps entity IDs to component indexes */
   private entityToIndexMap: Partial<Record<EntityID, number>> = {};
   /** Maps component indexes to entity IDs */
   private indexToEntityMap: Partial<Record<number, EntityID>> = {};
   
   public activeComponents = new Array<T>();
   public activeEntityIDs = new Array<EntityID>();

   /** Maps entity IDs to component indexes */
   public activeEntityToIndexMap: Record<EntityID, number> = {};
   /** Maps component indexes to entity IDs */
   private activeIndexToEntityMap: Record<number, EntityID> = {};

   private componentBufferIDs = new Array<number>();

   private deactivateBuffer = new Array<number>();

   // @Bug @Incomplete: This function shouldn't create an entity, as that will cause a crash. (Can't add components to the join buffer while iterating it). solution: make it not crash
   public onJoin?: (entityID: EntityID) => void;
   public onRemove?: (entityID: EntityID) => void;
   public onInitialise?: (entity: Entity, componentRecord: ComponentRecord) => void;
   public serialise: (entityID: EntityID, playerID: EntityID | null) => ComponentData<C>;
   
   constructor(isActiveByDefault: boolean, functions: ComponentArrayFunctions<C>) {
      this.isActiveByDefault = isActiveByDefault;

      this.onJoin = functions.onJoin;
      this.onRemove = functions.onRemove;
      this.onInitialise = functions.onInitialise;
      this.serialise = functions.serialise;

      ComponentArrays.push(this);
   }
   
   public addComponent(entityID: number, component: T): void {
      if (typeof this.entityToIndexMap[entityID] !== "undefined") {
         throw new Error("Component added to same entity twice.");
      }

      this.componentBuffer.push(component);
      this.componentBufferIDs.push(entityID);
   }

   public pushComponentsFromBuffer(): void {
      for (let i = 0; i < this.componentBuffer.length; i++) {
         const component = this.componentBuffer[i];
         const entityID = this.componentBufferIDs[i];
      
         // Put new entry at end and update the maps
         const newIndex = this.components.length;
         this.entityToIndexMap[entityID] = newIndex;
         this.indexToEntityMap[newIndex] = entityID;
         this.components.push(component);
         
         if (this.isActiveByDefault) {
            this.activateComponent(component, entityID);
         }
      }
   }

   public getComponentBuffer(): ReadonlyArray<T> {
      return this.componentBuffer;
   }

   public getComponentBufferIDs(): ReadonlyArray<number> {
      return this.componentBufferIDs;
   }

   public clearBuffer(): void {
      this.componentBuffer = [];
      this.componentBufferIDs = [];
   }

   public getComponent(entityID: number): T {
      return this.components[this.entityToIndexMap[entityID]!];
   }

   // Much slower than the regular getComponent array, and only able to be done when the entity hasn't been added to the board yet
   public getComponentFromBuffer(entity: Entity): T {
      for (let i = 0; i < this.componentBuffer.length; i++) {
         const entityID = this.componentBufferIDs[i];
         if (entityID === entity.id) {
            return this.componentBuffer[i];
         }
      }
      throw new Error("Component wasn't in buffer");
   }

   public removeComponent(entityID: number): void {
		// Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.entityToIndexMap[entityID]!;
      this.components[indexOfRemovedEntity] = this.components[this.components.length - 1];

		// Update map to point to moved spot
      const entityOfLastElement = this.indexToEntityMap[this.components.length - 1]!;
      this.entityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.indexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.entityToIndexMap[entityID];
      delete this.indexToEntityMap[this.components.length - 1];

      this.components.pop();

      if (typeof this.activeEntityToIndexMap[entityID] !== "undefined") {
         this.deactivateComponent(entityID);
      }
   }

   public hasComponent(entityID: number): boolean {
      return typeof this.entityToIndexMap[entityID] !== "undefined";
   }

   public activateComponent(component: T, entityID: number): void {
      // Put new entry at end and update the maps
      const newIndex = this.activeComponents.length;
      this.activeEntityToIndexMap[entityID] = newIndex;
      this.activeIndexToEntityMap[newIndex] = entityID;
      this.activeComponents.push(component);

      this.activeEntityIDs.push(entityID);
   }

   private deactivateComponent(entityID: number): void {
      // Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.activeEntityToIndexMap[entityID];
      this.activeComponents[indexOfRemovedEntity] = this.activeComponents[this.activeComponents.length - 1];
      this.activeEntityIDs[indexOfRemovedEntity] = this.activeEntityIDs[this.activeComponents.length - 1];

      // Update map to point to moved spot
      const entityOfLastElement = this.activeIndexToEntityMap[this.activeComponents.length - 1];
      this.activeEntityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.activeIndexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.activeEntityToIndexMap[entityID];
      delete this.activeIndexToEntityMap[this.activeComponents.length - 1];

      this.activeComponents.pop();
      this.activeEntityIDs.pop();
   }

   public queueComponentDeactivate(entityID: number): void {
      this.deactivateBuffer.push(entityID);
   }

   public deactivateQueue(): void {
      for (let i = 0; i < this.deactivateBuffer.length; i++) {
         const entityID = this.deactivateBuffer[i];
         this.deactivateComponent(entityID);
      }
      this.deactivateBuffer = [];
   }

   // @Hack: should never be allowed.
   public getEntity(index: number): Entity {
      const id = this.indexToEntityMap[index]!;
      return Board.entityRecord[id]!;
   }

   public reset(): void {
      this.components = [];
      this.componentBuffer = [];
      this.entityToIndexMap = {};
      this.indexToEntityMap = {};
      this.componentBufferIDs = [];
   }
}

export function resetComponents(): void {
   for (let i = 0; i < ComponentArrays.length; i++) {
      const componentArray = ComponentArrays[i];
      componentArray.reset();
   }
}