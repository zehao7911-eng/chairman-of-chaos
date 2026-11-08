import {EPISODES,clamp,profile,newRound,restoreRound,begin,tick,settle,neutralize,saveRound,balanceCue} from './core.mjs';
import {OfficeView} from './view.mjs';
import {ChairHost} from './sdk.mjs';
import {OfficeMusic} from './music.mjs';
const $=id=>document.getElementById(id);
const saveKey='chairman-of-chaos-v1';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const landscape=matchMedia('(orientation:landscape) and (max-height:540px)');
let disk;
try{disk=JSON.parse(localStorage.getItem(saveKey)||'null')}catch{}
const valid=value=>value?.game==='chairman-of-chaos'&&value.v===1&&value.profile&&typeof value.profile==='object';
let progress=profile(valid(disk)?disk.profile:undefined);
let round=restoreRound(valid(disk)?disk.round:null,progress);
let home=true,paused=false,settings=false,dirty=false,view,audio,music;
let last=0,checkpoint=0,toastUntil=0,pointer=null,keyboard=0,held=0,targetInput=0,support={},seenTier=0,seenRecovery=0;
function snapshot(){return {game:'chairman-of-chaos',v:1,profile:progress,round:saveRound(round)}}
const host=new ChairHost(window,{
 status(value){support=value;if(settings)drawPanel()},
 reward(key){if(progress[key])return;progress[key]=true;save();toast(key==='aurora'?'LILAC FRIDAY UNLOCKED':'GOLDEN PARACHUTE UNLOCKED');sound([480,620,810]);if(settings)drawPanel()},
 load(value){
  if(!valid(value))return;
  const cloud=profile(value.profile);
  if(!dirty&&!valid(disk)){
   progress=cloud;
   round=restoreRound(value.round,progress);
  }else{
   progress.unlocked=Math.max(progress.unlocked,cloud.unlocked);
   progress.best=progress.best.map((stars,i)=>Math.max(stars,cloud.best[i]));
   progress.aurora||=cloud.aurora;progress.ember||=cloud.ember;
  }
  save();
  if(home||paused)drawPanel();
 }
});
function save(){
 dirty=true;
 const value=snapshot();
 try{localStorage.setItem(saveKey,JSON.stringify(value))}catch{}
 host.save(value);
}
function unlock(){
 try{
  audio??=new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state!=='running')audio.resume().catch(()=>{});
  if(progress.music)music??=new OfficeMusic(audio);
 }catch{}
}
function sound(notes,type='triangle'){
 if(!progress.sound||!audio)return;
 const at=audio.currentTime;
 try{notes.forEach((hz,i)=>{
  const o=audio.createOscillator(),g=audio.createGain(),start=at+i*.075;
  o.type=type;o.frequency.setValueAtTime(hz,start);
  o.frequency.exponentialRampToValueAtTime(hz*.76,start+.15);
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(.047,start+.015);g.gain.exponentialRampToValueAtTime(.0001,start+.17);
  o.connect(g);g.connect(audio.destination);o.start(start);o.stop(start+.18);
 })}catch{}
}
function toast(text){$('toast').textContent=text;toastUntil=performance.now()+1600}
const button=(label,id,style='primary',icon='→')=>'<button type="button" class="'+style+'" data-action="'+id+'"><span>'+label+'</span><span aria-hidden="true">'+icon+'</span></button>';
function drawPanel(){
 const e=EPISODES[round.index];
 $('chapter').textContent=(round.index+1)+' / '+EPISODES.length;
 $('acts').innerHTML=EPISODES.map((act,i)=>'<i class="'+(i===round.index?'current':i<=progress.unlocked?'seen':'')+'" aria-label="Shift '+(i+1)+'"></i>').join('');
 $('menu').setAttribute('aria-label',round.phase==='ride'&&!home?'Pause':'Open settings');
 $('hud').hidden=home||round.phase==='ready'||round.phase==='result'||settings;
 $('controls').hidden=home||paused||settings||round.phase!=='ride';
 let html='';
 if(settings){
  html='<small>HR approved settings</small><h2>Take a break</h2><div class="row">'+button(progress.sound?'SFX on':'SFX off','sound','secondary','◖')+button(progress.music?'Music on':'Music off','music','secondary','♪')+'</div>'+
   '<div class="receipt"><span>BEST STARS<b>'+progress.best.reduce((a,b)=>a+b,0)+' / 18</b></span><span>ACTS SEEN<b>'+(progress.unlocked+1)+' / 6</b></span></div>';
  if(support.aurora&&!progress.aurora)html+='<p>Like this game in GameWave for the Lilac Friday suit.</p>';
  if(support.ember&&!progress.ember)html+='<p>Post a direct comment in GameWave for the Golden Parachute suit.</p>';
  html+=button(home?'Back':'Resume','resume');
 }else if(paused){
  html='<small>Break time</small><h2>Paused</h2>'+button('Resume','resume');
 }else if(home){
  html='<small>THE OFFICE RODEO</small><h1>Chairman<br>of Chaos</h1><p>Drag left or right to lean. Keep the dot inside mint.</p>'+
   button(round.phase==='result'?'Continue the chaos':round.t?'Resume shift':'Clock in','enter')+
   '<div class="row">'+button('Settings','settings','secondary','♪')+'</div>';
 }else if(round.phase==='ready'){
  html='<small>Shift '+(round.index+1)+' / 6 · '+e.duration+' seconds</small><h2>'+e.name+'</h2><p>Follow the arrow. Lean against the wobble.</p>'+button(round.t?'Resume rodeo':'Take a seat','start');
 }else if(round.phase==='result'){
  const last=round.index===EPISODES.length-1;
  html='<small>SHIFT '+(round.index+1)+' COMPLETE</small><h2>'+(last?'Clocking out.':round.result.win?'Still employed.':'Unexpected promotion.')+'</h2>'+
   '<div class="stars" aria-label="'+round.result.stars+' stars">'+'★'.repeat(round.result.stars)+'☆'.repeat(3-round.result.stars)+'</div>'+
   '<p>'+e.quip+'</p><div class="receipt"><span>STEADY<b>'+Math.round(round.result.steady*100)+'%</b></span><span>BEST STREAK<b>'+Number(round.result.bestStreak||0).toFixed(1)+' s</b></span><span>BEST<b>'+progress.best[round.index]+' / 3</b></span></div>'+
   button(last?'New shift':'Next questionable seat',last?'restart':'next')+
   '<div class="row">'+button('Retry','retry','secondary','↻')+button('Settings','settings','secondary','♪')+'</div>';
 }
 $('panel').innerHTML=html;
}
function release(){
 pointer=null;held=0;keyboard=0;targetInput=0;neutralize(round);
}
function freeze(){
 release();music?.update(false);
 if(!home&&round.phase==='ride'){paused=true;save();drawPanel()}
}
$('panel').addEventListener('click',event=>{
 const control=event.target.closest('[data-action]');
 if(!control)return;
 const id=control.dataset.action;
 unlock();
 if(id==='sound'){progress.sound=!progress.sound;save();drawPanel();return}
 if(id==='music'){progress.music=!progress.music;if(progress.music)unlock();else music?.update(false);save();drawPanel();return}
 if(id==='settings'){settings=true;if(!home&&round.phase==='ride')paused=true;release();music?.update(false);drawPanel();return}
 if(id==='resume'){settings=false;paused=false;drawPanel();return}
 if(id==='enter'){home=false;drawPanel();return}
 if(id==='start'&&begin(round)){
  seenTier=balanceCue(round).tier;seenRecovery=round.recoveries||0;
  const jingles=[[330,440],[740,440,740],[220,330,440],[390,520,650],[330,415,495,660],[440,660,550,880]];
  host.connect();host.start();save();sound(jingles[round.index],round.index===1?'square':'triangle');home=false;drawPanel();return;
 }
 if(round.phase!=='result')return;
 if(id==='next'&&round.index<EPISODES.length-1)round=newRound(round.index+1);
 if(id==='retry')round=newRound(round.index);
 if(id==='restart')round=newRound();
 home=false;release();save();drawPanel();
});
$('menu').addEventListener('click',()=>{
 unlock();release();music?.update(false);
 if(!home&&round.phase==='ride'){paused=!paused;settings=false}else settings=!settings;
 save();drawPanel();
});
const pad=$('pad');
function inputAt(event){
 const rect=pad.getBoundingClientRect();
 targetInput=clamp((event.clientX-rect.left)/rect.width*2-1);
}
pad.addEventListener('pointerdown',event=>{
 if(round.phase!=='ride'||paused)return;
 unlock();pointer=event.pointerId;pad.setPointerCapture(pointer);inputAt(event);event.preventDefault();
});
pad.addEventListener('pointermove',event=>{if(event.pointerId===pointer)inputAt(event)});
for(const name of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(name,release);
for(const [id,direction] of [['left',-1],['right',1]]){
 $(id).addEventListener('pointerdown',event=>{
  if(round.phase!=='ride'||paused)return;
  unlock();held=direction*.66;targetInput=held;$(id).setPointerCapture(event.pointerId);
 });
 for(const eventName of ['pointerup','pointercancel','lostpointercapture'])$(id).addEventListener(eventName,release);
}
window.addEventListener('keydown',event=>{
 if(event.repeat||!['ArrowLeft','ArrowRight','a','d'].includes(event.key)||round.phase!=='ride'||paused)return;
 event.preventDefault();unlock();keyboard=event.key==='ArrowLeft'||event.key==='a'?-.66:.66;targetInput=keyboard;
});
window.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','a','d'].includes(event.key))release()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)freeze()});
landscape.addEventListener('change',()=>{if(landscape.matches)freeze()});
window.addEventListener('pagehide',()=>{freeze();save();host.stop()});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
function frame(now){
 requestAnimationFrame(frame);
 const dt=Math.min(.06,(now-(last||now))/1000);last=now;
 if(document.hidden||landscape.matches)return;
 music?.update(progress.music&&!paused&&!settings&&!home&&round.phase==='ride');
 if(toastUntil&&now>toastUntil){$('toast').textContent='';toastUntil=0}
 if(!home&&!paused&&!settings){
  if(held||keyboard)targetInput=held||keyboard;
  if(round.phase==='ride')round.input+=(targetInput-round.input)*(1-Math.exp(-dt*18));
  const e=tick(round,dt);
  const cue=balanceCue(round);
  if(round.phase==='ride'){
   if(cue.tier>seenTier){sound([460+cue.tier*90,680+cue.tier*70]);toast(['','NICE & STEADY','SMOOTH OPERATOR','UNSHAKEABLE'][cue.tier]);}
   if(round.recoveries>seenRecovery){toast('SAVED IT!');sound([340,570,760]);navigator.vibrate?.(12)}
   seenTier=cue.tier;seenRecovery=round.recoveries;
  }
  if(e==='finish'){
   settle(round,progress);host.end();release();save();music?.update(false);drawPanel();
   toast(round.result.win?'EMPLOYEE OF THE MINUTE':EPISODES[round.index].quip);
   sound(round.result.win?[440,550,660,880]:[260,180,120,80],round.result.win?'triangle':'sine');
   navigator.vibrate?.(round.result.win?15:35);
  }
  if(e==='result')drawPanel();
  if(round.phase==='ride'&&now-checkpoint>900){save();checkpoint=now}
 }
 $('job').textContent=EPISODES[round.index].name.toUpperCase();
 $('time').textContent=Math.max(0,EPISODES[round.index].duration-round.t).toFixed(1)+' s';
 $('progress').style.width=clamp(round.t/EPISODES[round.index].duration,0,1)*100+'%';
 $('dot').style.left=(50+clamp(round.angle)*45)+'%';
 $('dot').style.background=Math.abs(round.angle)>.70?'#c96c59':'#334c56';
 $('thumb').style.left=(50+round.input*34)+'%';
 const cue=balanceCue(round);
 $('game').style.setProperty('--danger',cue.danger.toFixed(2));
 $('left').classList.toggle('suggested',cue.direction===-1);
 $('right').classList.toggle('suggested',cue.direction===1);
 $('left').classList.toggle('pressed',round.input<-.15);
 $('right').classList.toggle('pressed',round.input>.15);
 $('cue').textContent=cue.direction<0?'‹ LEAN LEFT':cue.direction>0?'LEAN RIGHT ›':cue.tier?'STEADY ×'+cue.tier:'STAY CENTERED';
 $('cue').dataset.mode=cue.danger>.4?'danger':cue.direction?'correct':'steady';
 $('streak').style.width=clamp((round.streak||0)/5.4,0,1)*100+'%';
 pad.setAttribute('aria-valuenow',Math.round(round.input*100));
 const outfit=progress.ember?'ember':progress.aurora?'aurora':null;
 view.render(round,outfit,reduced.matches,paused?0:dt);
}
try{
 view=new OfficeView($('stage'));drawPanel();host.poll();requestAnimationFrame(frame);
}catch(error){
 console.error(error);
 $('panel').innerHTML='<h2>3D unavailable</h2><p>This game needs WebGL. Open it in a browser with hardware acceleration enabled.</p>';
}

