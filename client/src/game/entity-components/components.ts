import { ServerComponentType } from "webgl-test-shared";
import { AIAssignmentComponent, AIAssignmentComponentArray, AIAssignmentComponentData } from "./server-components/AIAssignmentComponent";
import { AIHelperComponent, AIHelperComponentArray, AIHelperComponentData } from "./server-components/AIHelperComponent";
import { AmmoBoxComponent, AmmoBoxComponentArray, AmmoBoxComponentData } from "./server-components/AmmoBoxComponent";
import { ProjectileComponent, ProjectileComponentArray, ProjectileComponentData } from "./server-components/ProjectileComponent";
import { AttackingEntitiesComponent, AttackingEntitiesComponentArray, AttackingEntitiesComponentData } from "./server-components/AttackingEntitiesComponent";
import { BallistaComponent, BallistaComponentArray, BallistaComponentData } from "./server-components/BallistaComponent";
import { BarrelComponent, BarrelComponentArray, BarrelComponentData } from "./server-components/BarrelComponent";
import { BattleaxeProjectileComponent, BattleaxeProjectileComponentArray, BattleaxeProjectileComponentData } from "./server-components/BattleaxeProjectileComponent";
import { BerryBushComponent, BerryBushComponentArray, BerryBushComponentData } from "./server-components/BerryBushComponent";
import { BerryBushPlantedComponent, BerryBushPlantedComponentArray, BerryBushPlantedComponentData } from "./server-components/BerryBushPlantedComponent";
import { BlueprintComponent, BlueprintComponentArray, BlueprintComponentData } from "./server-components/BlueprintComponent";
import { BoulderComponent, BoulderComponentArray, BoulderComponentData } from "./server-components/BoulderComponent";
import { BracingsComponent, BracingsComponentArray, BracingsComponentData } from "./server-components/BracingsComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentArray, BuildingMaterialComponentData } from "./server-components/BuildingMaterialComponent";
import { CactusComponent, CactusComponentArray, CactusComponentData } from "./server-components/CactusComponent";
import { CampfireComponent, CampfireComponentArray, CampfireComponentData } from "./server-components/CampfireComponent";
import { CogwalkerComponent, CogwalkerComponentArray, CogwalkerComponentData } from "./server-components/CogwalkerComponent";
import { CookingComponent, CookingComponentArray, CookingComponentData } from "./server-components/CookingComponent";
import { CowComponent, CowComponentArray, CowComponentData } from "./server-components/CowComponent";
import { CraftingStationComponent, CraftingStationComponentArray, CraftingStationComponentData } from "./server-components/CraftingStationComponent";
import { DecorationComponent, DecorationComponentArray, DecorationComponentData } from "./server-components/DecorationComponent";
import { DoorComponent, DoorComponentArray, DoorComponentData } from "./server-components/DoorComponent";
import { FenceComponent, FenceComponentArray, FenceComponentData } from "./server-components/FenceComponent";
import { FenceGateComponent, FenceGateComponentArray, FenceGateComponentData } from "./server-components/FenceGateComponent";
import { FireTorchComponent, FireTorchComponentArray, FireTorchComponentData } from "./server-components/FireTorchComponent";
import { FishComponent, FishComponentArray, FishComponentData } from "./server-components/FishComponent";
import { FurnaceComponent, FurnaceComponentArray, FurnaceComponentData } from "./server-components/FurnaceComponent";
import { GlurbHeadSegmentComponent, GlurbHeadSegmentComponentArray, GlurbHeadSegmentComponentData } from "./server-components/GlurbHeadSegmentComponent";
import { GolemComponent, GolemComponentArray, GolemComponentData } from "./server-components/GolemComponent";
import { GuardianComponent, GuardianComponentArray, GuardianComponentData } from "./server-components/GuardianComponent";
import { GuardianGemFragmentProjectileComponent, GuardianGemFragmentProjectileComponentArray, GuardianGemFragmentProjectileComponentData } from "./server-components/GuardianGemFragmentProjectileComponent";
import { GuardianGemQuakeComponent, GuardianGemQuakeComponentArray, GuardianGemQuakeComponentData } from "./server-components/GuardianGemQuakeComponent";
import { GuardianSpikyBallComponent, GuardianSpikyBallComponentArray, GuardianSpikyBallComponentData } from "./server-components/GuardianSpikyBallComponent";
import { HealingTotemComponent, HealingTotemComponentArray, HealingTotemComponentData } from "./server-components/HealingTotemComponent";
import { HealthComponent, HealthComponentArray, HealthComponentData } from "./server-components/HealthComponent";
import { HutComponent, HutComponentArray, HutComponentData } from "./server-components/HutComponent";
import { IceArrowComponent, IceArrowComponentArray, IceArrowComponentData } from "./server-components/IceArrowComponent";
import { IceShardComponent, IceShardComponentArray, IceShardComponentData } from "./server-components/IceShardComponent";
import { IceSpikesComponent, IceSpikesComponentArray, IceSpikesComponentData } from "./server-components/IceSpikesComponent";
import { IceSpikesPlantedComponent, IceSpikesPlantedComponentArray, IceSpikesPlantedComponentData } from "./server-components/IceSpikesPlantedComponent";
import { InventoryComponent, InventoryComponentArray, InventoryComponentData } from "./server-components/InventoryComponent";
import { InventoryUseComponent, InventoryUseComponentArray, InventoryUseComponentData } from "./server-components/InventoryUseComponent";
import { ItemComponent, ItemComponentArray, ItemComponentData } from "./server-components/ItemComponent";
import { KrumblidComponent, KrumblidComponentArray, KrumblidComponentData } from "./server-components/KrumblidComponent";
import { LayeredRodComponent, LayeredRodComponentArray, LayeredRodComponentData } from "./server-components/LayeredRodComponent";
import { MithrilOreNodeComponent, MithrilOreNodeComponentArray, MithrilOreNodeComponentData } from "./server-components/MithrilOreNodeComponent";
import { PebblumComponent, PebblumComponentArray, PebblumComponentData } from "./server-components/PebblumComponent";
import { PlantedComponent, PlantedComponentArray, PlantedComponentData } from "./server-components/PlantedComponent";
import { PlanterBoxComponent, PlanterBoxComponentArray, PlanterBoxComponentData } from "./server-components/PlanterBoxComponent";
import { PlayerComponent, PlayerComponentArray, PlayerComponentData } from "./server-components/PlayerComponent";
import { PunjiSticksComponent, PunjiSticksComponentArray, PunjiSticksComponentData } from "./server-components/PunjiSticksComponent";
import { ResearchBenchComponent, ResearchBenchComponentArray, ResearchBenchComponentData } from "./server-components/ResearchBenchComponent";
import { ScrappyComponent, ScrappyComponentArray, ScrappyComponentData } from "./server-components/ScrappyComponent";
import { SlimeComponent, SlimeComponentArray, SlimeComponentData } from "./server-components/SlimeComponent";
import { SlimeSpitComponent, SlimeSpitComponentArray, SlimeSpitComponentData } from "./server-components/SlimeSpitComponent";
import { SlimewispComponent, SlimewispComponentArray, SlimewispComponentData } from "./server-components/SlimewispComponent";
import { SlingTurretComponent, SlingTurretComponentArray, SlingTurretComponentData } from "./server-components/SlingTurretComponent";
import { SlurbTorchComponent, SlurbTorchComponentArray, SlurbTorchComponentData } from "./server-components/SlurbTorchComponent";
import { SnowballComponent, SnowballComponentArray, SnowballComponentData } from "./server-components/SnowballComponent";
import { SpearProjectileComponent, SpearProjectileComponentArray, SpearProjectileComponentData } from "./server-components/SpearProjectileComponent";
import { SpikesComponent, SpikesComponentArray, SpikesComponentData } from "./server-components/SpikesComponent";
import { SpikyBastardComponent, SpikyBastardComponentArray, SpikyBastardComponentData } from "./server-components/SpikyBastardComponent";
import { SpitPoisonAreaComponent, SpitPoisonAreaComponentArray, SpitPoisonAreaComponentData } from "./server-components/SpitPoisonAreaComponent";
import { StatusEffectComponent, StatusEffectComponentArray, StatusEffectComponentData } from "./server-components/StatusEffectComponent";
import { StructureComponent, StructureComponentArray, StructureComponentData } from "./server-components/StructureComponent";
import { ThrowingProjectileComponent, ThrowingProjectileComponentArray, ThrowingProjectileComponentData } from "./server-components/ThrowingProjectileComponent";
import { TombstoneComponent, TombstoneComponentArray, TombstoneComponentData } from "./server-components/TombstoneComponent";
import { TotemBannerComponent, TotemBannerComponentArray, TotemBannerComponentData } from "./server-components/TotemBannerComponent";
import { TransformComponent, TransformComponentArray, TransformComponentData } from "./server-components/TransformComponent";
import { TreeComponent, TreeComponentArray, TreeComponentData } from "./server-components/TreeComponent";
import { TreePlantedComponent, TreePlantedComponentArray, TreePlantedComponentData } from "./server-components/TreePlantedComponent";
import { TreeRootBaseComponent, TreeRootBaseComponentArray, TreeRootBaseComponentData } from "./server-components/TreeRootBaseComponent";
import { TreeRootSegmentComponent, TreeRootSegmentComponentArray, TreeRootSegmentComponentData } from "./server-components/TreeRootSegmentComponent";
import { TribeComponent, TribeComponentArray, TribeComponentData } from "./server-components/TribeComponent";
import { TribesmanComponent, TribesmanComponentArray, TribesmanComponentData } from "./server-components/TribesmanComponent";
import { TribesmanAIComponent, TribesmanAIComponentArray, TribesmanAIComponentData } from "./server-components/TribesmanAIComponent";
import { TribeWarriorComponent, TribeWarriorComponentArray, TribeWarriorComponentData } from "./server-components/TribeWarriorComponent";
import { TunnelComponent, TunnelComponentArray, TunnelComponentData } from "./server-components/TunnelComponent";
import { TurretComponent, TurretComponentArray, TurretComponentData } from "./server-components/TurretComponent";
import { YetiComponent, YetiComponentArray, YetiComponentData } from "./server-components/YetiComponent";
import { ZombieComponent, ZombieComponentArray, ZombieComponentData } from "./server-components/ZombieComponent";
import { TribeMemberComponent, TribeMemberComponentArray, TribeMemberComponentData } from "./server-components/TribeMemberComponent";
import { AutomatonAssemblerComponent, AutomatonAssemblerComponentArray, AutomatonAssemblerComponentData } from "./server-components/AutomatonAssemblerComponent";
import { MithrilAnvilComponent, MithrilAnvilComponentArray, MithrilAnvilComponentData } from "./server-components/MithrilAnvilComponent";
import { RideableComponent, RideableComponentArray, RideableComponentData } from "./server-components/RideableComponent";
import { SlingTurretRockComponent, SlingTurretRockComponentArray, SlingTurretRockComponentData } from "./server-components/SlingTurretRockComponent";
import { TamingComponent, TamingComponentArray, TamingComponentData } from "./server-components/TamingComponent";
import { LootComponent, LootComponentArray, LootComponentData } from "./server-components/LootComponent";
import { GlurbSegmentComponent, GlurbSegmentComponentArray, GlurbSegmentComponentData } from "./server-components/GlurbSegmentComponent";
import { GlurbBodySegmentComponent, GlurbBodySegmentComponentArray, GlurbBodySegmentComponentData } from "./server-components/GlurbBodySegmentComponent";
import { FleshSwordComponent, FleshSwordComponentArray, FleshSwordComponentData } from "./server-components/FleshSwordComponent";
import { MossComponent, MossComponentArray, MossComponentData } from "./server-components/MossComponent";
import { ClientComponentType } from "./client-component-types";
import { BallistaFrostcicleComponentArray } from "./client-components/BallistaFrostcicleComponent";
import { BallistaRockComponentArray } from "./client-components/BallistaRockComponent";
import { BallistaSlimeballComponentArray } from "./client-components/BallistaSlimeballComponent";
import { BallistaWoodenBoltComponentArray } from "./client-components/BallistaWoodenBoltComponent";
import { EmbrasureComponentArray } from "./client-components/EmbrasureComponent";
import { EquipmentComponentArray } from "./client-components/EquipmentComponent";
import { FootprintComponentArray } from "./client-components/FootprintComponent";
import { FrostshaperComponentArray } from "./client-components/FrostshaperComponent";
import { GlurbTailSegmentComponentArray } from "./client-components/GlurbTailSegmentComponent";
import { LilypadComponentArray } from "./client-components/LilypadComponent";
import { RandomSoundComponentArray } from "./client-components/RandomSoundComponent";
import { RegularSpikesComponentArray } from "./client-components/RegularSpikesComponent";
import { StonecarvingTableComponentArray } from "./client-components/StonecarvingTableComponent";
import { ThrownBattleaxeComponentArray } from "./client-components/ThrownBattleaxeComponent";
import { WallComponentArray } from "./client-components/WallComponent";
import { WarriorHutComponentArray } from "./client-components/WarriorHutComponent";
import { WoodenArrowComponentArray } from "./client-components/WoodenArrowComponent";
import { WorkbenchComponentArray } from "./client-components/WorkbenchComponent";
import { WorkerHutComponentArray } from "./client-components/WorkerHutComponent";
import { FloorSignComponent, FloorSignComponentArray, FloorSignComponentData } from "./server-components/FloorSignComponent";
import { DesertBushLivelyComponent, DesertBushLivelyComponentArray, DesertBushLivelyComponentData } from "./server-components/DesertBushLivelyComponent";
import { DesertBushSandyComponent, DesertBushSandyComponentArray, DesertBushSandyComponentData } from "./server-components/DesertBushSandyComponent";
import { DesertSmallWeedComponent, DesertSmallWeedComponentArray, DesertSmallWeedComponentData } from "./server-components/DesertSmallWeedComponent";
import { DesertShrubComponent, DesertShrubComponentArray, DesertShrubComponentData } from "./server-components/DesertShrubComponent";
import { TumbleweedLiveComponent, TumbleweedLiveComponentArray, TumbleweedLiveComponentData } from "./server-components/TumbleweedLiveComponent";
import { TumbleweedDeadComponent, TumbleweedDeadComponentArray, TumbleweedDeadComponentData } from "./server-components/TumbleweedDeadComponent";
import { PalmTreeComponent, PalmTreeComponentArray, PalmTreeComponentData } from "./server-components/PalmTreeComponent";
import { PricklyPearComponent, PricklyPearComponentArray, PricklyPearComponentData } from "./server-components/PricklyPearComponent";
import { PricklyPearFragmentProjectileComponent, PricklyPearFragmentProjectileComponentArray, PricklyPearFragmentProjectileComponentData } from "./server-components/PricklyPearFragmentProjectileComponent";
import { EnergyStomachComponent, EnergyStomachComponentArray, EnergyStomachComponentData } from "./server-components/EnergyStomachComponent";
import { EnergyStoreComponent, EnergyStoreComponentArray, EnergyStoreComponentData } from "./server-components/EnergyStoreComponent";
import { DustfleaComponent, DustfleaComponentArray, DustfleaComponentData } from "./server-components/DustfleaComponent";
import { SandstoneRockComponent, SandstoneRockComponentArray, SandstoneRockComponentData } from "./server-components/SandstoneRockComponent";
import { OkrenComponent, OkrenComponentArray, OkrenComponentData } from "./server-components/OkrenComponent";
import { DustfleaMorphCocoonComponent, DustfleaMorphCocoonComponentArray, DustfleaMorphCocoonComponentData } from "./server-components/DustfleaMorphCocoonComponent";
import { SandBallComponent, SandBallComponentArray, SandBallComponentData } from "./server-components/SandBallComponent";
import { KrumblidMorphCocoonComponent, KrumblidMorphCocoonComponentArray, KrumblidMorphCocoonComponentData } from "./server-components/KrumblidMorphCocoonComponent";
import { OkrenTongueComponent, OkrenTongueComponentArray, OkrenTongueComponentData } from "./server-components/OkrenTongueComponent";
import { AIPathfindingComponent, AIPathfindingComponentArray, AIPathfindingComponentData } from "./server-components/AIPathfindingComponent";
import { DustfleaEggComponent, DustfleaEggComponentArray, DustfleaEggComponentData } from "./server-components/DustfleaEggComponent";
import { OkrenClawComponent, OkrenClawComponentArray, OkrenClawComponentData } from "./server-components/OkrenClawComponent";
import { SpruceTreeComponent, SpruceTreeComponentArray, SpruceTreeComponentData } from "./server-components/SpruceTreeComponent";
import { TundraRockComponent, TundraRockComponentArray, TundraRockComponentData } from "./server-components/TundraRockComponent";
import { SnowberryBushComponent, SnowberryBushComponentArray, SnowberryBushComponentData } from "./server-components/SnowberryBushComponent";
import { SnobeComponent, SnobeComponentArray, SnobeComponentData } from "./server-components/SnobeComponent";
import { SnobeMoundComponent, SnobeMoundComponentArray, SnobeMoundComponentData } from "./server-components/SnobeMoundComponent";
import { TundraRockFrozenComponent, TundraRockFrozenComponentArray, TundraRockFrozenComponentData } from "./server-components/TundraRockFrozenComponent";
import { InguSerpentComponent, InguSerpentComponentArray, InguSerpentComponentData } from "./server-components/InguSerpentComponent";
import { TukmokComponent, TukmokComponentArray, TukmokComponentData } from "./server-components/TukmokComponent";
import { TukmokTrunkComponent, TukmokTrunkComponentArray, TukmokTrunkComponentData } from "./server-components/TukmokTrunkComponent";
import { TukmokTailClubComponent, TukmokTailClubComponentArray, TukmokTailClubComponentData } from "./server-components/TukmokTailClubComponent";
import { TukmokSpurComponent, TukmokSpurComponentArray, TukmokSpurComponentData } from "./server-components/TukmokSpurComponent";
import { InguYetuksnoglurblidokowfleaComponent, InguYetuksnoglurblidokowfleaComponentArray, InguYetuksnoglurblidokowfleaComponentData } from "./server-components/InguYetuksnoglurblidokowfleaComponent";
import { InguYetuksnoglurblidokowfleaSeekerHeadComponent, InguYetuksnoglurblidokowfleaSeekerHeadComponentArray, InguYetuksnoglurblidokowfleaSeekerHeadComponentData } from "./server-components/InguYetuksnoglurblidokowfleaSeekerHeadComponent";
import { InguYetukLaserComponent, InguYetukLaserComponentArray, InguYetukLaserComponentData } from "./server-components/InguYetukLaserComponent";
import { RiverSteppingStoneComponent, RiverSteppingStoneComponentArray, RiverSteppingStoneComponentData } from "./server-components/RiverSteppingStoneComponent";
import { HeldItemComponent, HeldItemComponentArray, HeldItemComponentData } from "./server-components/HeldItemComponent";

