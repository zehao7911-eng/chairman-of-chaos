import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {EPISODES,newRound,begin,tick,disturbance,clamp} from './core.mjs';
const require=createRequire(import.meta.url),T=require('./vendor/three.min.js');
globalThis.window={THREE:T};
const context=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>context})};
const {OfficeView}=await import('./view.mjs');
const view=Object.assign(Object.create(OfficeView.prototype),{
 scene:new T.Scene(),camera:new T.PerspectiveCamera(),renderer:{render(){}},materials:new Map(),boxGeo:new T.BoxGeometry(),sphereGeo:new T.SphereGeometry(1,18,12)
});
let frames=0;
for(let i=0;i<EPISODES.length;i++)for(const smart of [true,false]){
 const r=newRound(i);view.render(r,null,false,1/60);begin(r);
 for(let step=0;step<1300&&r.phase!=='result';step++){
  r.input=smart?clamp((-r.angle*4-r.velocity*2.7-disturbance(r))/2.4):0;
  tick(r,1/60);view.render(r,null,false,1/60);view.world.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(view.hero);
  assert.ok(bounds.min.y>=.0,'human crossed the floor');
  if(r.phase==='tumble')assert.ok(bounds.min.y>=view.matTop-.0001,'ejected human crossed soft mat');
  assert.ok(Number.isFinite(bounds.max.y),'finite articulated mesh');
  frames++;
 }
}
console.log('PASS '+frames+' character poses across all six mounts, falls and wins');
