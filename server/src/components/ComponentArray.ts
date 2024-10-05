import { ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { EntityConfig } from "../components";
import { Packet } from "battletribes-shared/packets";
import { Hitbox } from "battletribes-shared/boxes/boxes";
import { Point } from "../../../shared/src/utils";

const enum ComponentArrayPriority {
   low,
   medium,
   high
}

interface ComponentArrayTickFunction<T extends object> {
   readonly tickInterval: number;
   func(component: T, entity: EntityID): void;
}

interface ComponentArrayFunctions<T extends object> {
   /** Called after all the components for an entity are created, before the entity has joined the world. */
   onInitialise?(config: EntityConfig<ServerComponentType>, entity: EntityID): void;
   onJoin?(entity: EntityID): void;
   readonly onTick?: ComponentArrayTickFunction<T>;
   onCollision?(entity: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox, collisionPoint: Point): void;
   onRemove?(entity: EntityID): void;
   // @Cleanup: make getDataLength not return an extra float length
   /** Returns the length of the data that would be added to the packet */
   getDataLength(entity: EntityID, player: EntityID | null): number;
   addDataToPacket(packet: Packet, entity: EntityID, player: EntityID | null): void;
}

export const ComponentArrays = new Array<ComponentArray>();
export const ComponentArrayRecord = {} as { [T in ServerComponentType]: ComponentArray<object, T> };

export class ComponentArray<T extends object = object, C extends ServerComponentType = ServerComponentType> implements ComponentArrayFunctions<T> {
   public readonly componentType: ServerComponentType;
   private readonly isActiveByDefault: boolean;
   
   public components = new Array<T>();
   private componentBuffer = new Array<T>();
   public bufferedComponentJoinTicksRemaining = new Array<number>();

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

   private componentBufferIDs = new Array<number>();

   private deactivateBuffer = new Array<number>();

   // @Bug @Incomplete: This function shouldn't create an entity, as that will cause a crash. (Can't add components to the join buffer while iterating it). solution: make it not crash
   public onInitialise?(config: EntityConfig<ServerComponentType>, entity: EntityID): void;
   public onJoin?(entity: EntityID): void;
   public onTick?: ComponentArrayTickFunction<T>;
   public onCollision?(entity: EntityID, collidingEntity: EntityID, pushedHitbox: Hitbox, pushingHitbox: Hitbox, collisionPoint: Point): void;
   public onRemove?(entity: EntityID): void;
   public getDataLength: (entity: EntityID, player: EntityID | null) => number;
   public addDataToPacket: (packet: Packet, entity: EntityID, player: EntityID | null) => void;
   
   constructor(componentType: C, isActiveByDefault: boolean, functions: ComponentArrayFunctions<T>) {
      this.componentType = componentType;
      this.isActiveByDefault = isActiveByDefault;

      this.onInitialise = functions.onInitialise;
      this.onJoin = functions.onJoin;
      this.onTick = functions.onTick;
      this.onCollision = functions.onCollision;
      this.onRemove = functions.onRemove;
      this.getDataLength = functions.getDataLength;
      this.addDataToPacket = functions.addDataToPacket;

      ComponentArrays.push(this);
      // @Cleanup: cast
      ComponentArrayRecord[componentType] = this as any;
   }
   
   public addComponent(entity: EntityID, component: T, joinDelayTicks: number): void {
      if (typeof this.entityToIndexMap[entity] !== "undefined") {
         throw new Error("Component added to same entity twice.");
      }

      // @Speed
      // Find a spot for the component
      let insertIdx = this.bufferedComponentJoinTicksRemaining.length;
      for (let i = 0; i < this.bufferedComponentJoinTicksRemaining.length; i++) {
         if (this.bufferedComponentJoinTicksRemaining[i] > joinDelayTicks) {
            insertIdx = i;
            break;
         }
      }

      this.componentBuffer.splice(insertIdx, 0, component);
      this.componentBufferIDs.splice(insertIdx, 0, entity);
      this.bufferedComponentJoinTicksRemaining.splice(insertIdx, 0, joinDelayTicks);
   }

   public pushComponentsFromBuffer(): void {
      for (let i = 0; i < this.componentBuffer.length; i++) {
         const ticksRemaining = this.bufferedComponentJoinTicksRemaining[i];
         if (ticksRemaining > 0) {
            break;
         }
         
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

   public clearJoinedComponents(): void {
      let finalPushedIdx: number | undefined;
      for (let i = 0; i < this.componentBufferIDs.length; i++) {
         const ticksRemaining = this.bufferedComponentJoinTicksRemaining[i];
         if (ticksRemaining > 0) {
            this.bufferedComponentJoinTicksRemaining[i]--;
            continue;
         } else {
            finalPushedIdx = i;
         }
      }

      if (typeof finalPushedIdx !== "undefined") {
         const numPushedEntities = finalPushedIdx + 1;
         this.componentBuffer.splice(0, numPushedEntities);
         this.componentBufferIDs.splice(0, numPushedEntities);
         this.bufferedComponentJoinTicksRemaining.splice(0, numPushedEntities);
      }
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

export function sortComponentArrays(): void {
   const PRIORITIES: Record<ServerComponentType, ComponentArrayPriority> = {
      [ServerComponentType.aiHelper]: ComponentArrayPriority.low,
      // Low so that any damage boxes created aren't immediately ticked
      [ServerComponentType.damageBox]: ComponentArrayPriority.low,
      [ServerComponentType.berryBush]: ComponentArrayPriority.medium,
      [ServerComponentType.blueprint]: ComponentArrayPriority.medium,
      [ServerComponentType.boulder]: ComponentArrayPriority.medium,
      [ServerComponentType.cactus]: ComponentArrayPriority.medium,
      [ServerComponentType.cooking]: ComponentArrayPriority.medium,
      [ServerComponentType.cow]: ComponentArrayPriority.medium,
      [ServerComponentType.door]: ComponentArrayPriority.medium,
      [ServerComponentType.fish]: ComponentArrayPriority.medium,
      [ServerComponentType.frozenYeti]: ComponentArrayPriority.medium,
      [ServerComponentType.golem]: ComponentArrayPriority.medium,
      [ServerComponentType.hut]: ComponentArrayPriority.medium,
      [ServerComponentType.iceShard]: ComponentArrayPriority.medium,
      [ServerComponentType.iceSpikes]: ComponentArrayPriority.medium,
      [ServerComponentType.inventory]: ComponentArrayPriority.medium,
      [ServerComponentType.inventoryUse]: ComponentArrayPriority.medium,
      [ServerComponentType.item]: ComponentArrayPriority.medium,
      [ServerComponentType.pebblum]: ComponentArrayPriority.medium,
      [ServerComponentType.player]: ComponentArrayPriority.medium,
      [ServerComponentType.rockSpike]: ComponentArrayPriority.medium,
      [ServerComponentType.slime]: ComponentArrayPriority.medium,
      [ServerComponentType.slimeSpit]: ComponentArrayPriority.medium,
      [ServerComponentType.slimewisp]: ComponentArrayPriority.medium,
      [ServerComponentType.snowball]: ComponentArrayPriority.medium,
      [ServerComponentType.statusEffect]: ComponentArrayPriority.medium,
      [ServerComponentType.throwingProjectile]: ComponentArrayPriority.medium,
      [ServerComponentType.tombstone]: ComponentArrayPriority.medium,
      [ServerComponentType.totemBanner]: ComponentArrayPriority.medium,
      [ServerComponentType.tree]: ComponentArrayPriority.medium,
      [ServerComponentType.tribe]: ComponentArrayPriority.medium,
      [ServerComponentType.tribeMember]: ComponentArrayPriority.medium,
      [ServerComponentType.tribesmanAI]: ComponentArrayPriority.medium,
      [ServerComponentType.turret]: ComponentArrayPriority.medium,
      [ServerComponentType.yeti]: ComponentArrayPriority.medium,
      [ServerComponentType.zombie]: ComponentArrayPriority.medium,
      [ServerComponentType.ammoBox]: ComponentArrayPriority.medium,
      [ServerComponentType.wanderAI]: ComponentArrayPriority.medium,
      [ServerComponentType.escapeAI]: ComponentArrayPriority.medium,
      [ServerComponentType.followAI]: ComponentArrayPriority.medium,
      [ServerComponentType.researchBench]: ComponentArrayPriority.medium,
      [ServerComponentType.tunnel]: ComponentArrayPriority.medium,
      [ServerComponentType.buildingMaterial]: ComponentArrayPriority.medium,
      [ServerComponentType.spikes]: ComponentArrayPriority.medium,
      [ServerComponentType.punjiSticks]: ComponentArrayPriority.medium,
      [ServerComponentType.tribeWarrior]: ComponentArrayPriority.medium,
      [ServerComponentType.healingTotem]: ComponentArrayPriority.medium,
      [ServerComponentType.planterBox]: ComponentArrayPriority.medium,
      [ServerComponentType.plant]: ComponentArrayPriority.medium,
      [ServerComponentType.structure]: ComponentArrayPriority.medium,
      [ServerComponentType.fence]: ComponentArrayPriority.medium,
      [ServerComponentType.fenceGate]: ComponentArrayPriority.medium,
      [ServerComponentType.craftingStation]: ComponentArrayPriority.medium,
      [ServerComponentType.transform]: ComponentArrayPriority.medium,
      [ServerComponentType.projectile]: ComponentArrayPriority.medium,
      [ServerComponentType.iceArrow]: ComponentArrayPriority.medium,
      [ServerComponentType.layeredRod]: ComponentArrayPriority.medium,
      [ServerComponentType.decoration]: ComponentArrayPriority.medium,
      [ServerComponentType.spitPoisonArea]: ComponentArrayPriority.medium,
      [ServerComponentType.battleaxeProjectile]: ComponentArrayPriority.medium,
      [ServerComponentType.spearProjectile]: ComponentArrayPriority.medium,
      [ServerComponentType.krumblid]: ComponentArrayPriority.medium,
      [ServerComponentType.guardian]: ComponentArrayPriority.medium,
      [ServerComponentType.guardianGemQuake]: ComponentArrayPriority.medium,
      [ServerComponentType.guardianGemFragmentProjectile]: ComponentArrayPriority.medium,
      [ServerComponentType.guardianSpikyBall]: ComponentArrayPriority.medium,
      [ServerComponentType.health]: ComponentArrayPriority.high,
      // The physics component ticking must be done at the end so there is time for the positionIsDirty and hitboxesAreDirty flags to collect
      [ServerComponentType.physics]: ComponentArrayPriority.high
   };

   for (let i = 0; i < ComponentArrays.length - 1; i++) {
      for (let j = 0; j < ComponentArrays.length - i - 1; j++) {
         const elem1 = ComponentArrays[j];
         const elem2 = ComponentArrays[j + 1];
         
         const priority1 = PRIORITIES[elem1.componentType];
         const priority2 = PRIORITIES[elem2.componentType];
         
         if (priority1 > priority2) {
            const temp = ComponentArrays[j];
            ComponentArrays[j] = ComponentArrays[j + 1];
            ComponentArrays[j + 1] = temp;
         }
      }
  }
}