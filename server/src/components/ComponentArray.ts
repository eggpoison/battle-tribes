import Entity from "../Entity";
import { HealthComponent } from "./HealthComponent";
import { ItemComponent } from "./ItemComponent";
import { TribeComponent } from "./TribeComponent";
import { TotemBannerComponent } from "./TotemBannerComponent";
import { InventoryComponent } from "./InventoryComponent";
import { TreeComponent } from "./TreeComponent";
import { BerryBushComponent } from "./BerryBushComponent";
import { InventoryUseComponent } from "./InventoryUseComponent";
import { BoulderComponent } from "./BoulderComponent";
import { IceShardComponent } from "./IceShardComponent";
import { CowComponent } from "./CowComponent";
import { WanderAIComponent } from "./WanderAIComponent";
import { EscapeAIComponent } from "./EscapeAIComponent";
import { FollowAIComponent } from "./FollowAIComponent";
import { CactusComponent } from "./CactusComponent";
import { TribeMemberComponent } from "./TribeMemberComponent";
import { PlayerComponent } from "./PlayerComponent";
import { TribesmanComponent } from "./TribesmanComponent";
import { TombstoneComponent } from "./TombstoneComponent";
import { ZombieComponent } from "./ZombieComponent";
import { SlimewispComponent } from "./SlimewispComponent";
import { SlimeComponent } from "./SlimeComponent";
import { ArrowComponent } from "./ArrowComponent";
import { YetiComponent } from "./YetiComponent";
import { SnowballComponent } from "./SnowballComponent";
import { FishComponent } from "./FishComponent";
import Board from "../Board";
import { FrozenYetiComponent } from "./FrozenYetiComponent";
import { RockSpikeProjectileComponent } from "./RockSpikeProjectileComponent";
import { CookingComponent } from "./CookingComponent";
import { ThrowingProjectileComponent } from "./ThrowingProjectileComponent";
import { HutComponent } from "./HutComponent";
import { SlimeSpitComponent } from "./SlimeSpitComponent";
import { DoorComponent } from "./DoorComponent";
import { GolemComponent } from "./GolemComponent";
import { IceSpikesComponent } from "./IceSpikesComponent";
import { PebblumComponent } from "./PebblumComponent";
import { BlueprintComponent } from "./BlueprintComponent";
import { TurretComponent } from "./TurretComponent";
import { AmmoBoxComponent } from "./AmmoBoxComponent";
import { ResearchBenchComponent } from "./ResearchBenchComponent";
import { SpikesComponent } from "./SpikesComponent";
import { TunnelComponent } from "./TunnelComponent";
import { BuildingMaterialComponent } from "./BuildingMaterialComponent";
import { TribeWarriorComponent } from "./TribeWarriorComponent";
import { HealingTotemComponent } from "./HealingTotemComponent";
import { PlantComponent } from "./PlantComponent";
import { PlanterBoxComponent } from "./PlanterBoxComponent";
import { FenceComponent } from "./FenceComponent";
import { FenceGateComponent } from "./FenceGateComponent";

export const ComponentArrays = new Array<ComponentArray>();

export class ComponentArray<T = {}> {
   private readonly isActiveByDefault: boolean;
   
   public components = new Array<T>();
   private componentBuffer = new Array<T>();

   /** Maps entity IDs to component indexes */
   private entityToIndexMap: Record<number, number> = {};
   /** Maps component indexes to entity IDs */
   private indexToEntityMap: Record<number, number> = {};
   
   public activeComponents = new Array<T>();
   public activeEntityIDs = new Array<number>();

   /** Maps entity IDs to component indexes */
   public activeEntityToIndexMap: Record<number, number> = {};
   /** Maps component indexes to entity IDs */
   private activeIndexToEntityMap: Record<number, number> = {};

   private componentBufferIDs = new Array<number>();

   private deactivateBuffer = new Array<number>();

   public onJoin: ((entityID: number, component: T) => void) | undefined;
   
   constructor(isActiveByDefault: boolean, onJoin?: (entityID: number, component: T) => void) {
      this.isActiveByDefault = isActiveByDefault;
      this.onJoin = onJoin;

      // @Cleanup
      ComponentArrays.push(this as unknown as ComponentArray);
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
      return this.components[this.entityToIndexMap[entityID]];
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
      const indexOfRemovedEntity = this.entityToIndexMap[entityID];
      this.components[indexOfRemovedEntity] = this.components[this.components.length - 1];

		// Update map to point to moved spot
      const entityOfLastElement = this.indexToEntityMap[this.components.length - 1];
      this.entityToIndexMap[entityOfLastElement] = indexOfRemovedEntity;
      this.indexToEntityMap[indexOfRemovedEntity] = entityOfLastElement;

      delete this.entityToIndexMap[entityID];
      delete this.indexToEntityMap[this.components.length - 1];

      this.components.pop();

      // @Cleanup: copy and paste
      if (this.activeEntityToIndexMap[entityID] !== undefined) {
         this.deactivateComponent(entityID);
      }
   }

