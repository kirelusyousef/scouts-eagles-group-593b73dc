export type VisibilityRule = { id: string; screen: string; scope: 'all'|'role'|'education'|'team'|'committee'|'user'; value: string; visible: boolean };
export type VisibilityUser = { ID?:string; Role?:string|null; Education_Stage?:string|null; Team_ID?:string|null; Committee_ID?:string|null };
export function visibilityDecision(user:VisibilityUser,screen:string,rules:VisibilityRule[]):boolean|undefined {
 const fields={all:'',role:user.Role,education:user.Education_Stage,team:user.Team_ID,committee:user.Committee_ID,user:user.ID};
 const priority={all:0,role:1,education:2,team:3,committee:3,user:4};
 const matches=rules.filter(r=>r.screen===screen&&(r.scope==='all'||!!fields[r.scope]&&fields[r.scope]===r.value));
 if(!matches.length)return undefined;
 const highest=Math.max(...matches.map(r=>priority[r.scope]));
 return matches.filter(r=>priority[r.scope]===highest).every(r=>r.visible);
}