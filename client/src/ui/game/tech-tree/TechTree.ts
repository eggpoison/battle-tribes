// import { TECHS } from "webgl-test-shared";
// import { techIsDirectlyAccessible } from "../../../game/rendering/webgl/tech-tree-rendering";
// import { techTreeState } from "../../../ui-state/tech-tree-state";
// import TechNode from "./TechNode.svelte";
// import { debugDisplayState } from "../../../ui-state/debug-display-state";
// import { onDestroy, onMount } from "svelte";

import { gameIsRunning } from "../../../game/game";
import { addKeyListener } from "../../../game/keyboard-input";
import { MenuType, menuSelectorState } from "../../menus";

// const boundsScale = 16;

// let minX = 0;
// let maxX = 0;
// let minY = 0;
// let maxY = 0;
// for (let i = 0; i < TECHS.length; i++) {
//    const tech = TECHS[i];
//    if (tech.positionX < minX) {
//       minX = tech.positionX;
//    }
//    if (tech.positionX > maxX) {
//       maxX = tech.positionX;
//    }
//    if (tech.positionY < minY) {
//       minY = tech.positionY;
//    }
//    if (tech.positionY > maxY) {
//       maxY = tech.positionY;
//    }
// }
// minX *= boundsScale;
// maxX *= boundsScale;
// minY *= boundsScale;
// maxY *= boundsScale;

// let isDragging = $state(false);

// let lastDragX = $state(0);
// let lastDragY = $state(0);

// function onScroll(e: WheelEvent): void {
//    if (e.deltaY > 0) {
//       let newZoom = techTreeState.zoom / 1.2;
//       if (newZoom < 0.25) {
//          newZoom = techTreeState.zoom;
//       }
//       techTreeState.setZoom(newZoom);
//    } else {
//       let newZoom = techTreeState.zoom * 1.2;
//       if (newZoom > 1) {
//          newZoom = techTreeState.zoom;
//       }
//       techTreeState.setZoom(newZoom);
//    }
// }

// onMount(() => {
//    document.addEventListener("wheel", onScroll);
// });

// onDestroy(() => {
//    document.removeEventListener("wheel", onScroll);
// });

// const onmousemove = (e: MouseEvent): void => {
//    isDragging = true;
//    lastDragX = e.clientX;
//    lastDragY = e.clientY;
// }

// const onmousedown = (e: MouseEvent): void => {
//    if (!isDragging) {
//       return;
//    }
//    const dragX = e.clientX - lastDragX;
//    const dragY = e.clientY - lastDragY;

//    lastDragX = e.clientX;
//    lastDragY = e.clientY;

//    let x = techTreeState.x + dragX * 2 / techTreeState.zoom;
//    let y = techTreeState.y + dragY * 2 / techTreeState.zoom;
//    if (x < minX) {
//       x = minX;
//    } else if (x > maxX) {
//       x = maxX;
//    }
//    if (y < minY) {
//       y = minY;
//    } else if (y > maxY) {
//       y = maxY;
//    }
   
//    techTreeState.setX(x);
//    techTreeState.setY(y);
// }

// const onmouseup = (): void => {
//    isDragging = false;
// }

addKeyListener("p", () => {
   // Open/close tech tree
   if (gameIsRunning) {
      menuSelectorState.toggleMenu(MenuType.techTree);
   }
});

export function openTechTree() {}
   
// <!-- svelte-ignore a11y_no_static_element_interactions -->
// <div id="tech-tree" style:--tech-tree-zoom={techTreeState.zoom} {onmousedown} {onmousemove} {onmouseup}>
//    <h1>Tech Tree</h1>
   
//    {#each TECHS.filter(tech => debugDisplayState.showAllTechs || techIsDirectlyAccessible(tech)) as techInfo}
//       <TechNode tech={techInfo} x={techTreeState.x} y={techTreeState.y} zoom={techTreeState.zoom} />
//    {/each}
// </div>