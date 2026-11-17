import { test, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

test.skipIf(!process.env['SUPABASE_SERVICE_ROLE_KEY'])('real atomic scoring and review rules with all test data rolled back', async()=>{
 const url=process.env['SUPABASE_URL'];const key=process.env['SUPABASE_SERVICE_ROLE_KEY'];
 if(!url||!key)throw new Error('Protected test configuration missing');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const headers=new Headers(init?.headers);if(key.startsWith('sb_'))headers.delete('Authorization');headers.set('apikey',key);return fetch(input,{...init,headers});}}});
 const {data,error}=await client.rpc('evaluation_acceptance_test');
 expect(error).toBeNull();
 expect(data).toEqual({attendance_award:10,pending_official:0,approved_official:10,audit_events:2,marathon_best:10,marathon_awards:1,duplicate_approval_denied:true,duplicate_attendance_denied:true,immutable_history:true,attempt_limit_enforced:true,all_test_data_rolled_back:true});
});

test.skipIf(!process.env['SUPABASE_SERVICE_ROLE_KEY'])('team boundaries, rejection policy and weekly template recurrence are enforced atomically', async()=>{
 const url=process.env['SUPABASE_URL'];const key=process.env['SUPABASE_SERVICE_ROLE_KEY'];
 if(!url||!key)throw new Error('Protected test configuration missing');
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const headers=new Headers(init?.headers);if(key.startsWith('sb_'))headers.delete('Authorization');headers.set('apikey',key);return fetch(input,{...init,headers});}}});
 const {data,error}=await client.rpc('evaluation_extended_acceptance_test');
 expect(error).toBeNull();
 expect(data?.team_boundary).toBe(true);
 expect(data?.rejection_reason).toBe(true);
 expect(data?.rejected_official).toBe(0);
 expect(data?.weekly_repeat_denied).toBe(true);
 expect(data?.scoped_draft_delete).toBe(true);
 expect(data?.rolled_back).toBe(true);
});
