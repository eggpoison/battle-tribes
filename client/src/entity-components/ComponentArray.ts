import { ServerComponentType } from "battletribes-shared/components";
import { EntityID } from "battletribes-shared/entities";
import Component from "./Component";
import Entity from "../Entity";
import { ClientComponentType } from "./components";

export const enum ComponentArrayType {
   server,
   client
}

interface ComponentArrayFunctions<T extends object> {
   /** Called when the entity is spawned in, not when the client first becomes aware of the entity's existence */
   onSpawn?(component: T, entity: EntityID): void;
   onTick?(component: T, entity: EntityID): void;
   onUpdate?(component: T, entity: EntityID): void;
}

type ComponentTypeForArray = {
   [ComponentArrayType.server]: ServerComponentType,
   [ComponentArrayType.client]: ClientComponentType
};

interface ComponentArrayTypeObject<ArrayType extends ComponentArrayType> {
   readonly type: ArrayType;
   readonly componentType: ComponentTypeForArray[ArrayType];
}

let componentArrays = new Array<ComponentArray>();
let serverComponentArrayRecord: Record<ServerComponentType, ComponentArray> = {} as any;

export class ComponentArray<T extends Component = Component, ArrayType extends ComponentArrayType = ComponentArrayType, ComponentType extends ComponentTypeForArray[ArrayType] = ComponentTypeForArray[ArrayType]> implements ComponentArrayFunctions<T> {
   public readonly typeObject: ComponentArrayTypeObject<ArrayType>;
   private readonly isActiveByDefault: boolean;
   
   public entities = new Array<EntityID>();
   public components = new Array<T>();

   /** Maps entity IDs to component indexes */
   private entityToIndexMap: Partial<Record<EntityID, number>> = {};
   /** Maps component indexes to entity IDs */
   private indexToEntityMap: Partial<Record<number, EntityID>> = {};
   
   public activeComponents = new Array<T>();
   public activeEntities = new Array<EntityID>();

   /** Maps entity IDs to component indexes */
   private activeEntityToIndexMap: Record<EntityID, number> = {};
   /** Maps component indexes to entity IDs */
   private activeIndexToEntityMap: Record<number, EntityID> = {};

   private deactivateBuffer = new Array<number>();

   public onSpawn?(component: T, entity: EntityID): void;
   public onTick?: (component: T, entity: EntityID) => void;
   public onUpdate?: (component: T, entity: EntityID) => void;

   constructor(arrayType: ArrayType, componentType: ComponentType, isActiveByDefault: boolean, functions: ComponentArrayFunctions<T>) {
      this.typeObject = {
         type: arrayType,
         componentType: componentType
      };
      this.isActiveByDefault = isActiveByDefault;
      
      this.onSpawn = functions.onSpawn;
      this.onTick = functions.onTick;
      this.onUpdate = functions.onUpdate;

      componentArrays.push(this as unknown as ComponentArray);
      if (arrayType === ComponentArrayType.server) {
         serverComponentArrayRecord[componentType as ServerComponentType] = this as unknown as ComponentArray;
      }
   }

   public addComponent(entityID: EntityID, component: T): void {
      // Put new entry at end and update the maps
      const newIndex = this.components.length;
      this.entityToIndexMap[entityID] = newIndex;
      this.indexToEntityMap[newIndex] = entityID;
      this.components.push(component);
      this.entities.push(entityID);

      if (this.isActiveByDefault) {
         this.activateComponent(component, entityID);
      }
   }

   public removeComponent(entityID: EntityID): void {
		// Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.entityToIndexMap[entityID]!;
      this.components[indexOfRemovedEntity] = this.components[this.components.length - 1];
      this.entities[indexOfRemovedEntity] = this.entities[this.entities.length - 1];

		// Update map to point to moved spot
      const entityOfLastElement = this.indexToEntityMap[this.components.length - 1]!;
      this.entityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.indexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.entityToIndexMap[entityID];
      delete this.indexToEntityMap[this.components.length - 1];

      this.components.pop();
      this.entities.pop();

      if (typeof this.activeEntityToIndexMap[entityID] !== "undefined") {
         this.deactivateComponent(entityID);
      }
   }

   public getComponent(entity: EntityID): T {
      return this.components[this.entityToIndexMap[entity]!];
   }

   public hasComponent(entity: EntityID): boolean {
      return typeof this.entityToIndexMap[entity] !== "undefined";
   }

   public activateComponent(component: T, entity: EntityID): void {
      if (typeof this.activeEntityToIndexMap[entity] !== "undefined") {
         return;
      }
      
      // Put new entry at end and update the maps
      const newIndex = this.activeComponents.length;
      this.activeEntityToIndexMap[entity] = newIndex;
      this.activeIndexToEntityMap[newIndex] = entity;
      this.activeComponents.push(component);

      this.activeEntities.push(entity);
   }

   private deactivateComponent(entity: EntityID): void {
      // Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.activeEntityToIndexMap[entity];
      this.activeComponents[indexOfRemovedEntity] = this.activeComponents[this.activeComponents.length - 1];
      this.activeEntities[indexOfRemovedEntity] = this.activeEntities[this.activeComponents.length - 1];

      // Update map to point to moved spot
      const entityOfLastElement = this.activeIndexToEntityMap[this.activeComponents.length - 1];
      this.activeEntityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.activeIndexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.activeEntityToIndexMap[entity];
      delete this.activeIndexToEntityMap[this.activeComponents.length - 1];

      this.activeComponents.pop();
      this.activeEntities.pop();
   }

   public queueComponentDeactivate(entity: EntityID): void {
      this.deactivateBuffer.push(entity);
   }

   public deactivateQueue(): void {
      for (let i = 0; i < this.deactivateBuffer.length; i++) {
         const entityID = this.deactivateBuffer[i];
         this.deactivateComponent(entityID);
      }
      this.deactivateBuffer = [];
   }
}

export function getComponentArrays(): ReadonlyArray<ComponentArray> {
   return componentArrays;
}

export function getServerComponentArray(componentType: ServerComponentType): ComponentArray {
   return serverComponentArrayRecord[componentType];
}

export function updateEntity(entity: Entity): void {
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (typeof componentArray.onUpdate === "undefined") {
         continue;
      }
      
      // if (componentArray.typeObject.type === ComponentArrayType.server && entity.hasServerComponent(componentArray.typeObject.componentType as ServerComponentType) || (componentArray.typeObject.type === ComponentArrayType.client && entity.hasClientComponent(componentArray.typeObject.componentType as ClientComponentType))) {
      if (componentArray.hasComponent(entity.id)) {
         const component = componentArray.getComponent(entity.id);
         componentArray.onUpdate(component, entity.id);
      }
   }
}

if (module.hot) {
   module.hot.dispose(data => {
      data.componentArrays = componentArrays;
      data.serverComponentArrayRecord = serverComponentArrayRecord;
   });

   if (module.hot.data) {
      componentArrays = module.hot.data.componentArrays;
      serverComponentArrayRecord = module.hot.data.serverComponentArrayRecord;
   }
}