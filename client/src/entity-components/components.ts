import { ComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import TurretComponent from "./TurretComponent";
import CowComponent from "./CowComponent";
import TribeComponent from "./TribeComponent";
import InventoryComponent from "./InventoryComponent";
import AmmoBoxComponent from "./AmmoBoxComponent";
import SlimeComponent from "./SlimeComponent";
import GolemComponent from "./GolemComponent";
import StatusEffectComponent from "./StatusEffectComponent";
import CactusComponent from "./CactusComponent";
import HealthComponent from "./HealthComponent";
import PhysicsComponent from "./PhysicsComponent";
import ResearchBenchComponent from "./ResearchBenchComponent";
import BerryBushComponent from "./BerryBushComponent";
import InventoryUseComponent from "./InventoryUseComponent";
import ZombieComponent from "./ZombieComponent";
import Component from "./Component";
import EquipmentComponent from "./EquipmentComponent";
import PlayerComponent from "./PlayerComponent";
import ItemComponent from "./ItemComponent";
import TombstoneComponent from "./TombstoneComponent";
import TreeComponent from "./TreeComponent";
import BlueprintComponent from "./BlueprintComponent";
import ArrowComponent from "./ArrowComponent";
import YetiComponent from "./YetiComponent";
import FrozenYetiComponent from "./FrozenYetiComponent";
import FootprintComponent from "./FootprintComponent";
import ServerComponent from "./ServerComponent";
import TotemBannerComponent from "./TotemBannerComponent";
import HutComponent from "./HutComponent";
import CookingComponent from "./CookingComponent";
import SnowballComponent from "./SnowballComponent";
import FishComponent from "./FishComponent";
import RockSpikeComponent from "./RockSpikeComponent";
import SlimeSpitComponent from "./SlimeSpitComponent";
import DoorComponent from "./DoorComponent";
import TribesmanAIComponent from "./TribesmanAIComponent";
import TunnelComponent from "./TunnelComponent";
import BuildingMaterialComponent from "./BuildingMaterialComponent";
import SpikesComponent from "./SpikesComponent";
import TribeMemberComponent from "./TribeMemberComponent";
import HealingTotemComponent from "./HealingTotemComponent";
import PlantComponent from "./PlantComponent";
import PlanterBoxComponent from "./PlanterBoxComponent";
import FenceComponent from "./FenceComponent";
import FenceGateComponent from "./FenceGateComponent";
import StructureComponent from "./StructureComponent";
import CraftingStationComponent from "./CraftingStationComponent";
import Entity from "../Entity";
import BoulderComponent from "./BoulderComponent";
import AIHelperComponent from "./AIHelperComponent";
import WanderAIComponent from "./WanderAIComponent";
import EscapeAIComponent from "./EscapeAIComponent";
import IceSpikesComponent from "./IceSpikesComponent";
import FollowAIComponent from "./FollowAIComponent";
import IceShardComponent from "./IceShardComponent";
import PebblumComponent from "./PebblumComponent";
import SlimewispComponent from "./SlimewispComponent";
import ThrowingProjectileComponent from "./ThrowingProjectileComponent";
import TribeWarriorComponent from "./TribeWarriorComponent";

export enum ClientComponentType {
   equipment,
   footprint
}

const ServerComponents = {
   [ServerComponentType.cow]: (): CowComponent => 0 as any,
   [ServerComponentType.turret]: (): TurretComponent => 0 as any,
   [ServerComponentType.tribe]: (): TribeComponent => 0 as any,
   [ServerComponentType.inventory]: (): InventoryComponent => 0 as any,
   [ServerComponentType.ammoBox]: (): AmmoBoxComponent => 0 as any,
   [ServerComponentType.slime]: (): SlimeComponent => 0 as any,
   [ServerComponentType.golem]: (): GolemComponent => 0 as any,
   [ServerComponentType.statusEffect]: (): StatusEffectComponent => 0 as any,
   [ServerComponentType.cactus]: (): CactusComponent => 0 as any,
   [ServerComponentType.health]: (): HealthComponent => 0 as any,
   [ServerComponentType.physics]: (): PhysicsComponent => 0 as any,
   [ServerComponentType.researchBench]: (): ResearchBenchComponent => 0 as any,
   [ServerComponentType.berryBush]: (): BerryBushComponent => 0 as any,
   [ServerComponentType.inventoryUse]: (): InventoryUseComponent => 0 as any,
   [ServerComponentType.zombie]: (): ZombieComponent => 0 as any,
   [ServerComponentType.player]: (): PlayerComponent => 0 as any,
   [ServerComponentType.item]: (): ItemComponent => 0 as any,
   [ServerComponentType.tombstone]: (): TombstoneComponent => 0 as any,
   [ServerComponentType.tree]: (): TreeComponent => 0 as any,
   [ServerComponentType.blueprint]: (): BlueprintComponent => 0 as any,
   [ServerComponentType.arrow]: (): ArrowComponent => 0 as any,
   [ServerComponentType.yeti]: (): YetiComponent => 0 as any,
   [ServerComponentType.frozenYeti]: (): FrozenYetiComponent => 0 as any,
   [ServerComponentType.totemBanner]: (): TotemBannerComponent => 0 as any,
   [ServerComponentType.cooking]: (): CookingComponent => 0 as any,
   [ServerComponentType.hut]: (): HutComponent => 0 as any,
   [ServerComponentType.snowball]: (): SnowballComponent => 0 as any,
   [ServerComponentType.fish]: (): FishComponent => 0 as any,
   [ServerComponentType.rockSpike]: (): RockSpikeComponent => 0 as any,
   [ServerComponentType.slimeSpit]: (): SlimeSpitComponent => 0 as any,
   [ServerComponentType.door]: (): DoorComponent => 0 as any,
   [ServerComponentType.tribesmanAI]: (): TribesmanAIComponent => 0 as any,
   [ServerComponentType.tunnel]: (): TunnelComponent => 0 as any,
   [ServerComponentType.buildingMaterial]: (): BuildingMaterialComponent => 0 as any,
   [ServerComponentType.spikes]: (): SpikesComponent => 0 as any,
   [ServerComponentType.tribeMember]: (): TribeMemberComponent => 0 as any,
   [ServerComponentType.healingTotem]: (): HealingTotemComponent => 0 as any,
   [ServerComponentType.planterBox]: (): PlanterBoxComponent => 0 as any,
   [ServerComponentType.plant]: (): PlantComponent => 0 as any,
   [ServerComponentType.structure]: (): StructureComponent => 0 as any,
   [ServerComponentType.fence]: (): FenceComponent => 0 as any,
   [ServerComponentType.fenceGate]: (): FenceGateComponent => 0 as any,
   [ServerComponentType.craftingStation]: (): CraftingStationComponent => 0 as any,
   [ServerComponentType.aiHelper]: (): AIHelperComponent => 0 as any,
   [ServerComponentType.boulder]: (): BoulderComponent => 0 as any,
   [ServerComponentType.iceShard]: (): IceShardComponent => 0 as any,
   [ServerComponentType.iceSpikes]: (): IceSpikesComponent => 0 as any,
   [ServerComponentType.pebblum]: (): PebblumComponent => 0 as any,
   [ServerComponentType.slimewisp]: (): SlimewispComponent => 0 as any,
   [ServerComponentType.throwingProjectile]: (): ThrowingProjectileComponent => 0 as any,
   [ServerComponentType.wanderAI]: (): WanderAIComponent => 0 as any,
   [ServerComponentType.escapeAI]: (): EscapeAIComponent => 0 as any,
   [ServerComponentType.followAI]: (): FollowAIComponent => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponent => 0 as any
} satisfies Record<ServerComponentType, () => ServerComponent>;

export const ClientComponents = {
   [ClientComponentType.equipment]: (): EquipmentComponent => 0 as any,
   [ClientComponentType.footprint]: (): FootprintComponent => 0 as any
} satisfies Record<ClientComponentType, () => Component>;

export type ServerComponentClass<T extends ServerComponentType> = ReturnType<typeof ServerComponents[T]>;
export type ClientComponentClass<T extends ClientComponentType> = ReturnType<typeof ClientComponents[T]>;

export function createComponent<T extends ServerComponentType>(entity: Entity, data: ComponentData<T>): ServerComponent {
   switch (data.componentType) {
      case ServerComponentType.cow: return new CowComponent(entity, data);
      case ServerComponentType.turret: return new TurretComponent(entity, data);
      case ServerComponentType.tribe: return new TribeComponent(entity, data);
      case ServerComponentType.inventory: return new InventoryComponent(entity, data);
      case ServerComponentType.ammoBox: return new AmmoBoxComponent(entity, data);
      case ServerComponentType.slime: return new SlimeComponent(entity, data);
      case ServerComponentType.golem: return new GolemComponent(entity, data);
      case ServerComponentType.statusEffect: return new StatusEffectComponent(entity, data);
      case ServerComponentType.cactus: return new CactusComponent(entity, data);
      case ServerComponentType.health: return new HealthComponent(entity, data);
      case ServerComponentType.physics: return new PhysicsComponent(entity, data);
      case ServerComponentType.researchBench: return new ResearchBenchComponent(entity, data);
      case ServerComponentType.berryBush: return new BerryBushComponent(entity, data);
      case ServerComponentType.inventoryUse: return new InventoryUseComponent(entity, data);
      case ServerComponentType.zombie: return new ZombieComponent(entity, data);
      case ServerComponentType.player: return new PlayerComponent(entity, data);
      case ServerComponentType.item: return new ItemComponent(entity, data);
      case ServerComponentType.tombstone: return new TombstoneComponent(entity, data);
      case ServerComponentType.tree: return new TreeComponent(entity, data);
      case ServerComponentType.blueprint: return new BlueprintComponent(entity, data);
      case ServerComponentType.arrow: return new ArrowComponent(entity, data);
      case ServerComponentType.yeti: return new YetiComponent(entity, data);
      case ServerComponentType.frozenYeti: return new FrozenYetiComponent(entity, data);
      case ServerComponentType.totemBanner: return new TotemBannerComponent(entity, data);
      case ServerComponentType.cooking: return new CookingComponent(entity, data);
      case ServerComponentType.hut: return new HutComponent(entity, data);
      case ServerComponentType.snowball: return new SnowballComponent(entity, data);
      case ServerComponentType.fish: return new FishComponent(entity, data);
      case ServerComponentType.rockSpike: return new RockSpikeComponent(entity, data);
      case ServerComponentType.slimeSpit: return new SlimeSpitComponent(entity, data);
      case ServerComponentType.door: return new DoorComponent(entity, data);
      case ServerComponentType.tribesmanAI: return new TribesmanAIComponent(entity, data);
      case ServerComponentType.tunnel: return new TunnelComponent(entity, data);
      case ServerComponentType.buildingMaterial: return new BuildingMaterialComponent(entity, data);
      case ServerComponentType.spikes: return new SpikesComponent(entity, data);
      case ServerComponentType.tribeMember: return new TribeMemberComponent(entity, data);
      case ServerComponentType.healingTotem: return new HealingTotemComponent(entity, data);
      case ServerComponentType.planterBox: return new PlanterBoxComponent(entity, data);
      case ServerComponentType.plant: return new PlantComponent(entity, data);
      case ServerComponentType.structure: return new StructureComponent(entity, data);
      case ServerComponentType.fence: return new FenceComponent(entity, data);
      case ServerComponentType.fenceGate: return new FenceGateComponent(entity, data);
      case ServerComponentType.craftingStation: return new CraftingStationComponent(entity, data);
      case ServerComponentType.boulder: return new BoulderComponent(entity, data);
      case ServerComponentType.aiHelper: return new AIHelperComponent(entity, data);
      case ServerComponentType.wanderAI: return new WanderAIComponent(entity, data);
      case ServerComponentType.escapeAI: return new EscapeAIComponent(entity, data);
      case ServerComponentType.iceSpikes: return new IceSpikesComponent(entity, data);
      case ServerComponentType.followAI: return new FollowAIComponent(entity, data);
      case ServerComponentType.iceShard: return new IceShardComponent(entity, data);
      case ServerComponentType.pebblum: return new PebblumComponent(entity, data);
      case ServerComponentType.slimewisp: return new SlimewispComponent(entity, data);
      case ServerComponentType.throwingProjectile: return new ThrowingProjectileComponent(entity, data);
      case ServerComponentType.tribeWarrior: return new TribeWarriorComponent(entity, data);
      default: {
         const unreachable: never = data;
         return unreachable;
      }
   }
}