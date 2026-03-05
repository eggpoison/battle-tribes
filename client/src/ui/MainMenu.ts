const mainMenuElem = document.getElementById("main-menu")!;

export function openMainMenu(): void {
   mainMenuElem.classList.remove("hidden");
}

export function closeMainMenu(): void {
   mainMenuElem.classList.add("hidden");
}