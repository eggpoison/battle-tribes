<script lang="ts">
   import { TRIBESMAN_TITLE_RECORD } from "webgl-test-shared";
   import { CLIENT_TITLE_INFO_RECORD } from "../../../game/client-title-info";
   import { sendRespondToTitleOfferPacket } from "../../../game/networking/packet-sending";
   import { infocardsState } from "../../../ui-state/infocards-state.svelte";

   const titleOffer = infocardsState.titleOffer;
</script>


{#if titleOffer !== null}
   {@const titleInfo = TRIBESMAN_TITLE_RECORD[titleOffer]}
   {@const clientTitleInfo = CLIENT_TITLE_INFO_RECORD[titleOffer]}

   <div class="infocard sub-menu">
      <p class="center">You have received the {titleInfo.name} title! <i style:color="#aaa">(Tier {titleInfo.tier})</i></p>

      <div class="bar"></div>

      <ul>
         {#each clientTitleInfo.effects as effectText}
            <li>{effectText}</li>
         {/each}
      </ul>

      <div class="flex-container center">
         <button onclick={() => sendRespondToTitleOfferPacket(titleOffer, true)}>Accept</button>
         <button onclick={() => sendRespondToTitleOfferPacket(titleOffer, false)}>Reject</button>
      </div>
   </div>
{/if}