import { veryBadHash } from "battletribes-shared/utils";
import { DamageSource } from "battletribes-shared/entities";
import { getSelectedEntity } from "../../../game/entity-selection";
import { TombstoneComponentArray } from "../../../game/entity-components/server-components/TombstoneComponent";

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

const TombstoneEpitaph = () => {
   const tombstone = getSelectedEntity();

   const tombstoneComponent = TombstoneComponentArray.getComponent(tombstone);
   const causeOfDeath = TOMBSTONE_DEATH_MESSAGES[tombstoneComponent.deathInfo!.damageSource];

   // Choose a random life message based off the entity's id
   const hash = veryBadHash(tombstone.toString());
   const lifeMessage = LIFE_MESSAGES[hash % LIFE_MESSAGES.length];

   return <div id="tombstone-epitaph">
      <div className="content">
         <h1 className="name">{tombstoneComponent.deathInfo!.username}</h1>

         <p className="life-message">{lifeMessage}</p>

         <h3 className="cause-of-death-caption">CAUSE OF DEATH</h3>
         <p className="cause-of-death">{causeOfDeath}</p>
      </div>
   </div>;
}

export default TombstoneEpitaph;