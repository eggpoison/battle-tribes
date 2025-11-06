<script lang="ts">
   import { DamageSource, veryBadHash } from "webgl-test-shared";
   import { TombstoneComponentArray } from "../../../game/entity-components/server-components/TombstoneComponent";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";

   // __NAME__'s brain exploded.

   const LIFE_MESSAGES: ReadonlyArray<string> = [
      "He lived as he died, kicking buckets."
   ];


   // @Incomplete
   const TOMBSTONE_DEATH_MESSAGES: Record<DamageSource, string> = {
      [DamageSource.zombie]: "Ripped to pieces by a zombie",
      [DamageSource.yeti]: "Tried to hug a yeti",
      [DamageSource.god]: "Struck down by divine judgement",
      [DamageSource.fire]: "Couldn't handle the smoke",
      [DamageSource.poison]: "Poisoned",
      [DamageSource.tribeMember]: "Died to a tribe member", // @Incomplete
      [DamageSource.arrow]: "Impaled by an arrow", // @Incomplete
      [DamageSource.iceSpikes]: "Died to ice spikes", // @Incomplete
      [DamageSource.iceShards]: "Impaled by an ice shard", // @Incomplete
      [DamageSource.cactus]: "Impaled by an arrow", // @Incomplete
      [DamageSource.snowball]: "Crushed by a snowball", // @Incomplete
      [DamageSource.slime]: "Absorbed by a slime", // @Incomplete
      [DamageSource.frozenYeti]: "Thought the 'F' in Frozen Yeti meant friend", // @Incomplete
      [DamageSource.bloodloss]: "Ran out of blood",
      [DamageSource.rockSpike]: "Impaled from hole to hole",
      [DamageSource.lackOfOxygen]: "Ran out of oxygen",
      [DamageSource.fish]: "Got beat up by a fish",
      [DamageSource.spear]: ""
   };

   // @Hack: "!"
   const tombstone = entityInteractionState.selectedEntity!;

   const tombstoneComponent = TombstoneComponentArray.getComponent(tombstone);
   const causeOfDeath = TOMBSTONE_DEATH_MESSAGES[tombstoneComponent.deathInfo!.damageSource];

   // Choose a random life message based off the entity's id
   const hash = veryBadHash(tombstone.toString());
   const lifeMessage = LIFE_MESSAGES[hash % LIFE_MESSAGES.length];
</script>

<div id="tombstone-epitaph">
   <div class="content">
      <h1 class="name">{tombstoneComponent.deathInfo!.username}</h1>

      <p class="life-message">{lifeMessage}</p>

      <h3 class="cause-of-death-caption">CAUSE OF DEATH</h3>
      <p class="cause-of-death">{causeOfDeath}</p>
   </div>
</div>