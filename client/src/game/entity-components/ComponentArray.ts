import { assert, Point, Entity, EntityType } from "webgl-test-shared";
import { EntityComponentData } from "../world";
import { Hitbox } from "../hitboxes";
import { ComponentTint, EntityRenderInfo } from "../EntityRenderInfo";

let componentArrayIDCounter = 0;

const componentArrays = new Array<ComponentArray>();

export abstract class ComponentArray<
   T extends object = object,
   ComponentIntermediateInfo extends object | never = object | never
> {
   public readonly id = componentArrayIDCounter++;
   private readonly isActiveByDefault: boolean;
   
   public entities = new Array<Entity>();
   public components = new Array<T>();

   /** Maps entity IDs to component indexes */
   private entityToIndexMap: Partial<Record<Entity, number>> = {};
   /** Maps component indexes to entity IDs */
   private indexToEntityMap: Partial<Record<number, Entity>> = {};
   
   public activeComponents = new Array<T>();
   public activeEntities = new Array<Entity>();

   /** Maps entity IDs to component indexes */
   private activeEntityToIndexMap: Record<Entity, number> = {};
   /** Maps component indexes to entity IDs */
   private activeIndexToEntityMap: Record<number, Entity> = {};

   private deactivateBuffer = new Array<number>();

   // In reality this is just all information beyond its config which the component wishes to expose to other components
   // This is a separate layer so that, for example, components can immediately get render parts without having to wait for onLoad (introducing polymorphism)
   public populateIntermediateInfo?(renderInfo: EntityRenderInfo, entityComponentData: Readonly<EntityComponentData>): ComponentIntermediateInfo;
   public readonly createComponent: (entityComponentData: Readonly<EntityComponentData>, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderInfo: EntityRenderInfo) => T;
   public readonly getMaxRenderParts: (entityComponentData: EntityComponentData) => number;
   /** Called once when the entity is being created, just after all the components are created from their data */
   public onLoad?(entity: Entity): void;
   public onJoin?(entity: Entity): void;
   /** Called when the entity is spawned in, not when the client first becomes aware of the entity's existence. After the load function */
   public onSpawn?(entity: Entity): void;
   public onTick?: (entity: Entity) => void;
   /** Called when a packet is skipped and there is no data to update from, so we must extrapolate all the game logic */
   public onUpdate?: (entity: Entity) => void;
   public onCollision?(entity: Entity, collidingEntity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   public onHit?(entity: Entity, hitHitbox: Hitbox, hitPosition: Point, hitFlags: number): void;
   /** Called when the entity dies, not when the entity leaves the player's vision. */
   public onDie?(entity: Entity): void;
   public onRemove?(entity: Entity): void;
   /** Called whenever the entity is first selected or its data is changed while selected. */
   public updateSelectedEntityState?(entity: Entity): void;
   public calculateTint?(entity: Entity): ComponentTint;

   constructor(isActiveByDefault: boolean, createComponent: (entityComponentData: Readonly<EntityComponentData>, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderInfo: EntityRenderInfo) => T, getMaxRenderParts: (entityComponentData: EntityComponentData) => number) {
      this.isActiveByDefault = isActiveByDefault;
      
      this.createComponent = createComponent;
      this.getMaxRenderParts = getMaxRenderParts;

      // @Cleanup: cast
      componentArrays.push(this as unknown as ComponentArray);
   }

   // @HACK: the entity type param
   public addComponent(entity: Entity, component: T, entityType: EntityType): void {
      // Put new entry at end and update the maps
      const newIndex = this.components.length;
      this.entityToIndexMap[entity] = newIndex;
      this.indexToEntityMap[newIndex] = entity;
      this.components.push(component);
      this.entities.push(entity);

      if (this.isActiveByDefault) {
         // @INCOMPLETE @SQUEAM
         // @Hack so that tickEntities doesn't kill everything with slow
         // if (!(this.componentType === ServerComponentType.transform && entityType === EntityType.grassStrand)) {
            this.activateComponent(component, entity);
         // }
      }
   }

   public removeComponent(entity: Entity): void {
		// Copy element at end into deleted element's place to maintain density
      const indexOfRemovedEntity = this.entityToIndexMap[entity];
      assert(typeof indexOfRemovedEntity !== "undefined");
      this.components[indexOfRemovedEntity] = this.components[this.components.length - 1];
      this.entities[indexOfRemovedEntity] = this.entities[this.entities.length - 1];

		// Update map to point to moved spot
      const entityOfLastElement = this.indexToEntityMap[this.components.length - 1]!;
      this.entityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.indexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.entityToIndexMap[entity];
      delete this.indexToEntityMap[this.components.length - 1];

      this.components.pop();
      this.entities.pop();

      if (typeof this.activeEntityToIndexMap[entity] !== "undefined") {
         this.deactivateComponent(entity);
      }
   }

   public getComponent(entity: Entity): T {
      const idx = this.entityToIndexMap[entity]!;
      return this.components[idx];
   }

   public tryGetComponent(entity: Entity): T | null {
      const idx = this.entityToIndexMap[entity];
      if (typeof idx === "undefined") {
         return null;
      }
      return this.components[idx];
   }

   public hasComponent(entity: Entity): boolean {
      return typeof this.entityToIndexMap[entity] !== "undefined";
   }

   public componentIsActive(entity: Entity): boolean {
      return typeof this.activeEntityToIndexMap[entity] !== "undefined";
   }

   public activateComponent(component: T, entity: Entity): void {
      // Don't activate if already active
      if (this.componentIsActive(entity)) {
         return;
      }
      
      // Put new entry at end and update the maps
      const newIndex = this.activeComponents.length;
      this.activeEntityToIndexMap[entity] = newIndex;
      this.activeIndexToEntityMap[newIndex] = entity;
      this.activeComponents.push(component);

      this.activeEntities.push(entity);
   }

   private deactivateComponent(entity: Entity): void {
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

   public queueComponentDeactivate(entity: Entity): void {
      this.deactivateBuffer.push(entity);
   }

   public deactivateQueue(): void {
      for (const entityID of this.deactivateBuffer) {
         this.deactivateComponent(entityID);
      }
      this.deactivateBuffer = [];
   }

   /** VERY slow function. Should only be used for debugging purposes. */
   public getEntityFromComponent(component: T): Entity {
      let idx: number | undefined;
      for (let i = 0; i < this.components.length; i++) {
         const currentComponent = this.components[i];
         if (currentComponent === component) {
            idx = i;
            break;
         }
      }
      assert(typeof idx !== "undefined");

      const entity = this.indexToEntityMap[idx];
      assert(typeof entity !== "undefined");

      return entity;
   }
}

export function getComponentArrays(): ReadonlyArray<ComponentArray> {
   return componentArrays;
}