// @cleanup: same as below
const ClientComponentArrayRecord: Record<ClientComponentType, object> = {
   [ClientComponentType.equipment]: EquipmentComponentArray,
   [ClientComponentType.footprint]: FootprintComponentArray,
   [ClientComponentType.randomSound]: RandomSoundComponentArray,
   [ClientComponentType.embrasure]: EmbrasureComponentArray,
   [ClientComponentType.frostshaper]: FrostshaperComponentArray,
   [ClientComponentType.lilypad]: LilypadComponentArray,
   [ClientComponentType.regularSpikes]: RegularSpikesComponentArray,
   [ClientComponentType.stonecarvingTable]: StonecarvingTableComponentArray,
   [ClientComponentType.wall]: WallComponentArray,
   [ClientComponentType.warriorHut]: WarriorHutComponentArray,
   [ClientComponentType.workbench]: WorkbenchComponentArray,
   [ClientComponentType.workerHut]: WorkerHutComponentArray,
   [ClientComponentType.ballistaFrostcicle]: BallistaFrostcicleComponentArray,
   [ClientComponentType.ballistaRock]: BallistaRockComponentArray,
   [ClientComponentType.ballistaSlimeball]: BallistaSlimeballComponentArray,
   [ClientComponentType.ballistaWoodenBolt]: BallistaWoodenBoltComponentArray,
   [ClientComponentType.thrownBattleaxe]: ThrownBattleaxeComponentArray,
   [ClientComponentType.woodenArrow]: WoodenArrowComponentArray,
   [ClientComponentType.glurbTailSegment]: GlurbTailSegmentComponentArray,
}

