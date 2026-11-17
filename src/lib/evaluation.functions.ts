import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { evaluationAllowed, evaluationEligible } from './evaluation-access';
import { activityState, DEFAULT_EVALUATION_CONFIG, type EvaluationRow } from './evaluation-types';
import { verifySessionToken, loadUser, MASTER_ID } from './session.server';

const text = z.string().max(2000);
const criterion = z.object({ id: z.string().uuid().optional(), title: text.min(1), description: text.default(''), points: z.number().min(0).max(100000), options: z.array(z.string().max(500)).max(20).default([]), correct_option: z.number().int().min(0).nullable().default(null), question_id: z.string().uuid().nullable().default(null), image_url: z.string().max(2000000).default(''), sort_order: z.number().int().default(0) });
const activity = z.object({ id:z.string().uuid().optional(), module:z.enum(['marathon','public_service','church','scout','notebook']), title:text.min(1), description:text.default(''), audience:z.enum(['Member','Leader']), team_ids:z.array(text).max(100), beneficiary_ids:z.array(text).max(2000).default([]), leader_ids:z.array(text).max(100).default([]), starts_at:z.string().datetime(), ends_at:z.string().datetime(), publish_at:z.string().datetime(), max_attempts:z.number().int().min(1).max(20), state:z.enum(['Draft','Scheduled','Published','Archived']), attendance_points:z.number().min(0).max(100000), excused_enabled:z.boolean(), excused_points:z.number().min(0).max(100000), season:text, image_url:z.string().max(2000000).default(''), template_id:z.string().uuid().nullable().default(null), max_points:z.number().min(0).nullable(), reveal_answers:z.enum(['closed','attempt']), linked_record:text.default('') });
async function context(token:string) {
  const session = await verifySessionToken(token);
  if (!session) throw new Error('انتهت الجلسة، سجّل الدخول مجدداً');
  const user = await loadUser(session.userId);
  if (!user || ['Pending','Suspended'].includes(String(user.Status))) throw new Error('الحساب غير متاح');
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  const {data:grants,error} = await db.from('Evaluation_Permissions').select('*').eq('user_id',session.userId);
  if(error) throw new Error('تعذر تحميل الصلاحيات');
  return { db, user, actor:session.userId, grants:grants || [] };
}
function requireGrant(c:Awaited<ReturnType<typeof context>>, screen:string, action:string, teams?:string[]) {
  if (!evaluationAllowed(c.actor,c.grants,screen,action) || (teams && !teams.every(t=>evaluationAllowed(c.actor,c.grants,screen,action,t)))) throw new Error('ليست لديك صلاحية ضمن هذا النطاق');
}
function checked(r:any) { if(r.error) { console.error('evaluation operation failed',r.error.code,r.error.message); throw new Error('تعذر إتمام العملية؛ تحقق من الصلاحيات والمواعيد وعدم تكرار التسجيل'); } return r.data; }
async function audit(c:Awaited<ReturnType<typeof context>>,type:string,id:string,action:string,snapshot:unknown) {
  checked(await c.db.from('Evaluation_Changes').insert({entity_type:type,entity_id:id,actor_id:c.actor,action,snapshot}));
}
async function all(db:any,table:string) { let rows:EvaluationRow[]=[]; for(let i=0;;i+=1000) { const data=checked(await db.from(table).select('*').range(i,i+999)) || []; rows=rows.concat(data); if(data.length<1000) return rows; } }

