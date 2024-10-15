import { ServerComponentType } from "battletribes-shared/components";
import { EntityID } from "battletribes-shared/entities";
import Entity from "../Entity";
import { ClientComponentType } from "./components";
import { Hitbox } from "../../../shared/src/boxes/boxes";
import ServerComponentArray from "./ServerComponentArray";
import ClientComponentArray from "./ClientComponentArray";

export const enum ComponentArrayType {
   server,
   client
}

export interface ComponentArrayFunctions<T extends object> {
   /** Called once when the entity is created, just after all the components are added */
   onLoad?(component: T, entity: EntityID): void;
   // @Cleanup: is this not the same as spawn?
   /** Called when the entity is spawned in, not when the client first becomes aware of the entity's existence. After the load function */
   onSpawn?(component: T, entity: EntityID): void;
   onTick?(component: T, entity: EntityID): void;
   onUpdate?(entity: EntityID): void;
   onCollision?(entity: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   onHit?(entity: EntityID, isDamagingHit: boolean): void;
   onRemove?(entity: EntityID): void;
   /** Called when the entity dies, not when the entity leaves the player's vision. */
   onDie?(entity: EntityID): void;
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
let clientComponentArrayRecord: Record<ClientComponentType, ClientComponentArray> = {} as any;
let serverComponentArrayRecord: Record<ServerComponentType, ServerComponentArray> = {} as any;

export abstract class ComponentArray<T extends object = object, ArrayType extends ComponentArrayType = ComponentArrayType, ComponentType extends ComponentTypeForArray[ArrayType] = ComponentTypeForArray[ArrayType]> implements ComponentArrayFunctions<T> {
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

   public onLoad?(component: T, entity: EntityID): void;
   public onSpawn?(component: T, entity: EntityID): void;
   public onTick?: (component: T, entity: EntityID) => void;
   public onUpdate?: (entity: EntityID) => void;
   public onCollision?(entity: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   public onHit?(entity: EntityID, isDamagingHit: boolean): void;
   public onRemove?(entity: EntityID): void;
   public onDie?(entity: EntityID): void;

   constructor(arrayType: ArrayType, componentType: ComponentType, isActiveByDefault: boolean, functions: ComponentArrayFunctions<T>) {
      this.typeObject = {
         type: arrayType,
         componentType: componentType
      };
      this.isActiveByDefault = isActiveByDefault;
      
      this.onLoad = functions.onLoad;
      this.onSpawn = functions.onSpawn;
      this.onTick = functions.onTick;
      this.onUpdate = functions.onUpdate;
      this.onCollision = functions.onCollision;
      this.onHit = functions.onHit;
      this.onRemove = functions.onRemove;
      this.onDie = functions.onDie;

      componentArrays.push(this as unknown as ComponentArray);
      if (arrayType === ComponentArrayType.server) {
         // @Cleanup: casts
         serverComponentArrayRecord[componentType as ServerComponentType] = this as unknown as ServerComponentArray;
      } else {
         // @Cleanup: casts
         clientComponentArrayRecord[componentType as ClientComponentType] = this as unknown as ClientComponentArray;
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

export function getClientComponentArray(componentType: ClientComponentType): ClientComponentArray {
   return clientComponentArrayRecord[componentType];
}

export function getServerComponentArray(componentType: ServerComponentType): ServerComponentArray {
   return serverComponentArrayRecord[componentType];
}

export function updateEntity(entity: EntityID): void {
   for (let i = 0; i < componentArrays.length; i++) {
      const componentArray = componentArrays[i];
      if (typeof componentArray.onUpdate === "undefined") {
         continue;
      }
      
      if (componentArray.hasComponent(entity)) {
         componentArray.onUpdate(entity);
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