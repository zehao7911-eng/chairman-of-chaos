import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {EPISODES,newRound} from './core.mjs';
const require=createRequire(import.meta.url),T=require('./vendor/three.min.js');
globalThis.window={THREE:T};
const context=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>context})};
const {OfficeView}=await import(process.env.CHAIR_VIEW||'./view.mjs');
const view=Object.assign(Object.create(OfficeView.prototype),{
 scene:new T.Scene(),camera:new T.PerspectiveCamera(),renderer:{render(){}},materials:new Map(),boxGeo:new T.BoxGeometry(),sphereGeo:new T.SphereGeometry(1,18,12)
});
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function shape(mesh,inverse){
 const matrix=inverse.clone().multiply(mesh.matrixWorld),points=[],position=mesh.geometry.attributes.position;
 for(let i=0;i<position.count;i++)points.push(v().fromBufferAttribute(position,i).applyMatrix4(matrix));
 return {points,bounds:new T.Box3().setFromPoints(points)};
}
// Convex support mapping uses actual transformed mesh vertices, not human/world AABBs.
function intersects(a,b){
 if(!a.bounds.intersectsBox(b.bounds))return false;
 const furthest=(points,d)=>points.reduce((best,p)=>p.dot(d)>best.dot(d)?p:best,points[0]);
 const support=d=>furthest(a.points,d).clone().sub(furthest(b.points,d.clone().negate()));
 let direction=v(1,.123,.271),simplex=[support(direction)];direction.copy(simplex[0]).negate();
 const line=()=>{
  const [a,b]=simplex,ab=b.clone().sub(a),ao=a.clone().negate();
  if(ab.dot(ao)>0)direction.copy(ab).cross(ao).cross(ab);
  else{simplex=[a];direction.copy(ao)}
 };
 const triangle=()=>{
  const [a,b,c]=simplex,ab=b.clone().sub(a),ac=c.clone().sub(a),ao=a.clone().negate(),n=ab.clone().cross(ac);
  if(n.clone().cross(ac).dot(ao)>0){
   if(ac.dot(ao)>0){simplex=[a,c];direction.copy(ac).cross(ao).cross(ac)}
   else{simplex=[a,b];line()}
  }else if(ab.clone().cross(n).dot(ao)>0){simplex=[a,b];line()}
  else if(n.dot(ao)>0)direction.copy(n);
  else{simplex=[a,c,b];direction.copy(n).negate()}
 };
 for(let iteration=0;iteration<70;iteration++){
  if(direction.lengthSq()<1e-16)return true;
  const p=support(direction);
  if(p.dot(direction)<1e-9)return false;
  simplex.unshift(p);
  if(simplex.length===2)line();
  else if(simplex.length===3)triangle();
  else{
   const [a,b,c,d]=simplex,ao=a.clone().negate();let outside=false;
   for(const [p,q,opposite] of [[b,c,d],[c,d,b],[d,b,c]]){
    const n=p.clone().sub(a).cross(q.clone().sub(a));
    const order=n.dot(opposite.clone().sub(a))>0?[a,q,p]:[a,p,q];
    if(order[1]!==p)n.negate();
    if(n.dot(ao)>1e-10){simplex=order;triangle();outside=true;break}
   }
   if(!outside)return true;
  }
 }
 throw Error('Convex clearance test did not converge');
}
// Check the checker on overlapping and separated rotated solids.
const aa=new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()),bb=aa.clone();
aa.updateMatrixWorld();bb.position.set(.4,.2,.1);bb.rotation.y=.4;bb.updateMatrixWorld();
assert(intersects(shape(aa,new T.Matrix4()),shape(bb,new T.Matrix4())));
bb.position.x=2;bb.updateMatrixWorld();assert(!intersects(shape(aa,new T.Matrix4()),shape(bb,new T.Matrix4())));
let poses=0,pairs=0;
for(let index=0;index<EPISODES.length;index++){
 const round=newRound(index);view.render(round,null,false,0);
 // Only seat/prop meshes: exclude the rider, floor, soft mat and shadow planes.
 const solids=[];for(const child of view.mount.children)if(child!==view.hero)child.traverse(o=>{if(o.isMesh&&o.geometry.type!=='PlaneGeometry')solids.push(o)});
 const legs=view.hero.userData.legMeshes||view.hero.children.filter(o=>o.isMesh);
 const verify=label=>{
  view.world.updateMatrixWorld(true);const inverse=view.mount.matrixWorld.clone().invert();
  const obstacles=solids.map(o=>({o,s:shape(o,inverse)}));
  for(const leg of legs){const s=shape(leg,inverse);for(const obstacle of obstacles){
   pairs++;assert(!intersects(s,obstacle.s),`${EPISODES[index].mount}: ${label}; ${leg.geometry.type} leg ${leg.id} intersects ${obstacle.o.geometry.type} prop at ${obstacle.o.position.toArray()} (mesh ${obstacle.o.id})`);
  }}poses++;
 };
 verify('ready');
 for(const angle of [-1.2,-.9,-.4,0,.4,.9,1.2])for(const input of [-1,0,1]){
  Object.assign(round,{phase:'ride',angle,input,t:2.1});view.render(round,null,false,1/60);verify(`lean ${angle}, input ${input}`);
 }
 for(const phase of ['celebrate','tumble'])for(let step=0;step<=126;step++){
  Object.assign(round,{phase,effect:step/60,angle:.96,input:0,result:{win:phase==='celebrate'}});
  view.render(round,null,false,1/60);verify(`${phase} at ${round.effect.toFixed(3)}`);
 }
 for(const win of [true,false]){
  Object.assign(round,{phase:'result',result:{win}});view.render(round,null,true,1/60);verify(`saved result ${win}`);
 }
}
console.log(`PASS ${poses} seated/leaning/celebrating/falling poses, ${pairs} actual leg/prop mesh pairs`);