export const evaluationLoad = createServerFn({method:'POST'}).inputValidator(z.object({token:z.string().max(4000)})).handler(async ({data})=>{
  const c=await context(data.token);
  const [activities,criteria,users,teams,transactions,results,settings,drafts]=await Promise.all(['Evaluation_Activities','Evaluation_Criteria','Users','Teams','Points_Transactions','Evaluation_Results','Evaluation_Settings','Evaluation_Attendance_Drafts'].map(t=>all(c.db,t)));
  const manager=(a:EvaluationRow)=>!!a?.module && evaluationAllowed(c.actor,c.grants,a.module,'r') && (a.team_ids.length ? a.team_ids.every((t:string)=>evaluationAllowed(c.actor,c.grants,a.module,'r',t)) : evaluationAllowed(c.actor,c.grants,a.module,'r',''));
  const visible=activities.filter(a=>manager(a) || a.leader_ids.includes(c.actor) || (evaluationEligible(c.user,a) && !['Draft','Archived','Scheduled'].includes(activityState(a,Date.now()))));
  const ids=new Set(visible.map(a=>a.id));
  const tx=transactions.filter(t=>t.user_id===c.actor || evaluationAllowed(c.actor,c.grants,'points_approval','r',t.team_id) || evaluationAllowed(c.actor,c.grants,'history','r',t.team_id));
  const safeResults=results.filter(r=>ids.has(r.activity_id) && (r.user_id===c.actor || manager(visible.find(a=>a.id===r.activity_id) || {}) || visible.some(a=>a.id===r.activity_id && a.leader_ids.includes(c.actor)))).map(r=>{
    const a=visible.find(a=>a.id===r.activity_id);
    if(a?.module!=='marathon' || manager(a)) return r;
    const closed=activityState(a,Date.now())==='Closed';
    const approved=transactions.some(t=>t.result_id===r.id && t.status==='Approved');
    const {criteria_snapshot,proposed_points,...safe}=r;
    return {...safe,proposed_points:closed&&approved?proposed_points:null,criteria_snapshot:closed||a.reveal_answers==='attempt'?criteria_snapshot:[]};
  });
  const safeCriteria=criteria.filter(q=>ids.has(q.activity_id)).map(q=>{
    const a=visible.find(a=>a.id===q.activity_id);
    if(a && manager(a)) return q;
    const {correct_option,...safe}=q; return safe;
  });
  const questionAccess=evaluationAllowed(c.actor,c.grants,'questions','r');
  const templateAccess=evaluationAllowed(c.actor,c.grants,'public_service','r')||evaluationAllowed(c.actor,c.grants,'notebook','r');
  const [questions,templates,permissions,changes,memberRanks,leaderRanks]=await Promise.all([
    questionAccess?all(c.db,'Evaluation_Questions'):[],templateAccess?all(c.db,'Evaluation_Templates'):[], c.actor===MASTER_ID?all(c.db,'Evaluation_Permissions'):c.grants,
    evaluationAllowed(c.actor,c.grants,'history','r','')?all(c.db,'Evaluation_Changes'):[],
    c.db.rpc('evaluation_rankings',{p_category:'Member',p_season:''}).then(checked),c.db.rpc('evaluation_rankings',{p_category:'Leader',p_season:''}).then(checked),
  ]);
  const publicUsers=users.map(u=>({ID:u.ID,name:[u.First_Name,u.Father_Name,u.Grandfather_Name,u.Last_Name].filter(Boolean).join(' '),Profile_Photo:u.Profile_Photo,Team_ID:u.Team_ID,Role:u.Role,Status:u.Status}));
  return {actor:c.actor,grants:c.grants,activities:visible,criteria:safeCriteria,transactions:tx,results:safeResults,users:publicUsers,teams,questions,templates:templates.filter(t=>evaluationAllowed(c.actor,c.grants,t.module,'r') && t.team_ids.every((id:string)=>evaluationAllowed(c.actor,c.grants,t.module,'r',id))),permissions,changes,memberRanks:memberRanks||[],leaderRanks:leaderRanks||[],config:{...DEFAULT_EVALUATION_CONFIG,...settings[0]?.config},drafts:drafts.filter(d=>visible.some(a=>a.id===d.activity_id && (manager(a)||a.leader_ids.includes(c.actor)))),now:Date.now()};
});

export const evaluationSaveActivity=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),activity,criteria:z.array(criterion).max(500)})).handler(async({data})=>{
  const c=await context(data.token); const a=data.activity;
  requireGrant(c,a.module,a.id?'e':'a',a.team_ids.length?a.team_ids:['']);
  if(Date.parse(a.ends_at)<=Date.parse(a.starts_at)||Date.parse(a.publish_at)>Date.parse(a.starts_at)) throw new Error('تحقق من ترتيب مواعيد النشر والبداية والإغلاق');
  if(a.audience==='Member'&&!a.team_ids.length) throw new Error('اختر مرحلة واحدة على الأقل');
  if(a.module==='marathon' && !data.criteria.length && a.state!=='Draft') throw new Error('أضف أسئلة قبل النشر');
  if(data.criteria.some(q=>a.module==='marathon' && (q.options.length<2 || q.correct_option===null || q.correct_option>=q.options.length))) throw new Error('تحقق من اختيارات الأسئلة والإجابة الصحيحة');
  if(a.id) { const old=checked(await c.db.from('Evaluation_Activities').select('*').eq('id',a.id).single()); requireGrant(c,old.module,'e',old.team_ids.length?old.team_ids:['']); if(old.state!=='Draft') throw new Error('الأنشطة المنشورة ثابتة؛ أنشئ نشاطاً جديداً'); }
  const settings=checked(await c.db.from('Evaluation_Settings').select('config').eq('id','main').maybeSingle());
  if(settings?.config?.[`${a.module}_enabled`]===false) throw new Error('هذا المصدر متوقف من الإعدادات');
  const id=checked(await c.db.rpc('evaluation_save_activity',{p_actor:c.actor,p_activity:a,p_criteria:data.criteria}));
  return {id};
});

