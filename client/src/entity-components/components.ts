import { ServerComponentType } from "webgl-test-shared/dist/components";
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

export enum ClientComponentType {
   equipment,
   footprint
}

export const ServerComponents = {
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
   [ServerComponentType.boulder]: (): BlueprintComponent => 0 as any,
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
   [ServerComponentType.tribesman]: (): TribesmanAIComponent => 0 as any,
   [ServerComponentType.tunnel]: (): TunnelComponent => 0 as any,
   [ServerComponentType.buildingMaterial]: (): BuildingMaterialComponent => 0 as any,
   [ServerComponentType.spikes]: (): SpikesComponent => 0 as any,
   [ServerComponentType.tribeMember]: (): TribeMemberComponent => 0 as any,
   [ServerComponentType.healingTotem]: (): HealingTotemComponent => 0 as any,
   [ServerComponentType.planterBox]: (): PlanterBoxComponent => 0 as any,
   [ServerComponentType.plant]: (): PlantComponent => 0 as any,
   [ServerComponentType.structure]: (): StructureComponent => 0 as any,
   [ServerComponentType.fence]: (): FenceComponent => 0 as any,
   [ServerComponentType.fenceGate]: (): FenceGateComponent => 0 as any
} satisfies Partial<Record<ServerComponentType, () => ServerComponent>>;

export const ClientComponents = {
   [ClientComponentType.equipment]: (): EquipmentComponent => 0 as any,
   [ClientComponentType.footprint]: (): FootprintComponent => 0 as any
} satisfies Record<ClientComponentType, () => Component>;

export type ServerComponentClass<T extends keyof typeof ServerComponents> = ReturnType<typeof ServerComponents[T]>;
export type ClientComponentClass<T extends ClientComponentType> = ReturnType<typeof ClientComponents[T]>;