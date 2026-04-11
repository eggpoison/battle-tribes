const mainMenuElem = document.getElementById("main-menu")!;

export function openMainMenu(): void {
   mainMenuElem.hidden = false;
}

export function mainMenuIsHidden(): boolean {
   return mainMenuElem.hidden;
}

export function closeMainMenu(): void {
   mainMenuElem.hidden = true;
}