export const evaluationCommand=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),id:z.string().uuid(),action:z.enum(['publish','close','archive','delete'])})).handler(async({data})=>{
 const c=await context(data.token); const a=checked(await c.db.from('Evaluation_Activities').select('*').eq('id',data.id).single());
 requireGrant(c,a.module,data.action==='delete'?'d':'e',a.team_ids.length?a.team_ids:['']);
 if(data.action==='delete') { if(a.state!=='Draft') throw new Error('الحذف للمسودات غير المستخدمة فقط'); checked(await c.db.rpc('evaluation_delete_draft',{p_id:a.id,p_actor:c.actor})); }
 else if(data.action==='close') { checked(await c.db.from('Evaluation_Activities').update({closed_at:new Date().toISOString()}).eq('id',a.id)); checked(await c.db.rpc('evaluation_finalize',{p_activity:a.id})); }
 else { if(data.action==='publish' && a.state!=='Draft' && a.state!=='Scheduled') throw new Error('المسابقة منشورة بالفعل'); if(data.action==='archive' && activityState(a,Date.now())!=='Closed') throw new Error('أغلق النشاط قبل الأرشفة'); if(data.action==='publish' && a.module==='marathon') {const qs=checked(await c.db.from('Evaluation_Criteria').select('id').eq('activity_id',a.id)); if(!qs.length) throw new Error('أضف أسئلة أولاً');} checked(await c.db.from('Evaluation_Activities').update({state:data.action==='publish'?'Published':'Archived',...(data.action==='publish'?{publish_at:new Date().toISOString()}: {})}).eq('id',a.id)); }
 await audit(c,'activity',a.id,data.action,a); return {ok:true};
});

export const evaluationSubmit=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),activity_id:z.string().uuid(),rows:z.array(z.object({user_id:text,answers:z.record(z.string(),z.any()).default({}),attendance_status:z.enum(['Present','Absent','Excused']).optional(),notes:text.default('')})).min(1).max(500),draft:z.boolean().default(false)})).handler(async({data})=>{
 const c=await context(data.token);
 if(data.draft) { const a=checked(await c.db.from('Evaluation_Activities').select('*').eq('id',data.activity_id).single()); if(!['church','scout'].includes(a.module)) throw new Error('الحفظ المؤقت للحضور فقط'); if(activityState(a,Date.now())!=='Active')throw new Error('الاجتماع غير مفتوح للتسجيل'); if(c.user.Role!=='Leader')throw new Error('تسجيل الحضور للقادة المكلفين فقط'); const users=checked(await c.db.from('Users').select('ID,Role,Status,Team_ID').in('ID',data.rows.map(r=>r.user_id))); if(users.length!==data.rows.length||!users.every((u:EvaluationRow)=>evaluationEligible(u,a))) throw new Error('المستفيد خارج نطاق الاجتماع'); if(!a.leader_ids.includes(c.actor)) requireGrant(c,a.module,'e',users.map((u:EvaluationRow)=>u.Team_ID||'')); const previous=checked(await c.db.from('Evaluation_Results').select('id').eq('activity_id',a.id).in('user_id',data.rows.map(r=>r.user_id))); if(previous.length)throw new Error('الحضور المرسل ثابت؛ التصحيح بحركة منفصلة'); checked(await c.db.from('Evaluation_Attendance_Drafts').upsert(data.rows.map(r=>({activity_id:a.id,user_id:r.user_id,status:r.attendance_status,notes:r.notes,recorded_by:c.actor,updated_at:new Date().toISOString()})))); }
 else checked(await c.db.rpc('evaluation_submit',{p_activity:data.activity_id,p_actor:c.actor,p_rows:data.rows}));
 return {ok:true};
});

export const evaluationReview=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),ids:z.array(z.string().uuid()).min(1).max(500),approve:z.boolean(),reason:text.default('')})).handler(async({data})=>{
 const c=await context(data.token); if(c.user.Role!=='Leader')throw new Error('الاعتماد للقادة المصرح لهم فقط'); checked(await c.db.rpc('evaluation_review_batch',{p_ids:[...new Set(data.ids)],p_actor:c.actor,p_approve:data.approve,p_reason:data.reason})); return {ok:true};
});

