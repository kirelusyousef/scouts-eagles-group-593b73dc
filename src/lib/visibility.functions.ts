import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {loadUser,verifySessionToken,MASTER_ID} from './session.server';
import {ADMIN_SCREENS,MEMBER_SCREENS} from './db';
import {EVALUATION_SCREENS} from './evaluation-types';
export const VISIBILITY_SCREENS=[...MEMBER_SCREENS,...ADMIN_SCREENS,...EVALUATION_SCREENS.map(s=>({key:`evaluation_${s.key}`,label:`التقييم: ${s.label}`}))];
async function checkedContext(token:string,admin=false){
 const session=await verifySessionToken(token);if(!session)throw new Error('سجّل الدخول مجدداً');
 const user=await loadUser(session.userId);if(!user||['Pending','Suspended'].includes(String(user.Status)))throw new Error('الحساب غير متاح');
 if(admin&&session.userId!==MASTER_ID)throw new Error('إدارة الظهور للمدير فقط');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');return {db:supabaseAdmin as any,user,actor:session.userId};
}
export const visibilityLoad=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),admin:z.boolean().default(false)})).handler(async({data})=>{
 const c=await checkedContext(data.token,data.admin);const {data:rules,error}=await c.db.from('Screen_Visibility_Rules').select('*');if(error)throw new Error('تعذر تحميل قواعد الظهور');
 return {rules:rules||[],actor:c.actor};
});
export const visibilitySave=createServerFn({method:'POST'}).inputValidator(z.object({token:z.string(),scope:z.enum(['all','role','education','team','committee','user']),value:z.string().max(200),rows:z.array(z.object({screen:z.string(),visible:z.boolean().nullable()})).max(150)})).handler(async({data})=>{
 const c=await checkedContext(data.token,true);
 if(data.scope!=='all'&&!data.value)throw new Error('اختر الفئة المطلوبة');
 if(data.scope==='role'&&!['Leader','Member'].includes(data.value))throw new Error('فئة غير صحيحة');
 if(data.rows.some(r=>!VISIBILITY_SCREENS.some(s=>s.key===r.screen)))throw new Error('شاشة غير معروفة');
 const {error}=await c.db.rpc('save_screen_visibility',{p_actor:c.actor,p_scope:data.scope,p_value:data.scope==='all'?'':data.value,p_rows:data.rows});if(error)throw new Error('تعذر حفظ قواعد الظهور');return {ok:true};
});