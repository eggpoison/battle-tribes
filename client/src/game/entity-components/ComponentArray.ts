import { Point, Entity } from "webgl-test-shared";
import { EntityComponentData } from "../world";
import { Hitbox } from "../hitboxes";
import { ComponentTint, EntityRenderObject } from "../EntityRenderObject";

export abstract class ComponentArray<
   Component extends object = object,
   ComponentIntermediateInfo = void
> {
   private readonly isActiveByDefault: boolean;
   
   public entities: Array<Entity> = [];
   public components: Array<Component> = [];

   /** Maps entity IDs to component indexes */
   private entityToIndexMap: Partial<Record<Entity, number>> = {};
   /** Maps component indexes to entity IDs */
   private indexToEntityMap: Partial<Record<number, Entity>> = {};
   
   public activeEntities: Array<Entity> = [];
   public activeComponents: Array<Component> = [];

   /** Maps entity IDs to component indexes */
   private activeEntityToIndexMap: Partial<Record<Entity, number>> = {};
   /** Maps component indexes to entity IDs */
   private activeIndexToEntityMap: Record<number, Entity> = {};

   private readonly deactivateBuffer: Array<Entity> = [];
   private readonly removeBuffer: Array<Entity> = [];

   // In reality this is just all information beyond its config which the component wishes to expose to other components
   // This is a separate layer so that, for example, components can immediately get render parts without having to wait for onLoad (introducing polymorphism)
   public populateIntermediateInfo?(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): ComponentIntermediateInfo;
   public abstract createComponent(entityComponentData: EntityComponentData, intermediateInfo: Readonly<ComponentIntermediateInfo>, renderObject: EntityRenderObject): Component;
   public abstract getMaxRenderParts(entityComponentData: EntityComponentData): number;
   /** Called once when the entity is being created, just after all the components are created from their data */
   public onLoad?(entity: Entity): void;
   public onJoin?(entity: Entity): void;
   /** Called when the entity is spawned in, not when the client first becomes aware of the entity's existence. After the load function */
   public onSpawn?(entity: Entity): void;
   public onTick?(entity: Entity): void;
   /** Called when a packet is skipped and there is no data to update from, so we must extrapolate all the game logic */
   public onUpdate?(entity: Entity): void;
   public onCollision?(entity: Entity, collidingEntity: Entity, pushedHitbox: Hitbox, pushingHitbox: Hitbox): void;
   public onHit?(entity: Entity, hitHitbox: Hitbox, hitPosition: Point, hitFlags: number): void;
   /** Called when the entity dies, not when the entity leaves the player's vision. */
   public onDie?(entity: Entity): void;
   public onRemove?(entity: Entity): void;
   /** Called whenever the entity is first selected or its data is changed while selected. */
   public updateSelectedEntityState?(entity: Entity): void;
   public calculateTint?(entity: Entity): ComponentTint;

   constructor(isActiveByDefault: boolean) {
      this.isActiveByDefault = isActiveByDefault;
   }

   public addComponentToRemoveBuffer(entity: Entity): void {
      // @Garbage
      this.removeBuffer.push(entity);
   }

   public addComponent(entity: Entity, component: Component): void {
      // Put new entry at end and update the maps
      const newIndex = this.components.length;
      this.entityToIndexMap[entity] = newIndex;
      this.indexToEntityMap[newIndex] = entity;
      this.components.push(component);
      this.entities.push(entity);

      if (this.isActiveByDefault) {
         this.activateComponent(component, entity);
      }
   }

   public removeFlaggedComponents(): void {
      const entitiesToRemove = this.removeBuffer;
      const len = entitiesToRemove.length;
      if (len === 0) {
         return;
      }
      
      let numDeactivated = 0;

      for (let i = 0; i < len; i++) {
         const entity = entitiesToRemove[i];
      
         const indexOfRemovedEntity = this.entityToIndexMap[entity]!;
         const indexOfLastEntity = this.entities.length - 1 - i;

         // Copy element at end into deleted element's place to maintain density
         this.components[indexOfRemovedEntity] = this.components[indexOfLastEntity];
         this.entities[indexOfRemovedEntity] = this.entities[indexOfLastEntity];

         // Update map to point to moved spot
         const entityOfLastElement = this.indexToEntityMap[indexOfLastEntity]!;
         this.entityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
         this.indexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

         delete this.entityToIndexMap[entity];
         delete this.indexToEntityMap[indexOfLastEntity];

         // Batched component deactivation
         // @Cleanup @Copynpaste
         if (this.activeEntityToIndexMap[entity] !== undefined) {
            const indexOfRemovedEntity = this.activeEntityToIndexMap[entity];
            const indexOfLastEntity = this.activeEntities.length - 1 - numDeactivated;

            // Copy element at end into deleted element's place to maintain density
            this.activeComponents[indexOfRemovedEntity] = this.activeComponents[indexOfLastEntity];
            this.activeEntities[indexOfRemovedEntity] = this.activeEntities[indexOfLastEntity];

            // Update map to point to moved spot
            const entityOfLastElement = this.activeIndexToEntityMap[indexOfLastEntity];
            this.activeEntityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
            this.activeIndexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

            delete this.activeEntityToIndexMap[entity];
            delete this.activeIndexToEntityMap[indexOfLastEntity];

            numDeactivated++;
         }
      }

      const newLength = this.entities.length - len;
      this.entities.length = newLength;
      this.components.length = newLength;

      if (numDeactivated > 0) {
         const newLength = this.activeEntities.length - numDeactivated;
         this.activeEntities.length = newLength;
         this.activeComponents.length = newLength;
      }

      this.removeBuffer.length = 0;
   }

   public getComponent(entity: Entity): Component {
      const idx = this.entityToIndexMap[entity]!;
      return this.components[idx];
   }

   public tryGetComponent(entity: Entity): Component | null {
      const idx = this.entityToIndexMap[entity];
      if (idx === undefined) {
         return null;
      }
      return this.components[idx];
   }

   public hasComponent(entity: Entity): boolean {
      return this.entityToIndexMap[entity] !== undefined;
   }

   public componentIsActive(entity: Entity): boolean {
      return this.activeEntityToIndexMap[entity] !== undefined;
   }

   public activateComponent(component: Component, entity: Entity): void {
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
      const indexOfRemovedEntity = this.activeEntityToIndexMap[entity]!;
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
      for (const entity of this.deactivateBuffer) {
         this.deactivateComponent(entity);
      }
      this.deactivateBuffer.length = 0;
   }
}