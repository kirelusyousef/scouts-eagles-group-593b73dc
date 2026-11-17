import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { evaluationLoad } from '@/lib/evaluation.functions';
import { evaluationAllowed } from '@/lib/evaluation-access';
import { getSessionToken } from '@/lib/session-store';
import { EVALUATION_SCREENS } from '@/lib/evaluation-types';
export function EvaluationNav(){
 const load=useServerFn(evaluationLoad);const token=getSessionToken()||'';const {data}=useQuery({queryKey:['evaluation-nav',token],queryFn:()=>load({data:{token}}),enabled:!!token,retry:false,staleTime:30000});
 return <section className="space-y-2 border-b border-border pb-4"><h2 className="flex items-center gap-2 text-sm font-bold"><Trophy className="h-4 w-4"/>التقييم والنقاط</h2><div className="grid grid-cols-3 gap-2">{EVALUATION_SCREENS.filter(s=>['personal','history','members','leaders','marathon'].includes(s.key)||(data&&(evaluationAllowed(data.actor,data.grants,s.key,'r')||data.activities.some(a=>a.module===s.key&&a.leader_ids.includes(data.actor))))).map(s=><Button asChild key={s.key} variant="outline" className="aspect-square h-auto flex-col whitespace-normal px-1 text-center text-[10px] leading-snug"><Link to="/evaluation/$screen" params={{screen:s.key}}><Trophy/>{s.label}</Link></Button>)}</div></section>;
}