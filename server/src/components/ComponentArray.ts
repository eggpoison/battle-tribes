import { ComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { ComponentConfig } from "../components";
import { Hitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

export const ComponentArrays = new Array<ComponentArray>();
export const ComponentArrayRecord = {} as { [T in ServerComponentType]: ComponentArray<object, T> };

interface ComponentArrayFunctions<C extends ServerComponentType, T extends object> {
   /** Called after all the components for an entity are created, before the entity has joined the world. */
   onInitialise?(config: ComponentConfig<ServerComponentType>, entity: EntityID, entityType: EntityType): void;
   onJoin?(entity: EntityID): void;
   onTick?(entity: EntityID, component: T): void;
   onCollision?(entity: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   onRemove?(entity: EntityID): void;
   serialise(entity: EntityID, player: EntityID | null): ComponentData<C>;
}

export class ComponentArray<T extends object = object, C extends ServerComponentType = ServerComponentType> {
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
   public onInitialise?: (config: ComponentConfig<ServerComponentType>, entity: EntityID, entityType: EntityType) => void;
   public onJoin?: (entity: EntityID) => void;
   public onTick?(entity: EntityID, component: T): void;
   public onCollision?(entity: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   public onRemove?: (entity: EntityID) => void;
   public serialise: (entity: EntityID, player: EntityID | null) => ComponentData<C>;
   
   constructor(componentType: C, isActiveByDefault: boolean, functions: ComponentArrayFunctions<C, T>) {
      this.isActiveByDefault = isActiveByDefault;

      this.onInitialise = functions.onInitialise;
      this.onJoin = functions.onJoin;
      this.onTick = functions.onTick;
      this.onCollision = functions.onCollision;
      this.onRemove = functions.onRemove;
      this.serialise = functions.serialise;

      ComponentArrays.push(this);
      // @Cleanup: cast
      ComponentArrayRecord[componentType] = this as any;
   }
   
   public addComponent(entity: EntityID, component: T): void {
      if (typeof this.entityToIndexMap[entity] !== "undefined") {
         throw new Error("Component added to same entity twice.");
      }

      this.componentBuffer.push(component);
      this.componentBufferIDs.push(entity);
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

   public getComponent(entity: EntityID): T {
      return this.components[this.entityToIndexMap[entity]!];
   }

   public removeComponent(entity: EntityID): void {
		// Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.entityToIndexMap[entity]!;
      this.components[indexOfRemovedEntity] = this.components[this.components.length - 1];

		// Update map to point to moved spot
      const entityOfLastElement = this.indexToEntityMap[this.components.length - 1]!;
      this.entityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.indexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.entityToIndexMap[entity];
      delete this.indexToEntityMap[this.components.length - 1];

      this.components.pop();

      if (typeof this.activeEntityToIndexMap[entity] !== "undefined") {
         this.deactivateComponent(entity);
      }
   }

   public hasComponent(entity: EntityID): boolean {
      return typeof this.entityToIndexMap[entity] !== "undefined";
   }

   public activateComponent(component: T, entity: EntityID): void {
      // Put new entry at end and update the maps
      const newIndex = this.activeComponents.length;
      this.activeEntityToIndexMap[entity] = newIndex;
      this.activeIndexToEntityMap[newIndex] = entity;
      this.activeComponents.push(component);

      this.activeEntityIDs.push(entity);
   }

   private deactivateComponent(entity: EntityID): void {
      // Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.activeEntityToIndexMap[entity];
      this.activeComponents[indexOfRemovedEntity] = this.activeComponents[this.activeComponents.length - 1];
      this.activeEntityIDs[indexOfRemovedEntity] = this.activeEntityIDs[this.activeComponents.length - 1];

      // Update map to point to moved spot
      const entityOfLastElement = this.activeIndexToEntityMap[this.activeComponents.length - 1];
      this.activeEntityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.activeIndexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.activeEntityToIndexMap[entity];
      delete this.activeIndexToEntityMap[this.activeComponents.length - 1];

      this.activeComponents.pop();
      this.activeEntityIDs.pop();
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

   // @Hack: should never be allowed.
   public getEntityFromArrayIdx(index: number): EntityID {
      return this.indexToEntityMap[index]!;
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