// @Cleanup: make this use ServerComponentArray instead 
// Just used to make sure all the components are properly imported (so they aren't removed by webpack)
const ServerComponentArrayRecord: Record<ServerComponentType, object> = {
   [ServerComponentType.transform]: TransformComponentArray,
   [ServerComponentType.cow]: CowComponentArray,
   [ServerComponentType.turret]: TurretComponentArray,
   [ServerComponentType.tribe]: TribeComponentArray,
   [ServerComponentType.inventory]: InventoryComponentArray,
   [ServerComponentType.ammoBox]: AmmoBoxComponentArray,
   [ServerComponentType.slime]: SlimeComponentArray,
   [ServerComponentType.golem]: GolemComponentArray,
   [ServerComponentType.statusEffect]: StatusEffectComponentArray,
   [ServerComponentType.cactus]: CactusComponentArray,
   [ServerComponentType.health]: HealthComponentArray,
   [ServerComponentType.researchBench]: ResearchBenchComponentArray,
   [ServerComponentType.berryBush]: BerryBushComponentArray,
   [ServerComponentType.inventoryUse]: InventoryUseComponentArray,
   [ServerComponentType.zombie]: ZombieComponentArray,
   [ServerComponentType.player]: PlayerComponentArray,
   [ServerComponentType.item]: ItemComponentArray,
   [ServerComponentType.fleshSwordItem]: FleshSwordComponentArray,
   [ServerComponentType.tombstone]: TombstoneComponentArray,
   [ServerComponentType.tree]: TreeComponentArray,
   [ServerComponentType.blueprint]: BlueprintComponentArray,
   [ServerComponentType.projectile]: ProjectileComponentArray,
   [ServerComponentType.iceArrow]: IceArrowComponentArray,
   [ServerComponentType.yeti]: YetiComponentArray,
   [ServerComponentType.totemBanner]: TotemBannerComponentArray,
   [ServerComponentType.cooking]: CookingComponentArray,
   [ServerComponentType.hut]: HutComponentArray,
   [ServerComponentType.snowball]: SnowballComponentArray,
   [ServerComponentType.fish]: FishComponentArray,
   [ServerComponentType.slimeSpit]: SlimeSpitComponentArray,
   [ServerComponentType.door]: DoorComponentArray,
   [ServerComponentType.tribesman]: TribesmanComponentArray,
   [ServerComponentType.tribesmanAI]: TribesmanAIComponentArray,
   [ServerComponentType.tunnel]: TunnelComponentArray,
   [ServerComponentType.buildingMaterial]: BuildingMaterialComponentArray,
   [ServerComponentType.spikes]: SpikesComponentArray,
   [ServerComponentType.punjiSticks]: PunjiSticksComponentArray,
   [ServerComponentType.tribeMember]: TribeMemberComponentArray,
   [ServerComponentType.healingTotem]: HealingTotemComponentArray,
   [ServerComponentType.planterBox]: PlanterBoxComponentArray,
   [ServerComponentType.planted]: PlantedComponentArray,
   [ServerComponentType.treePlanted]: TreePlantedComponentArray,
   [ServerComponentType.berryBushPlanted]: BerryBushPlantedComponentArray,
   [ServerComponentType.iceSpikesPlanted]: IceSpikesPlantedComponentArray,
   [ServerComponentType.structure]: StructureComponentArray,
   [ServerComponentType.fence]: FenceComponentArray,
   [ServerComponentType.fenceGate]: FenceGateComponentArray,
   [ServerComponentType.craftingStation]: CraftingStationComponentArray,
   [ServerComponentType.aiHelper]: AIHelperComponentArray,
   [ServerComponentType.boulder]: BoulderComponentArray,
   [ServerComponentType.iceShard]: IceShardComponentArray,
   [ServerComponentType.iceSpikes]: IceSpikesComponentArray,
   [ServerComponentType.pebblum]: PebblumComponentArray,
   [ServerComponentType.slimewisp]: SlimewispComponentArray,
   [ServerComponentType.throwingProjectile]: ThrowingProjectileComponentArray,
   [ServerComponentType.tribeWarrior]: TribeWarriorComponentArray,
   [ServerComponentType.layeredRod]: LayeredRodComponentArray,
   [ServerComponentType.decoration]: DecorationComponentArray,
   [ServerComponentType.riverSteppingStone]: RiverSteppingStoneComponentArray,
   [ServerComponentType.spitPoisonArea]: SpitPoisonAreaComponentArray,
   [ServerComponentType.battleaxeProjectile]: BattleaxeProjectileComponentArray,
   [ServerComponentType.spearProjectile]: SpearProjectileComponentArray,
   [ServerComponentType.krumblid]: KrumblidComponentArray,
   [ServerComponentType.guardian]: GuardianComponentArray,
   [ServerComponentType.guardianGemQuake]: GuardianGemQuakeComponentArray,
   [ServerComponentType.guardianGemFragmentProjectile]: GuardianGemFragmentProjectileComponentArray,
   [ServerComponentType.guardianSpikyBall]: GuardianSpikyBallComponentArray,
   [ServerComponentType.bracings]: BracingsComponentArray,
   [ServerComponentType.ballista]: BallistaComponentArray,
   [ServerComponentType.slingTurret]: SlingTurretComponentArray,
   [ServerComponentType.barrel]: BarrelComponentArray,
   [ServerComponentType.campfire]: CampfireComponentArray,
   [ServerComponentType.furnace]: FurnaceComponentArray,
   [ServerComponentType.fireTorch]: FireTorchComponentArray,
   [ServerComponentType.spikyBastard]: SpikyBastardComponentArray,
   [ServerComponentType.glurbBodySegment]: GlurbBodySegmentComponentArray,
   [ServerComponentType.glurbHeadSegment]: GlurbHeadSegmentComponentArray,
   [ServerComponentType.glurbSegment]: GlurbSegmentComponentArray,
   [ServerComponentType.slurbTorch]: SlurbTorchComponentArray,
   [ServerComponentType.attackingEntities]: AttackingEntitiesComponentArray,
   [ServerComponentType.aiAssignment]: AIAssignmentComponentArray,
   [ServerComponentType.treeRootBase]: TreeRootBaseComponentArray,
   [ServerComponentType.treeRootSegment]: TreeRootSegmentComponentArray,
   [ServerComponentType.mithrilOreNode]: MithrilOreNodeComponentArray,
   [ServerComponentType.scrappy]: ScrappyComponentArray,
   [ServerComponentType.cogwalker]: CogwalkerComponentArray,
   [ServerComponentType.automatonAssembler]: AutomatonAssemblerComponentArray,
   [ServerComponentType.mithrilAnvil]: MithrilAnvilComponentArray,
   [ServerComponentType.rideable]: RideableComponentArray,
   [ServerComponentType.heldItem]: HeldItemComponentArray,
   [ServerComponentType.slingTurretRock]: SlingTurretRockComponentArray,
   [ServerComponentType.taming]: TamingComponentArray,
   [ServerComponentType.loot]: LootComponentArray,
   [ServerComponentType.moss]: MossComponentArray,
   [ServerComponentType.floorSign]: FloorSignComponentArray,
   [ServerComponentType.desertBushLively]: DesertBushLivelyComponentArray,
   [ServerComponentType.desertBushSandy]: DesertBushSandyComponentArray,
   [ServerComponentType.desertSmallWeed]: DesertSmallWeedComponentArray,
   [ServerComponentType.desertShrub]: DesertShrubComponentArray,
   [ServerComponentType.tumbleweedLive]: TumbleweedLiveComponentArray,
   [ServerComponentType.tumbleweedDead]: TumbleweedDeadComponentArray,
   [ServerComponentType.palmTree]: PalmTreeComponentArray,
   [ServerComponentType.pricklyPear]: PricklyPearComponentArray,
   [ServerComponentType.pricklyPearFragmentProjectile]: PricklyPearFragmentProjectileComponentArray,
   [ServerComponentType.energyStore]: EnergyStoreComponentArray,
   [ServerComponentType.energyStomach]: EnergyStomachComponentArray,
   [ServerComponentType.dustflea]: DustfleaComponentArray,
   [ServerComponentType.sandstoneRock]: SandstoneRockComponentArray,
   [ServerComponentType.okren]: OkrenComponentArray,
   [ServerComponentType.okrenClaw]: OkrenClawComponentArray,
   [ServerComponentType.dustfleaMorphCocoon]: DustfleaMorphCocoonComponentArray,
   [ServerComponentType.sandBall]: SandBallComponentArray,
   [ServerComponentType.krumblidMorphCocoon]: KrumblidMorphCocoonComponentArray,
   [ServerComponentType.okrenTongue]: OkrenTongueComponentArray,
   [ServerComponentType.aiPathfinding]: AIPathfindingComponentArray,
   [ServerComponentType.dustfleaEgg]: DustfleaEggComponentArray,
   [ServerComponentType.spruceTree]: SpruceTreeComponentArray,
   [ServerComponentType.tundraRock]: TundraRockComponentArray,
   [ServerComponentType.tundraRockFrozen]: TundraRockFrozenComponentArray,
   [ServerComponentType.snowberryBush]: SnowberryBushComponentArray,
   [ServerComponentType.snobe]: SnobeComponentArray,
   [ServerComponentType.snobeMound]: SnobeMoundComponentArray,
   [ServerComponentType.inguSerpent]: InguSerpentComponentArray,
   [ServerComponentType.tukmok]: TukmokComponentArray,
   [ServerComponentType.tukmokTrunk]: TukmokTrunkComponentArray,
   [ServerComponentType.tukmokTailClub]: TukmokTailClubComponentArray,
   [ServerComponentType.tukmokSpur]: TukmokSpurComponentArray,
   [ServerComponentType.inguYetuksnoglurblidokowflea]: InguYetuksnoglurblidokowfleaComponentArray,
   [ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead]: InguYetuksnoglurblidokowfleaSeekerHeadComponentArray,
   [ServerComponentType.inguYetukLaser]: InguYetukLaserComponentArray,
};

