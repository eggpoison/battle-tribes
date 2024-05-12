import { ServerComponentType } from "webgl-test-shared/dist/components";
import { veryBadHash } from "webgl-test-shared/dist/utils";
import { PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import Tombstone from "../../../entities/Tombstone";
import { getSelectedEntity } from "../../../entity-selection";

// __NAME__'s brain exploded.

const LIFE_MESSAGES: ReadonlyArray<string> = [
   "He lived as he died, kicking buckets."
];

// @Incomplete
const TOMBSTONE_DEATH_MESSAGES: Record<PlayerCauseOfDeath, string> = {
   [PlayerCauseOfDeath.zombie]: "Ripped to pieces by a zombie",
   [PlayerCauseOfDeath.yeti]: "Tried to hug a yeti",
   [PlayerCauseOfDeath.god]: "Struck down by divine judgement",
   [PlayerCauseOfDeath.fire]: "Couldn't handle the smoke",
   [PlayerCauseOfDeath.poison]: "Poisoned",
   [PlayerCauseOfDeath.tribe_member]: "Died to a tribe member", // @Incomplete
   [PlayerCauseOfDeath.arrow]: "Impaled by an arrow", // @Incomplete
   [PlayerCauseOfDeath.ice_spikes]: "Died to ice spikes", // @Incomplete
   [PlayerCauseOfDeath.ice_shards]: "Impaled by an ice shard", // @Incomplete
   [PlayerCauseOfDeath.cactus]: "Impaled by an arrow", // @Incomplete
   [PlayerCauseOfDeath.snowball]: "Crushed by a snowball", // @Incomplete
   [PlayerCauseOfDeath.slime]: "Absorbed by a slime", // @Incomplete
   [PlayerCauseOfDeath.frozen_yeti]: "Thought the 'F' in Frozen Yeti meant friend", // @Incomplete
   [PlayerCauseOfDeath.bloodloss]: "Ran out of blood",
   [PlayerCauseOfDeath.rock_spike]: "Impaled from hole to hole",
   [PlayerCauseOfDeath.lack_of_oxygen]: "Ran out of oxygen",
   [PlayerCauseOfDeath.fish]: "Got beat up by a fish",
   [PlayerCauseOfDeath.spear]: ""
};

const TombstoneEpitaph = () => {
   const tombstone = getSelectedEntity() as Tombstone;

   const tombstoneComponent = tombstone.getServerComponent(ServerComponentType.tombstone);
   const causeOfDeath = TOMBSTONE_DEATH_MESSAGES[tombstoneComponent.deathInfo!.causeOfDeath];

   // Choose a random life message based off the entity's id
   const hash = veryBadHash(tombstone.id.toString());
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