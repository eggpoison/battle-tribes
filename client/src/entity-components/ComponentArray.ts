import { ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID } from "webgl-test-shared/dist/entities";
import Component from "./Component";
import Entity from "../Entity";
import { ClientComponentType } from "./components";

export const enum ComponentArrayType {
   server,
   client
}

interface ComponentArrayFunctions<T extends object> {
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

const componentArrays = new Array<ComponentArray>();
const serverComponentArrayRecord: Record<ServerComponentType, ComponentArray> = {} as any;

export class ComponentArray<T extends Component = Component, ArrayType extends ComponentArrayType = ComponentArrayType, ComponentType extends ComponentTypeForArray[ArrayType] = ComponentTypeForArray[ArrayType]> implements ComponentArrayFunctions<T> {
   public readonly typeObject: ComponentArrayTypeObject<ArrayType>;
   
   public components = new Array<T>();

   /** Maps entity IDs to component indexes */
   private entityToIndexMap: Partial<Record<EntityID, number>> = {};
   /** Maps component indexes to entity IDs */
   private indexToEntityMap: Partial<Record<number, EntityID>> = {};

   public onTick?: (component: T, entity: EntityID) => void;
   public onUpdate?: (component: T, entity: EntityID) => void;

   constructor(arrayType: ArrayType, componentType: ComponentType, functions: ComponentArrayFunctions<T>) {
      this.typeObject = {
         type: arrayType,
         componentType: componentType
      };
      
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
   }

   public removeComponent(entityID: EntityID): void {
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
   }

   public getComponent(entity: EntityID): T {
      return this.components[this.entityToIndexMap[entity]!];
   }

   public hasComponent(entity: EntityID): boolean {
      return typeof this.entityToIndexMap[entity] !== "undefined";
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
      
      if (componentArray.typeObject.type === ComponentArrayType.server && entity.hasServerComponent(componentArray.typeObject.componentType as ServerComponentType) || (componentArray.typeObject.type === ComponentArrayType.client && entity.hasClientComponent(componentArray.typeObject.componentType as ClientComponentType))) {
         const component = componentArray.getComponent(entity.id);
         componentArray.onUpdate(component, entity.id);
      }
   }
}