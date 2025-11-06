<script lang="ts">
   import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state.svelte";

   interface Props {
      readonly mouseX: number;
      readonly mouseY: number;
   }

   let props: Props = $props();

   const className = (() => {
      switch (gameUIState.gameInteractState) {
         case GameInteractState.selectCarryTarget:
         case GameInteractState.selectRiderDepositLocation: {
            return "carry";
         }
         case GameInteractState.selectMoveTargetPosition: {
            return "move";
         }
         case GameInteractState.selectAttackTarget: {
            return "attack";
         }
         default: {
            throw new Error();
         }
      }
   })();
</script>

<div id="select-carry-target-cursor-overlay" class={className} style:left="{props.mouseX}px" style:top="{props.mouseY}px"></div>