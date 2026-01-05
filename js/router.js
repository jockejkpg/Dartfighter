export const Routes = Object.freeze({
  SETUP: "setup",
  PLAYERS: "players",
  GAME: "game",
});

export function getRouteFromHash(){
  const h = (location.hash || "").replace("#", "").trim();
  return h || Routes.SETUP;
}

export function nav(route){
  location.hash = route;
}
