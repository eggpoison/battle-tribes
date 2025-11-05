<script lang="ts">
   import { Tech } from "webgl-test-shared/src/techs";
   import { playerTribe } from "../../../game/tribes";

   interface Props {
      readonly techInfo: Tech;
   }

   let props: Props = $props();

   const techInfo = props.techInfo;
   const studyProgress = playerTribe.techTreeUnlockProgress[techInfo.id]?.studyProgress || 0;
</script>

<div class="study-progress-bar-bg">
   <p class="research-progress">{studyProgress}/{techInfo.researchStudyRequirements}</p>
   <div style:--study-progress={studyProgress / techInfo.researchStudyRequirements} class="study-progress-bar"></div>
</div>