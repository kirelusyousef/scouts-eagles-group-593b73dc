import type { EvaluationRow } from './evaluation-types';
export function toggleEvaluationAction(actions: string, action: string, checked: boolean) {
  const next = new Set(actions);
  if (checked) { next.add(action); next.add('r'); }
  else if (action === 'r') next.clear();
  else next.delete(action);
  return ['r','a','e','d'].filter(a => next.has(a)).join('');
}
export function evaluationAllowed(actor: string, grants: EvaluationRow[], screen: string, action: string, team?: string) {
  if (actor === 'MASTER-ADMIN') return true;
  return grants.some(g => g.user_id === actor && g.screen === screen && String(g.actions).includes('r') && String(g.actions).includes(action) && (g.general_access || (team === undefined ? !!g.team_id : !!g.team_id && g.team_id === team)));
}
export function evaluationEligible(user: EvaluationRow, activity: EvaluationRow) {
  const category = user.Role === 'Leader' ? 'Leader' : 'Member';
  return !['Pending','Suspended'].includes(user.Status) && category === activity.audience && (category === 'Leader' || (!!user.Team_ID && activity.team_ids.includes(user.Team_ID))) && (!activity.beneficiary_ids.length || activity.beneficiary_ids.includes(user.ID));
}