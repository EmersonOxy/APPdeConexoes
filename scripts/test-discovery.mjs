import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db, alice, bob, carol, older, banned, unconfirmed, incomplete, asUser, rpc, block } from './connections-fixture.mjs';
async function discovery(filters={},seen=[],selected=null) { return (await db.query('select * from public.duoeto_discovery($1,$2,$3)',[seen,filters,selected])).rows; }
await db.exec('reset role');
await db.query("update public.duoeto_profiles set interests=array['Jogos'],objectives=array['Amizade'],about='Sobre mim' where user_id=$1",[bob]);
await db.query("update public.duoeto_profiles set objectives=array['Namoro'] where user_id=$1",[carol]);
await asUser(alice);
let profiles=await discovery();
assert.ok(profiles.some(p=>p.user_id===bob));
assert.ok(profiles.some(p=>p.user_id===carol));
assert.ok(!profiles.some(p=>[alice,older,banned,unconfirmed,incomplete].includes(p.user_id)));
assert.deepEqual((await discovery({interest:'Jogos'})).map(p=>p.user_id),[bob]);
assert.deepEqual((await discovery({objective:'Namoro'})).map(p=>p.user_id),[carol]);
assert.deepEqual((await discovery({complete:true})).map(p=>p.user_id),[bob]);
assert.deepEqual((await discovery({min_age:51,max_age:70})).map(p=>p.user_id),[older]);
assert.deepEqual(await discovery({min_age:26,max_age:50}),[]);
assert.deepEqual(await discovery({min_score:1}),[]);
assert.deepEqual((await discovery({},[bob])).map(p=>p.user_id),[carol]);
assert.deepEqual((await discovery({},[],bob)).map(p=>p.user_id),[bob]);
for (const filters of [{min_age:17},{max_age:121},{min_age:40,max_age:20},{interest:'unknown'},{objective:'unknown'},{min_score:0},{min_score:6}])
 await assert.rejects(discovery(filters),/filtros/);
await rpc('rate',bob,{score:4,visibility:'private'});
const contact=(await rpc('send',bob,{body:'Contato'})).id;
assert.deepEqual(await discovery({},[],bob),[]);
await asUser(bob);await rpc('rate',alice,{score:4,visibility:'name'});
const chat=(await rpc('accept',contact)).id;
await asUser(alice);assert.deepEqual(await discovery({},[],bob),[]);
for(let i=0;i<5;i++) {
 await asUser(alice);await rpc('message',chat,{body:'Pergunta',request_id:randomUUID()});
 await asUser(bob);await rpc('message',chat,{body:'Resposta',request_id:randomUUID()});
}
await asUser(alice);
await rpc('rate_interaction',chat,{photos:5,conversation:5,respect:5,humor:5,visibility:'private'});
await rpc('close',chat);
assert.deepEqual((await discovery({min_score:4.5})).map(p=>p.user_id),[bob]);
assert.deepEqual(await discovery({min_score:5}),[]);
assert.ok((await discovery()).some(p=>p.user_id===carol));
profiles=await discovery();
for(const p of profiles) { assert.equal(p.birth_date,undefined);assert.equal(p.email,undefined);assert.equal(p.overall,undefined); }
await db.query('select public.duoeto_hide_profile($1)',[bob]);
assert.deepEqual(await discovery({},[],bob),[]);
await db.query('delete from public.duoeto_feed_hidden where owner_id=$1',[alice]);
await asUser(bob);await block(bob,alice);
await asUser(alice);assert.deepEqual(await discovery({},[],bob),[]);
for(const id of [banned,incomplete,unconfirmed,'']) {await asUser(id);await assert.rejects(discovery(),/Complete/);}
await db.exec('reset role; set role anon');
await assert.rejects(discovery(),/permission denied/);
await db.close();
console.log('PASS: filtros de idade/interesse/objetivo/completude/reputação, perfis em formação, limites, projeção privada e revalidação de histórico após contato/ocultação/bloqueio.');
