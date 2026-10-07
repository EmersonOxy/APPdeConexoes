import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db,alice,bob,carol,banned,unconfirmed,incomplete,asUser,rpc,safety,block} from './connections-fixture.mjs';
import {notificationLink} from '../lib/notification-links.ts';
const page=async(before=null)=>(await db.query('select public.duoeto_notification_page($1) result',[before])).rows[0].result;
const target=async(kind,id)=>(await db.query('select public.duoeto_message_target($1,$2) result',[kind,id])).rows[0].result;
await asUser(alice);await rpc('rate',bob,{score:4,visibility:'private'});
const contact=(await rpc('send',bob,{body:'Conteúdo privado'})).id;
await asUser(bob);const received=(await page()).items[0];
assert.equal(notificationLink(received),`/mensagens/contato/${contact}`);
assert.equal((await target('contact',contact)).id,contact);
assert.equal((await target('contact',contact)).body,undefined);
await asUser(carol);assert.equal(await target('contact',contact),null);assert.equal((await page()).items.length,0);
await asUser(bob);await rpc('rate',alice,{score:5,visibility:'private'});
const chat=(await rpc('accept',contact)).id;
await asUser(alice);const accepted=(await page()).items[0];
assert.equal(notificationLink(accepted),`/mensagens?conversa=${chat}`);
assert.equal((await target('contact',contact)).conversation_id,chat);
assert.equal((await target('conversation',chat)).id,chat);
const report=(await safety('report',bob,{subject:'profile',reason:'spam',request_id:randomUUID()})).id;
await db.exec('reset role');await db.query("update duoeto_private.reports set status='reviewing' where id=$1",[report]);
await asUser(alice);const update=(await page()).items[0];assert.equal(notificationLink(update),`/denuncias?protocolo=${report}`);
assert.equal((await target('report',report)).id,report);assert.equal((await target('report',report)).accused,undefined);
await asUser(bob);assert.equal(await target('report',report),null);
await asUser(carol);assert.equal(await target('conversation',chat),null);
// IDs exceed Number.MAX_SAFE_INTEGER; cursor pagination remains exact despite tied timestamps.
await db.exec('reset role');await db.exec("alter sequence duoeto_private.notifications_id_seq restart with 9007199254740992");
await db.query("insert into duoeto_private.notifications(recipient,peer,kind,target,created_at) select $1,$2,'message',$3,'2026-01-01' from generate_series(1,106)",[bob,alice,chat]);
await asUser(bob);const first=await page();assert.equal(first.items.length,30);assert.equal(first.has_more,true);assert.equal(first.unread,107);assert.equal(typeof first.items[0].id,'string');assert.equal(first.items[0].sort_id,undefined);
let all=[...first.items],cursor=all.at(-1).id;
// A later arrival must not duplicate/skip records in the older-page traversal.
await asUser(alice);await rpc('message',chat,{body:'Não expor este texto',request_id:randomUUID()});
await asUser(bob);
while(true){const next=await page(cursor);all.push(...next.items);if(!next.has_more)break;cursor=next.items.at(-1).id;}
assert.equal(all.length,107);assert.equal(new Set(all.map(n=>n.id)).size,107);
assert.ok(all.every(n=>n.body===undefined&&n.peer===undefined&&n.recipient===undefined));
assert.equal(notificationLink(first.items[0]),`/mensagens?conversa=${chat}`);
const ownId=first.items[0].id;
await asUser(carol);await safety('read_notification',null,{id:ownId});
await asUser(bob);assert.equal((await page()).unread,108);await safety('read_notification',null,{id:ownId});assert.equal((await page()).unread,107);
await block(bob,alice);assert.equal((await page()).items.length,0);assert.equal((await page()).unread,0);
assert.equal(await target('conversation',chat),null);assert.equal(await target('contact',contact),null);
await asUser(alice);assert.equal((await page()).items.length,1);assert.equal((await target('report',report)).id,report);
for(const id of [banned,unconfirmed,incomplete,'']){await asUser(id);await assert.rejects(page(),/Complete/);await assert.rejects(target('conversation',chat),/Complete/);}
await db.exec('reset role; set role anon');await assert.rejects(page(),/permission denied/);await assert.rejects(target('conversation',chat),/permission denied/);
await db.close();console.log('PASS: histórico >100, cursores bigint, chegada entre páginas, contagem global, destinos privados de contato/conversa/denúncia e bloqueios.');
