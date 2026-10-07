import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { db, alice, bob, carol, banned, incomplete, unconfirmed, asUser, rpc, block } from './connections-fixture.mjs';
const scores={photos:2,conversation:3,respect:4,humor:5,visibility:'private'};
await asUser(alice);
await rpc('rate',bob,{score:4,visibility:'private'});
const contact=(await rpc('send',bob,{body:'Olá'})).id;
await asUser(bob);
const chat=(await rpc('accept',contact)).id;
await asUser(alice);
assert.equal((await rpc('interaction',chat)).eligible,false);
await assert.rejects(rpc('rate_interaction',chat,scores),/cinco mensagens/);
for (let i=0;i<5;i++) {
  await asUser(alice); await rpc('message',chat,{body:'Pergunta',request_id:randomUUID()});
  if (i<4) { await asUser(bob); await rpc('message',chat,{body:'Resposta',request_id:randomUUID()}); }
}
await asUser(alice);
assert.equal((await rpc('interaction',chat)).eligible,false);
await assert.rejects(rpc('rate_interaction',chat,scores),/cinco mensagens/);
await asUser(bob); await rpc('message',chat,{body:'Resposta',request_id:randomUUID()});
await asUser(alice);
assert.equal((await rpc('interaction',chat)).eligible,true);
for (const payload of [{...scores,photos:0},{...scores,humor:6},{...scores,respect:2.5},{photos:5}, {...scores,visibility:'unknown'}])
  await assert.rejects(rpc('rate_interaction',chat,payload),/notas|privacidade/);
let status=await rpc('rate_interaction',chat,scores);
assert.equal(status.eligible,false); assert.equal(status.previous.humor,5);
let reputation=await rpc('reputation',bob);
assert.equal(reputation.interaction_count,1);
assert.equal(reputation.perception,3); assert.equal(reputation.experience,4); assert.equal(reputation.overall,3.5);
assert.deepEqual(reputation.reviews,[]);
await assert.rejects(rpc('rate_interaction',chat,scores),/sete dias/);
await rpc('close',chat);
await assert.rejects(rpc('rate_interaction',chat,scores),/sete dias/);
await db.exec('reset role');
await db.query("update duoeto_private.interaction_ratings set created_at=now()-interval '8 days' where author=$1",[alice]);
await asUser(alice);
await assert.rejects(rpc('rate_interaction',chat,{...scores,visibility:'profile'}),/privacidade/);
await rpc('rate_interaction',chat,{photos:5,conversation:5,respect:5,humor:5,visibility:'private'});
reputation=await rpc('reputation',bob);
assert.equal(reputation.interaction_count,1); assert.equal(reputation.overall,4.75);
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int as n from duoeto_private.interaction_ratings')).rows[0].n,2);
await asUser(bob);
await rpc('rate_interaction',chat,{...scores,visibility:'name'});
await rpc('rate',alice,{score:4,visibility:'name'});
reputation=await rpc('reputation',alice);
const review=reputation.reviews.find(r=>r.kind==='interaction');
assert.ok(review.id); assert.equal(review.profile_id,null); assert.equal(review.author,undefined);
assert.equal(reputation.overall,3.5);
await asUser(carol);
assert.equal((await rpc('reputation',alice)).locked,true);
await assert.rejects(rpc('interaction',chat),/indisponível/);
await assert.rejects(rpc('rate_interaction',chat,scores),/indisponível/);
await asUser(alice);
await assert.rejects(db.exec('select * from duoeto_private.current_interactions'),/permission denied/);
await assert.rejects(db.exec('select * from duoeto_private.interaction_ratings'),/permission denied/);
await assert.rejects(db.query('select duoeto_private.reputation_summary($1)',[bob]),/permission denied/);
await block(alice,bob);
await assert.rejects(rpc('interaction',chat),/indisponível/);
await asUser(bob);
await assert.rejects(rpc('interaction',chat),/indisponível/);
for (const id of [banned,incomplete,unconfirmed,'']) {
 await asUser(id); await assert.rejects(rpc('rate_interaction',chat,scores),/Complete/);
}
await db.exec('reset role; set role anon');
await assert.rejects(rpc('interaction',chat),/permission denied/);
await db.close();
console.log('PASS: cinco mensagens por pessoa, notas inteiras, encerramento, sete dias, privacidade imutável, histórico privado, substituição na média, fórmulas e autorização.');
