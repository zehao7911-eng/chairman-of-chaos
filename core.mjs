export const EPISODES=[
 {name:'The Probation Period',mount:'chair',room:0,duration:12,power:.48,quip:'THIS MEETING COULD HAVE BEEN AN EMAIL.'},
 {name:'Paper Jam',mount:'printer',room:0,duration:13,power:.58,quip:'PC LOAD LETTER.'},
 {name:'Highly Caffeinated',mount:'mug',room:1,duration:14,power:.64,quip:'DECAF WAS NEVER AN OPTION.'},
 {name:'Growth Mindset',mount:'plant',room:1,duration:14,power:.71,quip:'TOUCH GRASS. PROFESSIONALLY.'},
 {name:'Executive Decision',mount:'throne',room:2,duration:15,power:.77,quip:'PROMOTED TO FLOOR MANAGER.'},
 {name:'Mandatory Fun',mount:'disco',room:2,duration:16,power:.82,quip:'TEAM BUILDING HAS LEFT THE CHAT.'}
];
export const clamp=(value,min=-1,max=1)=>Math.max(min,Math.min(max,value));
export function profile(value={}){
 return {
  unlocked:clamp(Number.isInteger(value.unlocked)?value.unlocked:0,0,EPISODES.length-1),
  best:EPISODES.map((_,i)=>clamp(Number(value.best?.[i])||0,0,3)),
  music:value.music!==false,sound:value.sound!==false,
  aurora:value.aurora===true,ember:value.ember===true
 };
}
export function newRound(index=0){
 return {index,phase:'ready',t:0,angle:0,velocity:0,input:0,danger:0,steady:0,streak:0,bestStreak:0,recoveries:0,atRisk:false,result:null};
}
export function restoreRound(value,progress){
 if(!value||!Number.isInteger(value.index)||value.index<0||value.index>progress.unlocked)return newRound(progress.unlocked);
 const round=newRound(value.index);
 if(value.phase==='result'&&value.result&&typeof value.result.win==='boolean'&&Number.isFinite(value.result.steady)){
  round.phase='result';
  round.t=EPISODES[round.index].duration;
  round.result={win:value.result.win,steady:clamp(value.result.steady,0,1),stars:clamp(Number(value.result.stars)||0,0,3),bestStreak:clamp(Number(value.result.bestStreak)||0,0,16),recoveries:clamp(Number(value.result.recoveries)||0,0,100)};
 }else if(value.phase==='ride'&&Number.isFinite(value.t)){
  round.phase='ready';
  round.t=clamp(value.t,0,EPISODES[round.index].duration-.01);
  round.angle=clamp(Number(value.angle)||0,-.8,.8);
  round.steady=clamp(Number(value.steady)||0,0,round.t);
  round.streak=clamp(Number(value.streak)||0,0,round.t);
  round.bestStreak=clamp(Number(value.bestStreak)||0,0,round.t);
  round.recoveries=clamp(Number(value.recoveries)||0,0,100);
  round.atRisk=value.atRisk===true;
 }
 return round;
}
export function begin(round){
 if(round.phase!=='ready')return false;
 round.phase='ride';
 round.input=0;
 return true;
}
export function disturbance(round){
 const e=EPISODES[round.index],t=round.t;
 return e.power*(Math.sin(t*2.1+.55)+.51*Math.sin(t*4.2+1.1)+.25*Math.sin(t*7.1+round.index*.7));
}
export function tick(round,dt){
 if(round.phase==='ride'){
  round.t+=dt;
  const acceleration=disturbance(round)+round.angle*.46+round.input*2.4-round.velocity*1.5;
  round.velocity=clamp(round.velocity+acceleration*dt,-2,2);
  round.angle+=round.velocity*dt;
  if(Math.abs(round.angle)<.31){round.steady+=dt;round.streak+=dt;round.bestStreak=Math.max(round.bestStreak,round.streak)}
  else round.streak=0;
  if(Math.abs(round.angle)>.63)round.atRisk=true;
  if(round.atRisk&&Math.abs(round.angle)<.23&&Math.abs(round.velocity)<.5){round.atRisk=false;round.recoveries++}
  if(Math.abs(round.angle)>.88)round.danger+=dt;
  else round.danger=Math.max(0,round.danger-dt*1.3);
  const win=round.t>=EPISODES[round.index].duration;
  if(win||round.danger>.54){
   const steady=clamp(round.steady/Math.max(.01,round.t),0,1);
   round.result={win,steady,stars:win?(steady>.78?3:steady>.48?2:1):0,bestStreak:round.bestStreak,recoveries:round.recoveries};
   round.phase=win?'celebrate':'tumble';
   round.effect=0;
   round.input=0;
   return 'finish';
  }
 }else if(round.phase==='tumble'||round.phase==='celebrate'){
  round.effect+=dt;
  if(round.effect>2.1){round.phase='result';return 'result'}
 }
 return '';
}
export function settle(round,progress){
 if(!round.result)return;
 progress.best[round.index]=Math.max(progress.best[round.index],round.result.stars);
 progress.unlocked=Math.max(progress.unlocked,Math.min(EPISODES.length-1,round.index+1));
}
export function neutralize(round){round.input=0}
export function balanceCue(round){
 const predicted=round.angle+round.velocity*.48;
 return {direction:Math.abs(predicted)>.20?(predicted>0?-1:1):0,danger:clamp((Math.abs(round.angle)-.48)/.42,0,1),tier:Math.min(3,Math.floor((round.streak||0)/1.8))};
}
export function saveRound(round){
 if(round.phase==='tumble'||round.phase==='celebrate')return {...round,phase:'result',input:0};
 return {...round,input:0};
}
