import {visibilityDecision,type VisibilityRule,type VisibilityUser} from './screen-visibility';
let rules:VisibilityRule[]=[];
export function updateVisibilityRules(value:VisibilityRule[]){rules=value;}
export function cachedVisibility(user:VisibilityUser,screen:string){return visibilityDecision(user,screen,rules);}