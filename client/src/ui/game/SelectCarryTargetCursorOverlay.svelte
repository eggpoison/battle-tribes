<script lang="ts">
   import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state.svelte";

   interface Props {
      readonly mouseX: number;
      readonly mouseY: number;
   }

   let props: Props = $props();
</script>

<div
   id="select-carry-target-cursor-overlay"
   class:carry={gameUIState.gameInteractState === GameInteractState.selectCarryTarget || gameUIState.gameInteractState === GameInteractState.selectRiderDepositLocation}
   class:move={gameUIState.gameInteractState === GameInteractState.selectMoveTargetPosition}
   class:attack={gameUIState.gameInteractState === GameInteractState.selectAttackTarget}
   style:left="{props.mouseX}px"
   style:top="{props.mouseY}px"
></div>