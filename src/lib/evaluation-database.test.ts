import { describe, test, expect, afterAll } from 'vitest';
import postgres from 'postgres';

const url=process.env['SUPABASE_DB_URL'];
const sql=url?postgres(url,{max:1,ssl:'require'}):null;
afterAll(async()=>{if(sql)await sql.end();});
describe.skipIf(!sql)('Real evaluation database rules (rolled back)',()=>{
 test('batch scoring, official-only totals, rejection and immutable history',async()=>{
  if(!sql)return;
  let verified=false;
  try{await sql.begin(async tx=>{
   const id=crypto.randomUUID(),uid=`TEST-${crypto.randomUUID()}`;
   await tx`INSERT INTO public."Users"("ID","First_Name","Role","User_Type","Team_ID","Status") VALUES(${uid},'Temporary evaluation acceptance test','Member','عضو','test-team','Active')`;
   await tx`INSERT INTO public."Evaluation_Activities"(id,module,title,audience,team_ids,starts_at,ends_at,state,created_by,attendance_points) VALUES(${id},'church','Temporary database acceptance test','Member',ARRAY['test-team'],now()-interval '1 hour',now()+interval '1 hour','Published','MASTER-ADMIN',10)`;
   const rows=await tx`SELECT public.evaluation_submit(${id}::uuid,'MASTER-ADMIN',${tx.json([{user_id:uid,attendance_status:'Present',answers:{}}])}::jsonb) AS count`;
   expect(rows[0].count).toBe(1);
   let balance=await tx`SELECT coalesce(sum(amount),0) AS total FROM public."Points_Transactions" WHERE user_id=${uid} AND status='Approved'`;expect(Number(balance[0].total)).toBe(0);
   const points=await tx`SELECT * FROM public."Points_Transactions" WHERE user_id=${uid}`;expect(Number(points[0].amount)).toBe(10);expect(points[0].status).toBe('Pending');
   await tx`SELECT public.review_points_transaction(${points[0].id}::uuid,'MASTER-ADMIN',true,'')`;
   balance=await tx`SELECT coalesce(sum(amount),0) AS total FROM public."Points_Transactions" WHERE user_id=${uid} AND status='Approved'`;expect(Number(balance[0].total)).toBe(10);
   const audit=await tx`SELECT action FROM public."Points_Audit" WHERE transaction_id=${points[0].id} ORDER BY created_at`;expect(audit.map(a=>a.action).sort()).toEqual(['Approved','Submitted']);
   await expect(tx.savepoint(async s=>{await s`SELECT public.evaluation_submit(${id}::uuid,'MASTER-ADMIN',${s.json([{user_id:uid,attendance_status:'Present'}])}::jsonb)`;})).rejects.toThrow();
   await expect(tx.savepoint(async s=>{await s`SELECT public.review_points_transaction(${points[0].id}::uuid,'MASTER-ADMIN',true,'')`;})).rejects.toThrow();
   await expect(tx.savepoint(async s=>{await s`UPDATE public."Points_Transactions" SET amount=99 WHERE id=${points[0].id}`;})).rejects.toThrow();
   await expect(tx.savepoint(async s=>{await s`DELETE FROM public."Points_Audit" WHERE transaction_id=${points[0].id}`;})).rejects.toThrow();
   await expect(tx.savepoint(async s=>{await s`SELECT public.evaluation_submit(${id}::uuid,'unassigned-leader',${s.json([{user_id:uid,attendance_status:'Present'}])}::jsonb)`;})).rejects.toThrow();
   verified=true;throw new Error('ROLLBACK_ACCEPTANCE_TEST');
  });}catch(e){if(!(e instanceof Error)||e.message!=='ROLLBACK_ACCEPTANCE_TEST')throw e;}
  expect(verified).toBe(true);
 });
 test('competition best attempt grants once and server clock rejects closed submissions',async()=>{
  if(!sql)return;let verified=false;
  try{await sql.begin(async tx=>{
   const id=crypto.randomUUID(),uid=`TEST-${crypto.randomUUID()}`;
   await tx`INSERT INTO public."Users"("ID","Role","Team_ID","Status") VALUES(${uid},'Member','test-team','Active')`;
   await tx`INSERT INTO public."Evaluation_Activities"(id,module,title,audience,team_ids,starts_at,ends_at,state,created_by,max_attempts) VALUES(${id},'marathon','Temporary marathon acceptance test','Member',ARRAY['test-team'],now()-interval '1 hour',now()+interval '1 hour','Published','MASTER-ADMIN',2)`;
   const qs=await tx`INSERT INTO public."Evaluation_Criteria"(activity_id,title,points,options,correct_option) VALUES(${id},'Test question',10,'["A","B"]',0) RETURNING id`;
   await tx`SELECT public.evaluation_submit(${id}::uuid,${uid},${tx.json([{user_id:uid,answers:{[qs[0].id]:1}}])}::jsonb)`;
   await tx`SELECT public.evaluation_submit(${id}::uuid,${uid},${tx.json([{user_id:uid,answers:{[qs[0].id]:0}}])}::jsonb)`;
   const before=await tx`SELECT count(*) AS n FROM public."Points_Transactions" WHERE user_id=${uid}`;expect(Number(before[0].n)).toBe(0);
   await expect(tx.savepoint(async s=>{await s`SELECT public.evaluation_submit(${id}::uuid,${uid},${s.json([{user_id:uid,answers:{}}])}::jsonb)`;})).rejects.toThrow();
   await tx`UPDATE public."Evaluation_Activities" SET closed_at=now() WHERE id=${id}`;
   await tx`SELECT public.evaluation_finalize(${id}::uuid)`;await tx`SELECT public.evaluation_finalize(${id}::uuid)`;
   const points=await tx`SELECT amount,status FROM public."Points_Transactions" WHERE user_id=${uid}`;expect(points).toHaveLength(1);expect(Number(points[0].amount)).toBe(10);expect(points[0].status).toBe('Pending');
   await expect(tx.savepoint(async s=>{await s`SELECT public.evaluation_submit(${id}::uuid,${uid},${s.json([{user_id:uid,answers:{}}])}::jsonb)`;})).rejects.toThrow();
   verified=true;throw new Error('ROLLBACK_ACCEPTANCE_TEST');
  });}catch(e){if(!(e instanceof Error)||e.message!=='ROLLBACK_ACCEPTANCE_TEST')throw e;}
  expect(verified).toBe(true);
 });
 test('self approval and empty rejection reason are denied',async()=>{
  if(!sql)return;let verified=false;
  try{await sql.begin(async tx=>{
   const actor=`TEST-${crypto.randomUUID()}`,uid=`TEST-${crypto.randomUUID()}`;
   await tx`INSERT INTO public."Evaluation_Permissions"(user_id,screen,actions,general_access,granted_by) VALUES(${actor},'points_approval','re',true,'MASTER-ADMIN')`;
   const points=await tx`INSERT INTO public."Points_Transactions"(user_id,category,team_id,module,amount,description,submitted_by,idempotency_key) VALUES(${uid},'Member','test-team','church',10,'Temporary review test',${actor},${crypto.randomUUID()}) RETURNING id`;
   await expect(tx.savepoint(async s=>{await s`SELECT public.review_points_transaction(${points[0].id}::uuid,${actor},true,'')`;})).rejects.toThrow();
   await tx`UPDATE public."Evaluation_Permissions" SET allow_self_approval=true WHERE user_id=${actor}`;
   await expect(tx.savepoint(async s=>{await s`SELECT public.review_points_transaction(${points[0].id}::uuid,${actor},false,'')`;})).rejects.toThrow();
   await tx`SELECT public.review_points_transaction(${points[0].id}::uuid,${actor},false,'Not eligible')`;
   const total=await tx`SELECT coalesce(sum(amount),0) AS n FROM public."Points_Transactions" WHERE user_id=${uid} AND status='Approved'`;expect(Number(total[0].n)).toBe(0);
   verified=true;throw new Error('ROLLBACK_ACCEPTANCE_TEST');
  });}catch(e){if(!(e instanceof Error)||e.message!=='ROLLBACK_ACCEPTANCE_TEST')throw e;}
  expect(verified).toBe(true);
 });
});