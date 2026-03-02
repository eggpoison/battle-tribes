<script lang="ts">
   import { playerTribe } from "../../game/tribes";
   import { techTreeState } from "../../ui-state/tech-tree-state.svelte";
   import TechTreeProgressBar from "./tech-tree/TechTreeProgressBar.svelte";

   const selectedTech = techTreeState.getSelectedTech();
</script>

{#if selectedTech !== null}
   {@const studyProgress = playerTribe.techTreeUnlockProgress[selectedTech.id]?.studyProgress || 0}
   <div id="tech-infocard" class="infocard">
      {#if studyProgress < selectedTech.researchStudyRequirements}
         <div class="flex">
            <h2>{selectedTech.name}</h2>
            <img src={require("../../images/tech-tree/" + selectedTech.iconSrc)} alt="" />
         </div>
         <TechTreeProgressBar techInfo={selectedTech} />
      {:else}
         <div class="flex">
            <h2>Research Complete!</h2>
            <img src={require("../../images/tech-tree/" + selectedTech.iconSrc)} alt="" />
         </div>
      {/if}
   </div>
{/if}