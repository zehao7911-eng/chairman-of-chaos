import assert from 'node:assert/strict';
import {EPISODES,profile,newRound,restoreRound,begin,tick,settle,saveRound,disturbance,clamp,balanceCue} from './core.mjs';
import {ChairHost} from './sdk.mjs';
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++};
function ride(round,control){
 check(begin(round),'ready starts');
 for(let i=0;i<4000&&round.phase==='ride';i++){
  round.input=control(round);
  tick(round,1/90);
 }
 check(round.result&&['celebrate','tumble'].includes(round.phase),'round resolves');
 for(let i=0;i<200;i++)tick(round,1/90);
 check(round.phase==='result','animation ends at receipt');
}
const smart=r=>clamp((-r.angle*4.0-r.velocity*2.7-disturbance(r))/2.4);
const p=profile();
for(let i=0;i<EPISODES.length;i++){
 let r=newRound(i);ride(r,smart);
 check(r.result.win&&r.result.stars===3,'balanced play clears episode');
 settle(r,p);check(p.unlocked===Math.min(EPISODES.length-1,i+1),'unlocks next episode');
 check(restoreRound(saveRound(r),p).phase==='result','result restores without awarding again');
}
const lost=newRound(4);ride(lost,()=>0);
check(!lost.result.win,'no input eventually ejects player');
for(let i=0;i<6;i++){
 const r=newRound(i);ride(r,r=>r.input+(balanceCue(r).direction*.66-r.input)*(1-Math.exp(-18/90)));
 check(r.result.win,'following the visible direction cue alone clears each ride');
 check(r.result.bestStreak>1.8,'stable play records a real streak');
}
const rescue=newRound();begin(rescue);rescue.angle=.7;tick(rescue,.01);
check(rescue.atRisk&&balanceCue(rescue).direction===-1,'right tilt clearly requests left correction');
rescue.angle=.1;rescue.velocity=0;tick(rescue,.01);tick(rescue,.01);
check(rescue.recoveries===1&&!rescue.atRisk,'recovery reward triggers once after returning safely');
const old=restoreRound({index:0,phase:'ride',t:3,steady:2,angle:.2},profile());
check(old.bestStreak===0&&old.recoveries===0&&old.t===3,'old checkpoint remains compatible');
const keep=restoreRound(saveRound({...rescue,t:3,streak:2,bestStreak:2.4}),profile());
check(keep.streak===2&&keep.bestStreak===2.4&&keep.recoveries===1,'new feedback stats survive checkpoint reload');
const resumed=newRound();begin(resumed);for(let i=0;i<190;i++){resumed.input=smart(resumed);tick(resumed,1/90)}
const saved=saveRound(resumed);const restored=restoreRound(saved,profile());
check(restored.phase==='ready'&&restored.t===saved.t&&restored.input===0,'checkpoint restores neutral ready pose');
ride(restored,smart);check(restored.result.win,'resumed round finishes');
function env(neonlib){let next=0,jobs=new Map();return {neonlib,jobs,setTimeout(fn){jobs.set(++next,fn);return next},clearTimeout(id){jobs.delete(id)}}}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
let starts=0,ends=0,like,comment,off=0,writes=[],rewards=profile();
const e=env();let support={};
const callbacks={
 status:v=>support=v,
 reward:key=>{if(!rewards[key])rewards[key]=true}
};
let host=new ChairHost(e,callbacks);
host.connect();host.start();
e.neonlib={};host.connect();
Object.assign(e.neonlib,{
 gameStart(){starts++},gameOver(){ends++},
 onLike:async fn=>{like=fn;return {code:0,data:{unsubscribe(){off++}}}},
 onComment:async fn=>{comment=fn;return {code:0,data:{unsubscribe(){off++}}}},
 loadUserGameState:async()=>({}),saveUserGameState:async value=>writes.push(value)
});
host.connect();await flush();
check(starts===1&&support.aurora&&support.ember,'late SDK connects active play and optional listeners');
like({project_id:'77',status:false,count:8});comment({project_id:77,content:'x'});comment({project_id:'77'});
check(!rewards.aurora&&!rewards.ember,'invalid callbacks and unlikes ignored');
like({project_id:'77',status:true,count:0});like({project_id:'77',status:true,count:9});
comment({project_id:'77',content:'',count:0});comment({project_id:'77',content:'again'});
check(rewards.aurora&&rewards.ember,'confirmed callbacks persist cosmetic rewards');
host.save({game:'chairman-of-chaos',v:1,profile:rewards,round:saved});await flush();
host.end();host.end();host.stop();
check(ends===1&&off===2&&writes.at(-1).game==='chairman-of-chaos','scoped checkpoint and one end, listeners removed');
host=new ChairHost(e,callbacks);host.connect();await flush();
check(starts===1,'restoring ready checkpoint does not start a fake round');
if(begin(restoreRound(saved,rewards)))host.start();
host.end();host.stop();check(starts===2&&ends===2&&off===4,'next real resumed action has one lifecycle pair');
let resolve,delayedOff=0,foreign=0;
const delayedEnv=env({onLike:()=>new Promise(r=>resolve=r)});
host=new ChairHost(delayedEnv);host.connect();host.stop();
resolve({code:0,data:{unsubscribe(){delayedOff++}}});await flush();
check(delayedOff===1,'late listener removes itself after exit');
const timeout=env({loadUserGameState:()=>new Promise(()=>{}),onComment:()=>new Promise(r=>resolve=r),saveUserGameState(){foreign++}});
host=new ChairHost(timeout);host.connect();host.save({game:'chairman-of-chaos',v:1});
for(const fn of [...timeout.jobs.values()])fn();
resolve({code:0,data:{unsubscribe(){delayedOff++}}});await flush();host.stop();
check(delayedOff===2&&!foreign,'timeouts and late unsubscribe guard unknown save state');
host=new ChairHost(env({gameStart:()=>Promise.reject(Error()),gameOver(){throw Error()},onLike:()=>Promise.reject(Error()),onComment:async()=>({code:-6}),loadUserGameState:async()=>({game:'foreign'}),saveUserGameState(){foreign++}}));
host.connect();host.start();host.end();host.save({game:'chairman-of-chaos',v:1});await flush();host.stop();
check(!foreign,'async failures and foreign state are isolated');
console.log('PASS '+checks+' gameplay, save and GameWave mock checks');