const ServerComponentRecord = {
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
   [ServerComponentType.researchBench]: (): ResearchBenchComponent => 0 as any,
   [ServerComponentType.berryBush]: (): BerryBushComponent => 0 as any,
   [ServerComponentType.inventoryUse]: (): InventoryUseComponent => 0 as any,
   [ServerComponentType.zombie]: (): ZombieComponent => 0 as any,
   [ServerComponentType.player]: (): PlayerComponent => 0 as any,
   [ServerComponentType.item]: (): ItemComponent => 0 as any,
   [ServerComponentType.fleshSwordItem]: (): FleshSwordComponent => 0 as any,
   [ServerComponentType.tombstone]: (): TombstoneComponent => 0 as any,
   [ServerComponentType.tree]: (): TreeComponent => 0 as any,
   [ServerComponentType.blueprint]: (): BlueprintComponent => 0 as any,
   [ServerComponentType.projectile]: (): ProjectileComponent => 0 as any,
   [ServerComponentType.iceArrow]: (): IceArrowComponent => 0 as any,
   [ServerComponentType.yeti]: (): YetiComponent => 0 as any,
   [ServerComponentType.totemBanner]: (): TotemBannerComponent => 0 as any,
   [ServerComponentType.cooking]: (): CookingComponent => 0 as any,
   [ServerComponentType.hut]: (): HutComponent => 0 as any,
   [ServerComponentType.snowball]: (): SnowballComponent => 0 as any,
   [ServerComponentType.fish]: (): FishComponent => 0 as any,
   [ServerComponentType.slimeSpit]: (): SlimeSpitComponent => 0 as any,
   [ServerComponentType.door]: (): DoorComponent => 0 as any,
   [ServerComponentType.tribesman]: (): TribesmanComponent => 0 as any,
   [ServerComponentType.tribesmanAI]: (): TribesmanAIComponent => 0 as any,
   [ServerComponentType.tunnel]: (): TunnelComponent => 0 as any,
   [ServerComponentType.buildingMaterial]: (): BuildingMaterialComponent => 0 as any,
   [ServerComponentType.spikes]: (): SpikesComponent => 0 as any,
   [ServerComponentType.punjiSticks]: (): PunjiSticksComponent => 0 as any,
   [ServerComponentType.tribeMember]: (): TribeMemberComponent => 0 as any,
   [ServerComponentType.healingTotem]: (): HealingTotemComponent => 0 as any,
   [ServerComponentType.planterBox]: (): PlanterBoxComponent => 0 as any,
   [ServerComponentType.planted]: (): PlantedComponent => 0 as any,
   [ServerComponentType.treePlanted]: (): TreePlantedComponent => 0 as any,
   [ServerComponentType.berryBushPlanted]: (): BerryBushPlantedComponent => 0 as any,
   [ServerComponentType.iceSpikesPlanted]: (): IceSpikesPlantedComponent => 0 as any,
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
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponent => 0 as any,
   [ServerComponentType.layeredRod]: (): LayeredRodComponent => 0 as any,
   [ServerComponentType.decoration]: (): DecorationComponent => 0 as any,
   [ServerComponentType.riverSteppingStone]: (): RiverSteppingStoneComponent => 0 as any,
   [ServerComponentType.spitPoisonArea]: (): SpitPoisonAreaComponent => 0 as any,
   [ServerComponentType.battleaxeProjectile]: (): BattleaxeProjectileComponent => 0 as any,
   [ServerComponentType.spearProjectile]: (): SpearProjectileComponent => 0 as any,
   [ServerComponentType.krumblid]: (): KrumblidComponent => 0 as any,
   [ServerComponentType.guardian]: (): GuardianComponent => 0 as any,
   [ServerComponentType.guardianGemQuake]: (): GuardianGemQuakeComponent => 0 as any,
   [ServerComponentType.guardianGemFragmentProjectile]: (): GuardianGemFragmentProjectileComponent => 0 as any,
   [ServerComponentType.guardianSpikyBall]: (): GuardianSpikyBallComponent => 0 as any,
   [ServerComponentType.bracings]: (): BracingsComponent => 0 as any,
   [ServerComponentType.ballista]: (): BallistaComponent => 0 as any,
   [ServerComponentType.slingTurret]: (): SlingTurretComponent => 0 as any,
   [ServerComponentType.barrel]: (): BarrelComponent => 0 as any,
   [ServerComponentType.campfire]: (): CampfireComponent => 0 as any,
   [ServerComponentType.furnace]: (): FurnaceComponent => 0 as any,
   [ServerComponentType.fireTorch]: (): FireTorchComponent => 0 as any,
   [ServerComponentType.spikyBastard]: (): SpikyBastardComponent => 0 as any,
   [ServerComponentType.glurbHeadSegment]: (): GlurbHeadSegmentComponent => 0 as any,
   [ServerComponentType.glurbBodySegment]: (): GlurbBodySegmentComponent => 0 as any,
   [ServerComponentType.glurbSegment]: (): GlurbSegmentComponent => 0 as any,
   [ServerComponentType.slurbTorch]: (): SlurbTorchComponent => 0 as any,
   [ServerComponentType.attackingEntities]: (): AttackingEntitiesComponent => 0 as any,
   [ServerComponentType.aiAssignment]: (): AIAssignmentComponent => 0 as any,
   [ServerComponentType.treeRootBase]: (): TreeRootBaseComponent => 0 as any,
   [ServerComponentType.treeRootSegment]: (): TreeRootSegmentComponent => 0 as any,
   [ServerComponentType.mithrilOreNode]: (): MithrilOreNodeComponent => 0 as any,
   [ServerComponentType.scrappy]: (): ScrappyComponent => 0 as any,
   [ServerComponentType.cogwalker]: (): CogwalkerComponent => 0 as any,
   [ServerComponentType.automatonAssembler]: (): AutomatonAssemblerComponent => 0 as any,
   [ServerComponentType.mithrilAnvil]: (): MithrilAnvilComponent => 0 as any,
   [ServerComponentType.rideable]: (): RideableComponent => 0 as any,
   [ServerComponentType.heldItem]: (): HeldItemComponent => 0 as any,
   [ServerComponentType.slingTurretRock]: (): SlingTurretRockComponent => 0 as any,
   [ServerComponentType.taming]: (): TamingComponent => 0 as any,
   [ServerComponentType.loot]: (): LootComponent => 0 as any,
   [ServerComponentType.moss]: (): MossComponent => 0 as any,
   [ServerComponentType.floorSign]: (): FloorSignComponent => 0 as any,
   [ServerComponentType.desertBushLively]: (): DesertBushLivelyComponent => 0 as any,
   [ServerComponentType.desertBushSandy]: (): DesertBushSandyComponent => 0 as any,
   [ServerComponentType.desertSmallWeed]: (): DesertSmallWeedComponent => 0 as any,
   [ServerComponentType.desertShrub]: (): DesertShrubComponent => 0 as any,
   [ServerComponentType.tumbleweedLive]: (): TumbleweedLiveComponent => 0 as any,
   [ServerComponentType.tumbleweedDead]: (): TumbleweedDeadComponent => 0 as any,
   [ServerComponentType.palmTree]: (): PalmTreeComponent => 0 as any,
   [ServerComponentType.pricklyPear]: (): PricklyPearComponent => 0 as any,
   [ServerComponentType.pricklyPearFragmentProjectile]: (): PricklyPearFragmentProjectileComponent => 0 as any,
   [ServerComponentType.energyStore]: (): EnergyStoreComponent => 0 as any,
   [ServerComponentType.energyStomach]: (): EnergyStomachComponent => 0 as any,
   [ServerComponentType.dustflea]: (): DustfleaComponent => 0 as any,
   [ServerComponentType.sandstoneRock]: (): SandstoneRockComponent => 0 as any,
   [ServerComponentType.okren]: (): OkrenComponent => 0 as any,
   [ServerComponentType.okrenClaw]: (): OkrenClawComponent => 0 as any,
   [ServerComponentType.dustfleaMorphCocoon]: (): DustfleaMorphCocoonComponent => 0 as any,
   [ServerComponentType.sandBall]: (): SandBallComponent => 0 as any,
   [ServerComponentType.krumblidMorphCocoon]: (): KrumblidMorphCocoonComponent => 0 as any,
   [ServerComponentType.okrenTongue]: (): OkrenTongueComponent => 0 as any,
   [ServerComponentType.aiPathfinding]: (): AIPathfindingComponent => 0 as any,
   [ServerComponentType.dustfleaEgg]: (): DustfleaEggComponent => 0 as any,
   [ServerComponentType.spruceTree]: (): SpruceTreeComponent => 0 as any,
   [ServerComponentType.tundraRock]: (): TundraRockComponent => 0 as any,
   [ServerComponentType.tundraRockFrozen]: (): TundraRockFrozenComponent => 0 as any,
   [ServerComponentType.snowberryBush]: (): SnowberryBushComponent => 0 as any,
   [ServerComponentType.snobe]: (): SnobeComponent => 0 as any,
   [ServerComponentType.snobeMound]: (): SnobeMoundComponent => 0 as any,
   [ServerComponentType.inguSerpent]: (): InguSerpentComponent => 0 as any,
   [ServerComponentType.tukmok]: (): TukmokComponent => 0 as any,
   [ServerComponentType.tukmokTrunk]: (): TukmokTrunkComponent => 0 as any,
   [ServerComponentType.tukmokTailClub]: (): TukmokTailClubComponent => 0 as any,
   [ServerComponentType.tukmokSpur]: (): TukmokSpurComponent => 0 as any,
   [ServerComponentType.inguYetuksnoglurblidokowflea]: (): InguYetuksnoglurblidokowfleaComponent => 0 as any,
   [ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead]: (): InguYetuksnoglurblidokowfleaSeekerHeadComponent => 0 as any,
   [ServerComponentType.inguYetukLaser]: (): InguYetukLaserComponent => 0 as any,
} satisfies Record<ServerComponentType, () => unknown>;