const question=z.object({id:z.string().uuid().optional(),title:text.min(1),image_url:z.string().max(2000000).default(''),options:z.array(z.string().min(1).max(500)).min(2).max(20),correct_option:z.number().int().min(0),points:z.number().min(0).max(100000),difficulty:z.enum(['easy','medium','hard']),classification:text,active:z.boolean()});
const template=z.object({id:z.string().uuid().optional(),module:z.enum(['public_service','notebook']),title:text.min(1),description:text,team_ids:z.array(text),active:z.boolean(),starts_at:z.string().datetime().nullable(),ends_at:z.string().datetime().nullable(),recurrence:z.enum(['activity','daily','weekly','monthly']),max_points:z.number().min(0).nullable(),criteria:z.array(criterion).min(1).max(500)});
export const evaluationSaveResource=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),kind:z.enum(['question','template']),value:z.union([question,template])})).handler(async({data})=>{
 const c=await context(data.token); const v=data.kind==='question'?question.parse(data.value):template.parse(data.value);
 const screen=data.kind==='question'?'questions':('module' in v?v.module:''); requireGrant(c,screen,v.id?'e':'a','team_ids' in v?v.team_ids:undefined);
 if('options' in v && v.correct_option>=v.options.length) throw new Error('الإجابة الصحيحة غير موجودة');
 const table=data.kind==='question'?'Evaluation_Questions':'Evaluation_Templates';
 if(v.id) {const old=checked(await c.db.from(table).select('*').eq('id',v.id).single()); requireGrant(c,data.kind==='question'?'questions':old.module,'e',old.team_ids);}
 const row=checked(await c.db.from(table).upsert({...v,id:v.id||crypto.randomUUID(),created_by:c.actor}).select('id').single()); await audit(c,data.kind,row.id,'save',v); return {id:row.id};
});

export const evaluationSaveSettings=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),config:z.object({season:text,church_points:z.number().min(0),scout_points:z.number().min(0),excused_enabled:z.boolean(),excused_points:z.number().min(0),notifications:z.boolean(),reminder_hours:z.number().min(0).max(168),rank_notifications:z.boolean(),marathon_enabled:z.boolean(),church_enabled:z.boolean(),scout_enabled:z.boolean(),public_service_enabled:z.boolean(),notebook_enabled:z.boolean(),reveal_answers:z.enum(['closed','attempt']),attempt_policy:z.literal('best')})})).handler(async({data})=>{const c=await context(data.token);requireGrant(c,'settings','e',['']);checked(await c.db.from('Evaluation_Settings').upsert({id:'main',config:data.config,updated_by:c.actor,updated_at:new Date().toISOString()}));await audit(c,'settings','main','save',data.config);return {ok:true};});

export const evaluationSaveGrant=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),grant:z.object({id:z.string().uuid().optional(),user_id:text.min(1),screen:z.string().max(50),team_id:text,actions:z.string().regex(/^[raed]*$/),general_access:z.boolean(),allow_self_approval:z.boolean()})})).handler(async({data})=>{const c=await context(data.token);if(c.actor!==MASTER_ID)throw new Error('إدارة منح المنظومة للمدير فقط');const u=checked(await c.db.from('Users').select('ID,Role').eq('ID',data.grant.user_id).single());if(u.Role!=='Leader')throw new Error('المنح الإدارية للقادة فقط');checked(await c.db.from('Evaluation_Permissions').upsert({...data.grant,granted_by:c.actor},{onConflict:'user_id,screen,team_id'}));await audit(c,'permission',data.grant.user_id,'save',data.grant);return {ok:true};});

export const evaluationAdjustment=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),id:z.string().uuid(),amount:z.number().min(-100000).max(100000),reason:text.min(1)})).handler(async({data})=>{const c=await context(data.token);const tx=checked(await c.db.from('Points_Transactions').select('*').eq('id',data.id).single());requireGrant(c,'points_approval','a',[tx.team_id]);if(tx.status!=='Approved'||data.amount===0)throw new Error('التصحيح لحركة معتمدة وبقيمة غير صفرية');checked(await c.db.from('Points_Transactions').insert({user_id:tx.user_id,category:tx.category,team_id:tx.team_id,module:'adjustment',amount:data.amount,description:data.reason,submitted_by:c.actor,season:tx.season,correction_of:tx.id,idempotency_key:crypto.randomUUID()}));return {ok:true};});