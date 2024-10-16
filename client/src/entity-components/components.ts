import { ServerComponentType } from "../../../shared/src/components";
import RandomSoundComponent from "./client-components/RandomSoundComponent";
import AIHelperComponent from "./server-components/AIHelperComponent";
import AmmoBoxComponent from "./server-components/AmmoBoxComponent";
import ProjectileComponent from "./server-components/ArrowComponent";
import BattleaxeProjectileComponent from "./server-components/BattleaxeProjectileComponent";
import BerryBushComponent from "./server-components/BerryBushComponent";
import BlueprintComponent from "./server-components/BlueprintComponent";
import BoulderComponent from "./server-components/BoulderComponent";
import { BracingsComponent } from "./server-components/BracingsComponent";
import BuildingMaterialComponent from "./server-components/BuildingMaterialComponent";
import CactusComponent from "./server-components/CactusComponent";
import CookingComponent from "./server-components/CookingComponent";
import CowComponent from "./server-components/CowComponent";
import CraftingStationComponent from "./server-components/CraftingStationComponent";
import DamageBoxComponent from "./server-components/DamageBoxComponent";
import DecorationComponent from "./server-components/DecorationComponent";
import DoorComponent from "./server-components/DoorComponent";
import EquipmentComponent from "./server-components/EquipmentComponent";
import EscapeAIComponent from "./server-components/EscapeAIComponent";
import FenceComponent from "./server-components/FenceComponent";
import FenceGateComponent from "./server-components/FenceGateComponent";
import FishComponent from "./server-components/FishComponent";
import FollowAIComponent from "./server-components/FollowAIComponent";
import FootprintComponent from "./server-components/FootprintComponent";
import FrozenYetiComponent from "./server-components/FrozenYetiComponent";
import GolemComponent from "./server-components/GolemComponent";
import GuardianComponent from "./server-components/GuardianComponent";
import { GuardianGemFragmentProjectileComponent } from "./server-components/GuardianGemFragmentProjectileComponent";
import { GuardianGemQuakeComponent } from "./server-components/GuardianGemQuakeComponent";
import { GuardianSpikyBallComponent } from "./server-components/GuardianSpikyBallComponent";
import HealingTotemComponent from "./server-components/HealingTotemComponent";
import HealthComponent from "./server-components/HealthComponent";
import HutComponent from "./server-components/HutComponent";
import IceArrowComponent from "./server-components/IceArrowComponent";
import IceShardComponent from "./server-components/IceShardComponent";
import IceSpikesComponent from "./server-components/IceSpikesComponent";
import InventoryComponent from "./server-components/InventoryComponent";
import InventoryUseComponent from "./server-components/InventoryUseComponent";
import ItemComponent from "./server-components/ItemComponent";
import KrumblidComponent from "./server-components/KrumblidComponent";
import LayeredRodComponent from "./server-components/LayeredRodComponent";
import PebblumComponent from "./server-components/PebblumComponent";
import PhysicsComponent from "./server-components/PhysicsComponent";
import PlantComponent from "./server-components/PlantComponent";
import PlanterBoxComponent from "./server-components/PlanterBoxComponent";
import PlayerComponent from "./server-components/PlayerComponent";
import PunjiSticksComponent from "./server-components/PunjiSticksComponent";
import ResearchBenchComponent from "./server-components/ResearchBenchComponent";
import RockSpikeComponent from "./server-components/RockSpikeComponent";
import SlimeComponent from "./server-components/SlimeComponent";
import SlimeSpitComponent from "./server-components/SlimeSpitComponent";
import SlimewispComponent from "./server-components/SlimewispComponent";
import SnowballComponent from "./server-components/SnowballComponent";
import SpearProjectileComponent from "./server-components/SpearProjectileComponent";
import SpikesComponent from "./server-components/SpikesComponent";
import SpitPoisonAreaComponent from "./server-components/SpitPoisonAreaComponent";
import StatusEffectComponent from "./server-components/StatusEffectComponent";
import StructureComponent from "./server-components/StructureComponent";
import ThrowingProjectileComponent from "./server-components/ThrowingProjectileComponent";
import TombstoneComponent from "./server-components/TombstoneComponent";
import TotemBannerComponent from "./server-components/TotemBannerComponent";
import { TransformComponent } from "./server-components/TransformComponent";
import TreeComponent from "./server-components/TreeComponent";
import TribeComponent from "./server-components/TribeComponent";
import TribeMemberComponent from "./server-components/TribeMemberComponent";
import TribesmanAIComponent from "./server-components/TribesmanAIComponent";
import TribeWarriorComponent from "./server-components/TribeWarriorComponent";
import TunnelComponent from "./server-components/TunnelComponent";
import TurretComponent from "./server-components/TurretComponent";
import YetiComponent from "./server-components/YetiComponent";
import ZombieComponent from "./server-components/ZombieComponent";

export enum ClientComponentType {
   equipment,
   footprint,
   randomSound
}

const ServerComponents = {
   [ServerComponentType.transform]: (): TransformComponent => 0 as any,
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
   [ServerComponentType.projectile]: (): ProjectileComponent => 0 as any,
   [ServerComponentType.iceArrow]: (): IceArrowComponent => 0 as any,
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
   [ServerComponentType.punjiSticks]: (): PunjiSticksComponent => 0 as any,
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
   [ServerComponentType.escapeAI]: (): EscapeAIComponent => 0 as any,
   [ServerComponentType.followAI]: (): FollowAIComponent => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponent => 0 as any,
   [ServerComponentType.layeredRod]: (): LayeredRodComponent => 0 as any,
   [ServerComponentType.decoration]: (): DecorationComponent => 0 as any,
   [ServerComponentType.spitPoisonArea]: (): SpitPoisonAreaComponent => 0 as any,
   [ServerComponentType.battleaxeProjectile]: (): BattleaxeProjectileComponent => 0 as any,
   [ServerComponentType.spearProjectile]: (): SpearProjectileComponent => 0 as any,
   [ServerComponentType.krumblid]: (): KrumblidComponent => 0 as any,
   [ServerComponentType.damageBox]: (): DamageBoxComponent => 0 as any,
   [ServerComponentType.guardian]: (): GuardianComponent => 0 as any,
   [ServerComponentType.guardianGemQuake]: (): GuardianGemQuakeComponent => 0 as any,
   [ServerComponentType.guardianGemFragmentProjectile]: (): GuardianGemFragmentProjectileComponent => 0 as any,
   [ServerComponentType.guardianSpikyBall]: (): GuardianSpikyBallComponent => 0 as any,
   [ServerComponentType.bracings]: (): BracingsComponent => 0 as any
} satisfies Record<ServerComponentType, () => object>;

export const ClientComponents = {
   [ClientComponentType.equipment]: (): EquipmentComponent => 0 as any,
   [ClientComponentType.footprint]: (): FootprintComponent => 0 as any,
   [ClientComponentType.randomSound]: (): RandomSoundComponent => 0 as any
} satisfies Record<ClientComponentType, () => object>;

export type ServerComponentClass<T extends ServerComponentType> = ReturnType<typeof ServerComponents[T]>;
export type ClientComponentClass<T extends ClientComponentType> = ReturnType<typeof ClientComponents[T]>;