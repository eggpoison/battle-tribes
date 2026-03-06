import { ServerComponentType } from "../../shared/src/components";

// @ROBUSTNESS! doesn't show any compiler warnings when a new entity type is added. generally very unwieldy
export const ENTITY_COMPONENT_TYPES: ReadonlyArray<ReadonlyArray<ServerComponentType>> = [
   // cow
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.attackingEntities, ServerComponentType.rideable, ServerComponentType.loot, ServerComponentType.taming, ServerComponentType.cow],
   // zombie
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.zombie, ServerComponentType.aiHelper, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.loot],
   // tombstone
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tombstone],
   // tree
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.tree],
   // workbench
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.craftingStation],
   // boulder
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.boulder],
   // berryBush
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.berryBush],
   // cactus
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.cactus],
   // yeti,
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.attackingEntities, ServerComponentType.loot, ServerComponentType.yeti],
   // iceSpikes
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.iceSpikes],
   // slime
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.slime, ServerComponentType.craftingStation],
   // slimewisp
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.slimewisp],
   // player
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.tribesman, ServerComponentType.player, ServerComponentType.inventory, ServerComponentType.inventoryUse],
   // tribeWorker
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.tribesman, ServerComponentType.tribesmanAI, ServerComponentType.aiHelper, ServerComponentType.aiPathfinding, ServerComponentType.aiAssignment, ServerComponentType.inventory, ServerComponentType.inventoryUse],
   // tribeWarrior
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.tribesman, ServerComponentType.tribesmanAI, ServerComponentType.aiHelper, ServerComponentType.aiPathfinding, ServerComponentType.aiAssignment, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.tribeWarrior],
   // tribeTotem
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.totemBanner],
   // workerHut
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.hut],
   // warriorHut
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.hut],
   // barrel
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.inventory, ServerComponentType.barrel],
   // campfire
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.inventory, ServerComponentType.cooking, ServerComponentType.campfire],
   // furnace
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.inventory, ServerComponentType.cooking, ServerComponentType.furnace],
   // snowball
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.snowball],
   // krumblid
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.attackingEntities, ServerComponentType.loot, ServerComponentType.energyStore, ServerComponentType.energyStomach, ServerComponentType.taming, ServerComponentType.krumblid],
   // fish
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.attackingEntities, ServerComponentType.loot, ServerComponentType.fish],
   // itemEntity
   [ServerComponentType.transform, ServerComponentType.item],
   // fleshSwordItemEntity
   [ServerComponentType.transform, ServerComponentType.item, ServerComponentType.aiHelper, ServerComponentType.fleshSwordItem],
   // woodenArrow
   [ServerComponentType.transform, ServerComponentType.tribe, ServerComponentType.projectile],
   // ballistaWoodenBolt
   [ServerComponentType.transform, ServerComponentType.tribe, ServerComponentType.projectile],
   // ballistaRock
   [ServerComponentType.transform, ServerComponentType.tribe, ServerComponentType.projectile],
   // ballistaSlimeball
   [ServerComponentType.transform, ServerComponentType.tribe, ServerComponentType.projectile],
   // ballistaFrostcicle
   [ServerComponentType.transform, ServerComponentType.tribe, ServerComponentType.projectile],
   // slingTurretRock
   [ServerComponentType.transform, ServerComponentType.tribe, ServerComponentType.projectile, ServerComponentType.slingTurretRock],
   // iceShardProjectile
   [ServerComponentType.transform, ServerComponentType.iceShard],
   // spearProjectile
   [ServerComponentType.transform, ServerComponentType.throwingProjectile, ServerComponentType.spearProjectile],
   // researchBench
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.researchBench],
   // wall
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial],
   // slimeSpit
   [ServerComponentType.transform, ServerComponentType.slimeSpit],
   // door
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial, ServerComponentType.door],
   // battleaxeProjectile
   [ServerComponentType.transform, ServerComponentType.tribe, ServerComponentType.throwingProjectile, ServerComponentType.battleaxeProjectile],
   // golem
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.golem],
   // planterBox
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.planterBox],
   // iceArrow
   [ServerComponentType.transform, ServerComponentType.tribe, ServerComponentType.projectile, ServerComponentType.iceArrow],
   // pebblum
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.pebblum],
   // embrasure
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial],
   // tunnel
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial, ServerComponentType.tunnel],
   // floorSpikes
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial, ServerComponentType.spikes],
   // wallSpikes
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial, ServerComponentType.spikes],
   // floorPunjiSticks
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.punjiSticks],
   // wallPunjiSticks
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.spikes, ServerComponentType.punjiSticks],
   // blueprintEntity
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.structure, ServerComponentType.blueprint, ServerComponentType.tribe],
   // ballista
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper, ServerComponentType.ammoBox, ServerComponentType.inventory, ServerComponentType.ballista],
   // slingTurret
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.turret, ServerComponentType.aiHelper, ServerComponentType.slingTurret],
   // healingTotem
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.aiHelper, ServerComponentType.healingTotem],
   // treePlanted
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.planted, ServerComponentType.loot, ServerComponentType.treePlanted],
   // berryBushPlanted
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.planted, ServerComponentType.loot, ServerComponentType.berryBushPlanted],
   // iceSpikesPlanted
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.planted, ServerComponentType.loot, ServerComponentType.iceSpikesPlanted],
   // fence
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.fence],
   // fenceGate
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.fenceGate],
   // frostshaper
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.craftingStation],
   // stonecarvingTable
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.craftingStation],
   // grassStrand
   [ServerComponentType.transform, ServerComponentType.layeredRod],
   // decoration
   [ServerComponentType.transform, ServerComponentType.decoration],
   // riverSteppingStone
   [ServerComponentType.transform, ServerComponentType.riverSteppingStone],
   // reed
   [ServerComponentType.transform, ServerComponentType.layeredRod],
   // lilypad
   [ServerComponentType.transform],
   // fibrePlant,
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect],
   // guardian
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.guardian],
   // guardianGemQuake
   [ServerComponentType.transform, ServerComponentType.guardianGemQuake],
   // guardianGemFragmentProjectile
   [ServerComponentType.transform, ServerComponentType.projectile, ServerComponentType.guardianGemFragmentProjectile],
   // guardianSpikyBall
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.projectile, ServerComponentType.guardianSpikyBall],
   // bracings
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.buildingMaterial, ServerComponentType.bracings],
   // fireTorch
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.fireTorch],
   // spikyBastard
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.spikyBastard],
   // glurbHeadSegment
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.attackingEntities, ServerComponentType.loot, ServerComponentType.taming, ServerComponentType.glurbSegment, ServerComponentType.glurbHeadSegment],
   // glurbBodySegment
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.glurbSegment, ServerComponentType.glurbBodySegment],
   // glurbTailSegment
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.glurbSegment],
   // slurbTorch
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.slurbTorch],
   // treeRootBase
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.treeRootBase],
   // treeRootSegment
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.treeRootSegment],
   // mithrilOreNode
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.mithrilOreNode],
   // scrappy
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.tribesmanAI, ServerComponentType.aiHelper, ServerComponentType.aiPathfinding, ServerComponentType.aiAssignment, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.scrappy],
   // cogwalker
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.tribesmanAI, ServerComponentType.aiHelper, ServerComponentType.aiPathfinding, ServerComponentType.aiAssignment, ServerComponentType.inventory, ServerComponentType.inventoryUse, ServerComponentType.cogwalker],
   // automatonAssembler
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.craftingStation, ServerComponentType.automatonAssembler],
   // mithrilAnvil
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.structure, ServerComponentType.tribe, ServerComponentType.craftingStation, ServerComponentType.mithrilAnvil],
   // heldItem
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.heldItem],
   // moss
   [ServerComponentType.transform, ServerComponentType.moss],
   // floorSign
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.tribe, ServerComponentType.structure, ServerComponentType.floorSign],
   // desertBushLively
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.energyStore, ServerComponentType.desertBushLively],
   // desertBushSandy
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.energyStore, ServerComponentType.desertBushSandy],
   // desertSmallWeed
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.energyStore, ServerComponentType.desertSmallWeed],
   // desertShrub
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.energyStore, ServerComponentType.desertShrub],
   // tumbleweedLive
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.tumbleweedLive],
   // tumbleweedDead
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.tumbleweedDead],
   // palmTree
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.loot, ServerComponentType.palmTree],
   // pricklyPear
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.energyStore, ServerComponentType.pricklyPear],
   // pricklyPearFragmentProjectile
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.pricklyPearFragmentProjectile],
   // dustflea
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.aiHelper, ServerComponentType.attackingEntities, ServerComponentType.energyStore, ServerComponentType.energyStomach, ServerComponentType.dustflea],
   // sandstoneRock
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.sandstoneRock],
   // okren
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.aiHelper, ServerComponentType.energyStore, ServerComponentType.energyStomach, ServerComponentType.rideable, ServerComponentType.loot, ServerComponentType.taming, ServerComponentType.okren],
   // okrenClaw
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.energyStore, ServerComponentType.okrenClaw],
   // dustfleaMorphCocoon
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.dustfleaMorphCocoon],
   // sandBall
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.sandBall],
   // krumblidMorphCocoon
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.krumblidMorphCocoon],
   // okrenTongue
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.okrenTongue],
   // dustfleaEgg
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.dustfleaEgg],
   // spruceTree
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.spruceTree],
   // tundraRock
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tundraRock],
   // tundraRockFrozen
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tundraRockFrozen],
   // snowberryBush
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.loot, ServerComponentType.snowberryBush],
   // snobe
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.attackingEntities, ServerComponentType.taming, ServerComponentType.loot, ServerComponentType.snobe],
   // snobeMound
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.snobeMound],
   // inguSerpent
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.health, ServerComponentType.aiHelper, ServerComponentType.taming, ServerComponentType.loot, ServerComponentType.inguSerpent],
   // tukmok
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.attackingEntities, ServerComponentType.energyStomach, ServerComponentType.rideable, ServerComponentType.loot, ServerComponentType.taming, ServerComponentType.tukmok],
   // tukmokTrunk
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tukmokTrunk],
   // tukmokTailClub
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tukmokTailClub],
   // tukmokSpur
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tukmokSpur],
   // inguYetuksnoglurblidokowflea
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.aiHelper, ServerComponentType.inguYetuksnoglurblidokowflea],
   // inguYetuksnoglurblidokowfleaSeekerHead
   [ServerComponentType.transform, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead],
   // inguYetukLaser
   [ServerComponentType.transform, ServerComponentType.statusEffect, ServerComponentType.inguYetukLaser],
];