   public hasComponent(entityID: number): boolean {
      return this.entityToIndexMap.hasOwnProperty(entityID);
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

   public getEntity(index: number): Entity {
      const id = this.indexToEntityMap[index];
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

export const TribeComponentArray = new ComponentArray<TribeComponent>(true);
export const InventoryComponentArray = new ComponentArray<InventoryComponent>(true);
export const HealthComponentArray = new ComponentArray<HealthComponent>(true);
export const ItemComponentArray = new ComponentArray<ItemComponent>(true);
export const TotemBannerComponentArray = new ComponentArray<TotemBannerComponent>(true);
export const TreeComponentArray = new ComponentArray<TreeComponent>(true);
export const BerryBushComponentArray = new ComponentArray<BerryBushComponent>(true);
export const InventoryUseComponentArray = new ComponentArray<InventoryUseComponent>(true);
export const BoulderComponentArray = new ComponentArray<BoulderComponent>(true);
export const IceShardComponentArray = new ComponentArray<IceShardComponent>(true);
export const CowComponentArray = new ComponentArray<CowComponent>(true);
export const WanderAIComponentArray = new ComponentArray<WanderAIComponent>(true);
export const EscapeAIComponentArray = new ComponentArray<EscapeAIComponent>(true);
export const FollowAIComponentArray = new ComponentArray<FollowAIComponent>(true);
export const CactusComponentArray = new ComponentArray<CactusComponent>(true);
export const TribeMemberComponentArray = new ComponentArray<TribeMemberComponent>(true);
export const PlayerComponentArray = new ComponentArray<PlayerComponent>(true);
export const TribesmanComponentArray = new ComponentArray<TribesmanComponent>(true);
export const TombstoneComponentArray = new ComponentArray<TombstoneComponent>(true);
export const ZombieComponentArray = new ComponentArray<ZombieComponent>(true);
export const SlimewispComponentArray = new ComponentArray<SlimewispComponent>(true);
export const SlimeComponentArray = new ComponentArray<SlimeComponent>(true);
export const ArrowComponentArray = new ComponentArray<ArrowComponent>(true);
export const YetiComponentArray = new ComponentArray<YetiComponent>(true);
export const SnowballComponentArray = new ComponentArray<SnowballComponent>(true);
export const FishComponentArray = new ComponentArray<FishComponent>(true);
export const FrozenYetiComponentArray = new ComponentArray<FrozenYetiComponent>(true);
export const RockSpikeProjectileComponentArray = new ComponentArray<RockSpikeProjectileComponent>(true);
export const CookingComponentArray = new ComponentArray<CookingComponent>(true);
export const ThrowingProjectileComponentArray = new ComponentArray<ThrowingProjectileComponent>(true);
export const HutComponentArray = new ComponentArray<HutComponent>(true);
export const SlimeSpitComponentArray = new ComponentArray<SlimeSpitComponent>(true);
export const DoorComponentArray = new ComponentArray<DoorComponent>(true);
export const GolemComponentArray = new ComponentArray<GolemComponent>(true);
export const IceSpikesComponentArray = new ComponentArray<IceSpikesComponent>(true);
export const PebblumComponentArray = new ComponentArray<PebblumComponent>(true);
export const BlueprintComponentArray = new ComponentArray<BlueprintComponent>(true);
export const TurretComponentArray = new ComponentArray<TurretComponent>(true);
export const AmmoBoxComponentArray = new ComponentArray<AmmoBoxComponent>(true);
export const ResearchBenchComponentArray = new ComponentArray<ResearchBenchComponent>(true);
export const SpikesComponentArray = new ComponentArray<SpikesComponent>(true);
export const TunnelComponentArray = new ComponentArray<TunnelComponent>(true);
export const BuildingMaterialComponentArray = new ComponentArray<BuildingMaterialComponent>(true);
export const TribeWarriorComponentArray = new ComponentArray<TribeWarriorComponent>(true);
export const HealingTotemComponentArray = new ComponentArray<HealingTotemComponent>(true);
export const PlanterBoxComponentArray = new ComponentArray<PlanterBoxComponent>(true);
export const PlantComponentArray = new ComponentArray<PlantComponent>(true);
export const FenceComponentArray = new ComponentArray<FenceComponent>(true);
export const FenceGateComponentArray = new ComponentArray<FenceGateComponent>(true);