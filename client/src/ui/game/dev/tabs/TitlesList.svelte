<script lang="ts">
   import { TRIBESMAN_TITLE_RECORD, TribesmanTitle } from "webgl-test-shared";

   interface Props {
      readonly titles: ReadonlyArray<TribesmanTitle>;
      onclick(title: TribesmanTitle): void;
   }

   let props: Props = $props();
</script>

<div class="titles-list">
   {#each props.titles as title}
      {@const titleInfo = TRIBESMAN_TITLE_RECORD[title]}
      <div>
         <button onclick={() => props.onclick(title)}>{titleInfo.name}</button>
      </div>
   {/each}
</div>