export type ServerComponent<T extends ServerComponentType> = ReturnType<typeof ServerComponentRecord[T]>;

const ServerComponentDataRecord = {
   [ServerComponentType.transform]: (): TransformComponentData => 0 as any,
   [ServerComponentType.cow]: (): CowComponentData => 0 as any,
   [ServerComponentType.turret]: (): TurretComponentData => 0 as any,
   [ServerComponentType.tribe]: (): TribeComponentData => 0 as any,
   [ServerComponentType.inventory]: (): InventoryComponentData => 0 as any,
   [ServerComponentType.ammoBox]: (): AmmoBoxComponentData => 0 as any,
   [ServerComponentType.slime]: (): SlimeComponentData => 0 as any,
   [ServerComponentType.golem]: (): GolemComponentData => 0 as any,
   [ServerComponentType.statusEffect]: (): StatusEffectComponentData => 0 as any,
   [ServerComponentType.cactus]: (): CactusComponentData => 0 as any,
   [ServerComponentType.health]: (): HealthComponentData => 0 as any,
   [ServerComponentType.researchBench]: (): ResearchBenchComponentData => 0 as any,
   [ServerComponentType.berryBush]: (): BerryBushComponentData => 0 as any,
   [ServerComponentType.inventoryUse]: (): InventoryUseComponentData => 0 as any,
   [ServerComponentType.zombie]: (): ZombieComponentData => 0 as any,
   [ServerComponentType.player]: (): PlayerComponentData => 0 as any,
   [ServerComponentType.item]: (): ItemComponentData => 0 as any,
   [ServerComponentType.fleshSwordItem]: (): FleshSwordComponentData => 0 as any,
   [ServerComponentType.tombstone]: (): TombstoneComponentData => 0 as any,
   [ServerComponentType.tree]: (): TreeComponentData => 0 as any,
   [ServerComponentType.blueprint]: (): BlueprintComponentData => 0 as any,
   [ServerComponentType.projectile]: (): ProjectileComponentData => 0 as any,
   [ServerComponentType.iceArrow]: (): IceArrowComponentData => 0 as any,
   [ServerComponentType.yeti]: (): YetiComponentData => 0 as any,
   [ServerComponentType.totemBanner]: (): TotemBannerComponentData => 0 as any,
   [ServerComponentType.cooking]: (): CookingComponentData => 0 as any,
   [ServerComponentType.hut]: (): HutComponentData => 0 as any,
   [ServerComponentType.snowball]: (): SnowballComponentData => 0 as any,
   [ServerComponentType.fish]: (): FishComponentData => 0 as any,
   [ServerComponentType.slimeSpit]: (): SlimeSpitComponentData => 0 as any,
   [ServerComponentType.door]: (): DoorComponentData => 0 as any,
   [ServerComponentType.tribesman]: (): TribesmanComponentData => 0 as any,
   [ServerComponentType.tribesmanAI]: (): TribesmanAIComponentData => 0 as any,
   [ServerComponentType.tunnel]: (): TunnelComponentData => 0 as any,
   [ServerComponentType.buildingMaterial]: (): BuildingMaterialComponentData => 0 as any,
   [ServerComponentType.spikes]: (): SpikesComponentData => 0 as any,
   [ServerComponentType.punjiSticks]: (): PunjiSticksComponentData => 0 as any,
   [ServerComponentType.tribeMember]: (): TribeMemberComponentData => 0 as any,
   [ServerComponentType.healingTotem]: (): HealingTotemComponentData => 0 as any,
   [ServerComponentType.planterBox]: (): PlanterBoxComponentData => 0 as any,
   [ServerComponentType.planted]: (): PlantedComponentData => 0 as any,
   [ServerComponentType.treePlanted]: (): TreePlantedComponentData => 0 as any,
   [ServerComponentType.berryBushPlanted]: (): BerryBushPlantedComponentData => 0 as any,
   [ServerComponentType.iceSpikesPlanted]: (): IceSpikesPlantedComponentData => 0 as any,
   [ServerComponentType.structure]: (): StructureComponentData => 0 as any,
   [ServerComponentType.fence]: (): FenceComponentData => 0 as any,
   [ServerComponentType.fenceGate]: (): FenceGateComponentData => 0 as any,
   [ServerComponentType.craftingStation]: (): CraftingStationComponentData => 0 as any,
   [ServerComponentType.aiHelper]: (): AIHelperComponentData => 0 as any,
   [ServerComponentType.boulder]: (): BoulderComponentData => 0 as any,
   [ServerComponentType.iceShard]: (): IceShardComponentData => 0 as any,
   [ServerComponentType.iceSpikes]: (): IceSpikesComponentData => 0 as any,
   [ServerComponentType.pebblum]: (): PebblumComponentData => 0 as any,
   [ServerComponentType.slimewisp]: (): SlimewispComponentData => 0 as any,
   [ServerComponentType.throwingProjectile]: (): ThrowingProjectileComponentData => 0 as any,
   [ServerComponentType.tribeWarrior]: (): TribeWarriorComponentData => 0 as any,
   [ServerComponentType.layeredRod]: (): LayeredRodComponentData => 0 as any,
   [ServerComponentType.decoration]: (): DecorationComponentData => 0 as any,
   [ServerComponentType.riverSteppingStone]: (): RiverSteppingStoneComponentData => 0 as any,
   [ServerComponentType.spitPoisonArea]: (): SpitPoisonAreaComponentData => 0 as any,
   [ServerComponentType.battleaxeProjectile]: (): BattleaxeProjectileComponentData => 0 as any,
   [ServerComponentType.spearProjectile]: (): SpearProjectileComponentData => 0 as any,
   [ServerComponentType.krumblid]: (): KrumblidComponentData => 0 as any,
   [ServerComponentType.guardian]: (): GuardianComponentData => 0 as any,
   [ServerComponentType.guardianGemQuake]: (): GuardianGemQuakeComponentData => 0 as any,
   [ServerComponentType.guardianGemFragmentProjectile]: (): GuardianGemFragmentProjectileComponentData => 0 as any,
   [ServerComponentType.guardianSpikyBall]: (): GuardianSpikyBallComponentData => 0 as any,
   [ServerComponentType.bracings]: (): BracingsComponentData => 0 as any,
   [ServerComponentType.ballista]: (): BallistaComponentData => 0 as any,
   [ServerComponentType.slingTurret]: (): SlingTurretComponentData => 0 as any,
   [ServerComponentType.barrel]: (): BarrelComponentData => 0 as any,
   [ServerComponentType.campfire]: (): CampfireComponentData => 0 as any,
   [ServerComponentType.furnace]: (): FurnaceComponentData => 0 as any,
   [ServerComponentType.fireTorch]: (): FireTorchComponentData => 0 as any,
   [ServerComponentType.spikyBastard]: (): SpikyBastardComponentData => 0 as any,
   [ServerComponentType.glurbHeadSegment]: (): GlurbHeadSegmentComponentData => 0 as any,
   [ServerComponentType.glurbBodySegment]: (): GlurbBodySegmentComponentData => 0 as any,
   [ServerComponentType.glurbSegment]: (): GlurbSegmentComponentData => 0 as any,
   [ServerComponentType.slurbTorch]: (): SlurbTorchComponentData => 0 as any,
   [ServerComponentType.attackingEntities]: (): AttackingEntitiesComponentData => 0 as any,
   [ServerComponentType.aiAssignment]: (): AIAssignmentComponentData => 0 as any,
   [ServerComponentType.treeRootBase]: (): TreeRootBaseComponentData => 0 as any,
   [ServerComponentType.treeRootSegment]: (): TreeRootSegmentComponentData => 0 as any,
   [ServerComponentType.mithrilOreNode]: (): MithrilOreNodeComponentData => 0 as any,
   [ServerComponentType.scrappy]: (): ScrappyComponentData => 0 as any,
   [ServerComponentType.cogwalker]: (): CogwalkerComponentData => 0 as any,
   [ServerComponentType.automatonAssembler]: (): AutomatonAssemblerComponentData => 0 as any,
   [ServerComponentType.mithrilAnvil]: (): MithrilAnvilComponentData => 0 as any,
   [ServerComponentType.rideable]: (): RideableComponentData => 0 as any,
   [ServerComponentType.heldItem]: (): HeldItemComponentData => 0 as any,
   [ServerComponentType.slingTurretRock]: (): SlingTurretRockComponentData => 0 as any,
   [ServerComponentType.taming]: (): TamingComponentData => 0 as any,
   [ServerComponentType.loot]: (): LootComponentData => 0 as any,
   [ServerComponentType.moss]: (): MossComponentData => 0 as any,
   [ServerComponentType.floorSign]: (): FloorSignComponentData => 0 as any,
   [ServerComponentType.desertBushLively]: (): DesertBushLivelyComponentData => 0 as any,
   [ServerComponentType.desertBushSandy]: (): DesertBushSandyComponentData => 0 as any,
   [ServerComponentType.desertSmallWeed]: (): DesertSmallWeedComponentData => 0 as any,
   [ServerComponentType.desertShrub]: (): DesertShrubComponentData => 0 as any,
   [ServerComponentType.tumbleweedLive]: (): TumbleweedLiveComponentData => 0 as any,
   [ServerComponentType.tumbleweedDead]: (): TumbleweedDeadComponentData => 0 as any,
   [ServerComponentType.palmTree]: (): PalmTreeComponentData => 0 as any,
   [ServerComponentType.pricklyPear]: (): PricklyPearComponentData => 0 as any,
   [ServerComponentType.pricklyPearFragmentProjectile]: (): PricklyPearFragmentProjectileComponentData => 0 as any,
   [ServerComponentType.energyStore]: (): EnergyStoreComponentData => 0 as any,
   [ServerComponentType.energyStomach]: (): EnergyStomachComponentData => 0 as any,
   [ServerComponentType.dustflea]: (): DustfleaComponentData => 0 as any,
   [ServerComponentType.sandstoneRock]: (): SandstoneRockComponentData => 0 as any,
   [ServerComponentType.okren]: (): OkrenComponentData => 0 as any,
   [ServerComponentType.okrenClaw]: (): OkrenClawComponentData => 0 as any,
   [ServerComponentType.dustfleaMorphCocoon]: (): DustfleaMorphCocoonComponentData => 0 as any,
   [ServerComponentType.sandBall]: (): SandBallComponentData => 0 as any,
   [ServerComponentType.krumblidMorphCocoon]: (): KrumblidMorphCocoonComponentData => 0 as any,
   [ServerComponentType.okrenTongue]: (): OkrenTongueComponentData => 0 as any,
   [ServerComponentType.aiPathfinding]: (): AIPathfindingComponentData => 0 as any,
   [ServerComponentType.dustfleaEgg]: (): DustfleaEggComponentData => 0 as any,
   [ServerComponentType.spruceTree]: (): SpruceTreeComponentData => 0 as any,
   [ServerComponentType.tundraRock]: (): TundraRockComponentData => 0 as any,
   [ServerComponentType.tundraRockFrozen]: (): TundraRockFrozenComponentData => 0 as any,
   [ServerComponentType.snowberryBush]: (): SnowberryBushComponentData => 0 as any,
   [ServerComponentType.snobe]: (): SnobeComponentData => 0 as any,
   [ServerComponentType.snobeMound]: (): SnobeMoundComponentData => 0 as any,
   [ServerComponentType.inguSerpent]: (): InguSerpentComponentData => 0 as any,
   [ServerComponentType.tukmok]: (): TukmokComponentData => 0 as any,
   [ServerComponentType.tukmokTrunk]: (): TukmokTrunkComponentData => 0 as any,
   [ServerComponentType.tukmokTailClub]: (): TukmokTailClubComponentData => 0 as any,
   [ServerComponentType.tukmokSpur]: (): TukmokSpurComponentData => 0 as any,
   [ServerComponentType.inguYetuksnoglurblidokowflea]: (): InguYetuksnoglurblidokowfleaComponentData => 0 as any,
   [ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead]: (): InguYetuksnoglurblidokowfleaSeekerHeadComponentData => 0 as any,
   [ServerComponentType.inguYetukLaser]: (): InguYetukLaserComponentData => 0 as any,
} satisfies Record<ServerComponentType, object>;

export type ServerComponentData<T extends ServerComponentType> = ReturnType<typeof ServerComponentDataRecord[T]>;