import {useEffect,useState} from 'react';
import {useServerFn} from '@tanstack/react-start';
import {useQueryClient} from '@tanstack/react-query';
import {evaluationLoad,evaluationSaveGrant} from '@/lib/evaluation.functions';
import {EVALUATION_SCREENS} from '@/lib/evaluation-types';
import {toggleEvaluationAction} from '@/lib/evaluation-access';
import {visibilityLoad} from '@/lib/visibility.functions';
import {updateVisibilityRules} from '@/lib/visibility-cache';
import {getSessionToken} from '@/lib/session-store';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {toast} from 'sonner';
export function IndividualEvaluationPermissions({userId}:{userId:string}){
 const load=useServerFn(evaluationLoad),save=useServerFn(evaluationSaveGrant),loadVisibility=useServerFn(visibilityLoad),queryClient=useQueryClient();
 const [rows,setRows]=useState<Record<string,string>>({}),[team,setTeam]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[existing,setExisting]=useState<any[]>([]),[teams,setTeams]=useState<any[]>([]),[changed,setChanged]=useState<string[]>([]);
 useEffect(()=>{let active=true;setLoading(true);setError('');setChanged([]);load({data:{token:getSessionToken()||''}}).then(d=>{if(!active)return;setExisting(d.permissions);setTeams(d.teams);setRows(Object.fromEntries(EVALUATION_SCREENS.map(s=>[s.key,d.permissions.find((p:any)=>p.user_id===userId&&p.screen===s.key&&p.team_id===team)?.actions||''])));}).catch(()=>{if(active)setError('تعذر تحميل صلاحيات التقييم');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[userId,team,load]);
 async function persist(){setBusy(true);try{
  for(const screen of changed)await save({data:{token:getSessionToken()||'',grant:{user_id:userId,screen,team_id:team,actions:rows[screen]||'',general_access:!team,allow_self_approval:existing.find(p=>p.user_id===userId&&p.screen===screen&&p.team_id===team)?.allow_self_approval||false}}});
  const d=await load({data:{token:getSessionToken()||''}});setExisting(d.permissions);setRows(Object.fromEntries(EVALUATION_SCREENS.map(s=>[s.key,d.permissions.find((p:any)=>p.user_id===userId&&p.screen===s.key&&p.team_id===team)?.actions||''])));setChanged([]);
  const visibility=await loadVisibility({data:{token:getSessionToken()||'',admin:true}});updateVisibilityRules(visibility.rules);
  await Promise.all([queryClient.invalidateQueries({queryKey:['evaluation']}),queryClient.invalidateQueries({queryKey:['evaluation-nav']})]);window.dispatchEvent(new Event('sms-db-change'));toast.success('تم حفظ صلاحيات التقييم');
 }catch(e){toast.error(e instanceof Error?e.message:'تعذر الحفظ');}finally{setBusy(false);}}
 return <section className="space-y-4 border-t pt-6"><h2 className="text-xl font-bold">صلاحيات التقييم والنقاط</h2><select disabled={loading||busy} aria-label="نطاق صلاحيات التقييم" className="rounded-md border bg-background p-2" value={team} onChange={e=>setTeam(e.target.value)}><option value="">جميع الفرق</option>{teams.map(t=><option key={t.Team_ID} value={t.Team_ID}>{t.Team_Name}</option>)}</select>{error?<p role="alert">{error}</p>:loading?<p>جاري تحميل الصلاحيات…</p>:<div className="divide-y">{EVALUATION_SCREENS.map(s=><div key={s.key} className="flex flex-col gap-3 py-3 sm:flex-row sm:justify-between"><span>{s.label}</span><div className="flex flex-wrap gap-3">{[['r','عرض'],['a','إضافة'],['e','تعديل'],['d','حذف']].map(([a,label])=><label className="flex items-center gap-1 text-xs" key={a}><Checkbox disabled={busy} aria-label={`${label} ${s.label}`} checked={(rows[s.key]||'').includes(a)} onCheckedChange={checked=>{setRows(prev=>({...prev,[s.key]:toggleEvaluationAction(prev[s.key]||'',a,checked===true)}));setChanged(prev=>prev.includes(s.key)?prev:[...prev,s.key]);}}/>{label}</label>)}</div></div>)}</div>}<Button disabled={busy||loading||!!error||!changed.length} onClick={persist}>{busy?'جاري الحفظ…':'حفظ صلاحيات التقييم'}</Button></section>;
}