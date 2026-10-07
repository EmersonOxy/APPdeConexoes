import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
let handler,calls=[];let allowed=true;let passwordValid=true;
const code=stripTypeScriptTypes(await readFile(new URL('../supabase/functions/duoeto-username-login/index.ts',import.meta.url),'utf8'));
vm.runInNewContext(code,{Request,Response,JSON,Number,Deno:{serve:fn=>handler=fn,env:{get:key=>key==='SUPABASE_URL'?'https://test.invalid':'private-test-key'}},fetch:async(url,options)=>{
 calls.push({url,options});
 if(url.includes('duoeto_login_identity'))return Response.json(allowed?'hidden@example.invalid':null);
 return passwordValid?Response.json({access_token:'access',refresh_token:'refresh',user:{email:'hidden@example.invalid'}}):Response.json({error:'bad'}, {status:400});
}});
const request=body=>handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify(body)}));
let result=await request({username:'alice_test',password:'correct-password'});assert.equal(result.status,200);assert.deepEqual(await result.json(),{access_token:'access',refresh_token:'refresh'});
assert.equal(calls.length,2);assert.equal(JSON.parse(calls[1].options.body).email,'hidden@example.invalid');
passwordValid=false;result=await request({username:'alice_test',password:'wrong-password'});assert.equal(result.status,401);assert.ok(!(await result.text()).includes('hidden@'));
allowed=false;calls=[];result=await request({username:'unknown',password:'wrong-password'});assert.equal(result.status,401);assert.equal(calls.length,1);
calls=[];result=await request({username:'x',password:'a'});assert.equal(result.status,401);assert.equal(calls.length,0);
assert.equal((await handler(new Request('https://test.invalid'))).status,405);
console.log('PASS: login por usuário mantém e-mail privado, usa Auth para senha, não retorna dados no erro e valida entrada.');
