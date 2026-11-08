import {EPISODES,clamp} from './core.mjs';
const T=window.THREE;
const vec=(x,y,z)=>new T.Vector3(x,y,z);
export class OfficeView{
 constructor(element){
  this.el=element;
  this.scene=new T.Scene();
  this.scene.background=new T.Color(0xbac9c4);
  this.scene.add(new T.HemisphereLight(0xfff3d7,0x687a87,.78));
  const sun=new T.DirectionalLight(0xffedcc,.82);
  sun.position.set(-5,9,6);
  this.scene.add(sun);
  this.camera=new T.PerspectiveCamera(43,1,.1,90);
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  this.renderer.outputEncoding=T.sRGBEncoding;
  element.append(this.renderer.domElement);
  this.materials=new Map();
  this.boxGeo=new T.BoxGeometry();
  this.sphereGeo=new T.SphereGeometry(1,18,12);
  this.resize();
  new ResizeObserver(()=>this.resize()).observe(element);
 }
 resize(){
  const {width,height}=this.el.getBoundingClientRect();
  if(!width||!height)return;
  this.camera.aspect=width/height;
  this.camera.updateProjectionMatrix();
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.4));
  this.renderer.setSize(width,height,false);
 }
 mat(color){
  if(!this.materials.has(color))this.materials.set(color,new T.MeshLambertMaterial({color}));
  return this.materials.get(color);
 }
 mesh(parent,geometry,color,x=0,y=0,z=0){
  const object=new T.Mesh(geometry,this.mat(color));
  object.position.set(x,y,z);
  parent.add(object);
  return object;
 }
 box(parent,x,y,z,w,h,d,color){
  const object=this.mesh(parent,this.boxGeo,color,x,y,z);
  object.scale.set(w,h,d);
  return object;
 }
 oval(parent,x,y,z,w,h,d,color){
  const object=this.mesh(parent,this.sphereGeo,color,x,y,z);
  object.scale.set(w,h,d);
  return object;
 }
 link(parent,a,b,r,color){
  const axis=b.clone().sub(a);
  const object=this.mesh(parent,new T.CylinderGeometry(r*.86,r,1,10),color);
  object.position.copy(a).lerp(b,.5);
  object.scale.y=axis.length();
  object.quaternion.setFromUnitVectors(vec(0,1,0),axis.normalize());
  return object;
 }
 group(parent,x=0,y=0,z=0){
  const object=new T.Group();
  object.position.set(x,y,z);
  parent.add(object);
  return object;
 }
 print(parent,x,y,z,w,h,words,color=0x345b61,paper=0xf2ead7){
  const c=document.createElement('canvas');c.width=512;c.height=256;
  const b=c.getContext('2d');
  b.fillStyle='#'+paper.toString(16).padStart(6,'0');b.fillRect(0,0,512,256);
  b.fillStyle='#'+color.toString(16).padStart(6,'0');
  b.fillRect(28,25,65,7);
  b.textAlign='left';b.font='900 46px system-ui';
  words.split('|').forEach((word,i)=>b.fillText(word,28,94+i*57,455));
  b.fillRect(28,224,456,3);
  const texture=new T.CanvasTexture(c);texture.encoding=T.sRGBEncoding;
  const plane=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}));
  plane.position.set(x,y,z);parent.add(plane);return plane;
 }
 room(index){
  if(this.world){
   const geometries=new Set();
   this.world.traverse(object=>{
    if(object.isMesh&&object.geometry!==this.boxGeo&&object.geometry!==this.sphereGeo)geometries.add(object.geometry);
    if(object.material?.map){object.material.map.dispose();object.material.dispose()}
   });
   geometries.forEach(geometry=>geometry.dispose());
   this.scene.remove(this.world);
  }
  const room=EPISODES[index].room;
  this.world=new T.Group();this.scene.add(this.world);
  const w=this.world,palette=[
   {floor:0xd6c4a7,wall:0xb9d5cd,trim:0x537e7b,sky:0xc3ddd6},
   {floor:0xc7c4bc,wall:0xe5c3a4,trim:0x9c655b,sky:0xc2d2d5},
   {floor:0x8397a2,wall:0x6e7d98,trim:0x414a6d,sky:0x788fa9}
  ][room];
  this.scene.background=new T.Color(palette.sky);
  this.box(w,0,-.14,0,12,.28,11,palette.floor);
  this.box(w,0,2.15,-3.75,12,4.3,.16,palette.wall);
  this.box(w,-4.35,2.15,0,.16,4.3,7.5,palette.wall);
  for(let z=-3.4;z<4.8;z+=.58)this.box(w,0,.006,z,11.8,.012,.018,room===0?0xc4b38f:0x9dabb0);
  this.box(w,0,.12,0,2.9,.24,2.8,palette.trim);
  this.box(w,0,.254,0,2.75,.03,2.64,0xe5e5d0);
  for(let i=-2;i<=2;i++){
   this.box(w,i*.50,.277,1.01,.20,.016,.16,0xeeb268);
   this.box(w,i*.50,.277,-1.01,.20,.016,.16,0xeeb268);
  }
  this.matTop=.36;
  this.box(w,2.33,.15,.57,2.15,.30,2.35,0x91beac);
  this.box(w,2.33,.316,.57,2.04,.033,2.22,0xc2dfc0);
  for(let i=0;i<4;i++)this.box(w,1.62+i*.46,.337,.57,.013,.012,1.94,0x91ba9e);
  this.print(w,2.33,.354,.57,1.15,.44,'SAFE LANDING').rotation.x=-Math.PI/2;
  for(const x of [-2.8,.0,2.8]){
   this.box(w,x,2.49,-3.64,2.34,2.48,.09,0x577e8c);
   this.box(w,x,2.49,-3.58,2.12,2.27,.042,room===2?0x7e9cbb:0xc4e3e0);
   this.box(w,x,2.49,-3.53,.066,2.28,.066,0xe5ded1);
   this.box(w,x,2.30,-3.52,2.12,.061,.055,0xe5ded1);
   for(let j=0;j<5;j++)this.box(w,x-.94+j*.42,1.82,-3.55,.27,.40+(j%3)*.27,.027,room===2?0x526786:0xabcacb);
  }
  this.print(w,-2.73,2.62,-3.43,1.25,.74,room===0?'HANG|IN THERE':room===1?'WORLD’S OKAYEST|COFFEE':'WORK HARD.|WOBBLE HARD.');
  this.print(w,.15,3.64,-3.56,3.02,.40,room===0?'CUBICLE COUNTY':room===1?'BREAKROOM RODEO':'THE BOARD ROOM');
  this.desk(w,-2.75,-1.31,room);
  this.plant(w,3.4,-2.9,1.22);
  this.plant(w,-3.65,1.78,.85);
  const dispenser=this.group(w,3.55,0,-1.30);
  this.box(dispenser,0,.59,0,.61,1.18,.59,0xe2e7de);
  this.oval(dispenser,0,1.53,0,.28,.41,.26,0x6dabb9);
  this.box(dispenser,0,.90,.31,.37,.38,.040,0x355f6e);
  this.box(dispenser,-.10,.87,.36,.06,.08,.04,0xe97862);
  for(const [x,z,c,hair] of [[-2.14,-2.14,0xc37862,0x604c42],[2.08,-2.44,0x5c7795,0x3c3641],[3.28,1.86,0xc29761,0x6c4939]]){
   const person=this.person(c,hair,false);
   person.position.set(x,0,z);person.rotation.y=x<0?.55:-.63;w.add(person);
  }
  this.base=this.group(w);
  this.box(this.base,0,.36,0,1.68,.16,1.46,0x355562);
  this.oval(this.base,0,.42,0,.72,.09,.65,0x657b81);
  this.mesh(this.base,new T.CylinderGeometry(.13,.17,.67,12),0x536d79,0,.79,0);
  this.mount=this.group(w,0,1.14,0);
  this.buildMount(this.mount,EPISODES[index].mount);
  this.seatOffset=({chair:.20,printer:.336,mug:.43,plant:.45,throne:.20,disco:.335})[EPISODES[index].mount]-.51;
  this.hero=this.person(0x426b79,0x493a32,true);
  this.mount.add(this.hero);
  this.hero.position.set(0,this.seatOffset,0);
  this.feet=this.hero.userData.feet;
  this.papers=[];
  for(let i=0;i<18;i++){
   const paper=this.box(w,0,0,0,.19,.012,.26,i%3===0?0xf5c273:0xf6f2df);
   paper.visible=false;this.papers.push(paper);
  }
  this.index=index;
 }
 desk(w,x,z,room){
  const d=this.group(w,x,0,z);
  this.box(d,0,.92,0,2.4,.15,1.12,0xb98966);
  for(const side of [-1,1])this.box(d,side*.97,.43,0,.11,.86,.79,0x4d686e);
  this.box(d,-.27,1.40,-.15,.96,.60,.085,0x365562);
  this.box(d,-.27,1.42,-.095,.83,.47,.025,0x8bb4b0);
  this.print(d,-.27,1.41,-.07,.69,.31,room===0?'NO SIGNAL':room===1?'LUNCH.EXE':'YOU’RE ON MUTE');
  this.box(d,-.27,1.07,-.17,.07,.21,.07,0x365562);
  this.box(d,-.27,1.00,-.14,.41,.046,.28,0x365562);
  for(let i=0;i<3;i++)this.box(d,.78,1.05+i*.05,.14,.42,.043,.53,[0xe3e5d6,0xe8b981,0x628d88][i]);
  this.box(d,-.35,1.02,.32,.88,.05,.28,0xe0e0d4);
 }
 plant(w,x,z,scale){
  const p=this.group(w,x,0,z);
  const pot=this.mesh(p,new T.CylinderGeometry(.29,.22,.55,10),0xb66d54,0,.275,0);
  this.mesh(p,new T.CylinderGeometry(.255,.255,.02,10),0x515a45,0,.552,0);
  for(let i=0;i<7;i++){
   const a=i*2.399;
   this.link(p,vec(0,.55,0),vec(Math.sin(a)*.40,1.30+(i%3)*.16,Math.cos(a)*.36),.023,0x5d745b);
   const leaf=this.oval(p,Math.sin(a)*.41,1.29+(i%3)*.16,Math.cos(a)*.37,.13,.30,.10,0x5e9277);
   leaf.rotation.set(.4*Math.sin(a),a,.42*Math.cos(a));
  }
  p.scale.setScalar(scale);
 }
 person(shirt,hair,seated){
  const p=new T.Group(),skin=0xd5a280,navy=0x2a4352;
  const torso=this.group(p,0,seated?.72:1.05,0);
  this.oval(torso,0,.20,0,.31,.41,.205,shirt);
  this.box(torso,0,.19,.192,.052,.49,.028,0xe9e4d3);
  const tie=this.box(torso,0,.25,.215,.081,.31,.026,0xe9a465);tie.rotation.z=.025;
  this.oval(torso,0,.78,.02,.251,.284,.238,skin);
  this.oval(torso,0,.939,-.028,.265,.162,.24,hair);
  for(const side of [-1,1]){
   this.oval(torso,side*.244,.78,.02,.049,.070,.053,skin);
   this.box(torso,side*.11,.813,.247,.166,.105,.036,0x374d56);
   this.box(torso,side*.11,.813,.269,.128,.068,.014,0xa8c5c0);
   const shoulder=vec(side*.28,.39,0),elbow=vec(side*.37,seated?.10:.04,seated?.14:.03),hand=vec(side*.26,seated?.16:-.14,seated?.35:.10);
   this.link(torso,shoulder,elbow,.102,shirt);
   this.link(torso,elbow,hand,.082,shirt);
   this.oval(torso,...hand.toArray(),.084,.083,.087,skin);
  }
  this.box(torso,0,.813,.248,.081,.027,.036,0x374d56);
  this.oval(torso,0,.733,.251,.050,.031,.050,skin);
  this.oval(torso,0,.659,.209,.050,.011,.022,0x89533f);
  const feet=[];
  for(const side of [-1,1]){
   const hip=vec(side*.146,seated?.70:.85,0);
   const knee=vec(side*.20,seated?.63:.45,seated?.39:.02);
   const ankle=vec(side*.20,.15,seated?.39:.04);
   this.link(p,hip,knee,.119,navy);this.link(p,knee,ankle,.100,navy);
   feet.push(this.box(p,side*.20,.101,seated?.49:.11,.235,.18,.36,0x253d48));
  }
  p.userData={torso,feet};
  return p;
 }
 buildMount(p,type){
  const wood=0xc99569,green=0x547f77,ivory=0xf0e8d6;
  this.features=[];
  if(type==='chair'||type==='throne'){
   const gold=type==='throne';
   this.box(p,0,.06,0,.92,.20,.83,gold?0xc79652:green);
   this.box(p,0,.15,.01,.85,.10,.76,gold?0x8b627b:0x7a9c8a);
   this.box(p,0,.59,-.37,.92,.93,.14,gold?0xb38958:green);
   this.box(p,0,.60,-.276,.76,.72,.06,gold?0x8b627b:0x6f9786);
   for(const side of [-1,1]){
    this.box(p,side*.51,.34,0,.13,.13,.77,gold?0xc99e5f:0x3f626b);
    this.box(p,side*.51,.21,-.18,.065,.29,.065,0x405e68);
   }
   if(gold){for(let i=-2;i<=2;i++)this.oval(p,i*.16,1.15+(.3-Math.abs(i)*.10),-.37,.058,.16,.060,0xebc079)}
   else for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    this.link(this.base,vec(0,.41,0),vec(Math.sin(a)*.68,.26,Math.cos(a)*.68),.050,0x4a646d);
    this.oval(this.base,Math.sin(a)*.68,.23,Math.cos(a)*.68,.115,.10,.10,0x304b59);
   }
  }else if(type==='printer'){
   this.box(p,0,.04,0,1.07,.42,.92,0xe2e5d9);
   this.box(p,0,.271,-.09,1.02,.075,.69,0x374e5a);
   this.box(p,0,.316,-.10,.87,.04,.52,0xb1cebe);
   this.box(p,0,.03,.472,.73,.115,.03,0x334e5a);
   this.box(p,0,-.03,.63,.72,.045,.32,0x6e898a);
   this.features.push(this.box(p,0,.03,.60,.60,.014,.23,0xf8f2dc));
   for(let i=0;i<3;i++)this.oval(p,.40,.12+i*.072,.481,.021,.021,.010,[0x8ed8a9,0xeac06a,0xe38468][i]);
  }else if(type==='mug'){
   this.mesh(p,new T.CylinderGeometry(.57,.49,.67,20),0xe8b467,0,.05,0);
   this.mesh(p,new T.CylinderGeometry(.50,.50,.035,20),0x684c44,0,.398,0);
   const handle=this.mesh(p,new T.TorusGeometry(.29,.079,8,20),0xf3ce91,.63,.10,0);handle.rotation.y=Math.PI/2;
   this.box(p,0,.41,0,.61,.04,.53,0xeadfc8);
   this.print(p,0,.10,.563,.67,.36,'#1 EMPLOYEE',0x80564c,0xe8b467);
   for(let i=0;i<3;i++)this.features.push(this.oval(p,-.34+i*.30,.52,-.34,.042,.11,.042,0xf7e1be));
  }else if(type==='plant'){
   this.mesh(p,new T.CylinderGeometry(.60,.43,.68,10),0xb66d56,0,.04,0);
   this.mesh(p,new T.CylinderGeometry(.55,.55,.025,10),0x555c43,0,.391,0);
   this.box(p,0,.42,0,.64,.06,.56,0xc3b18b);
   for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const leaf=this.oval(p,Math.sin(a)*.63,.52,Math.cos(a)*.63,.15,.40,.10,0x5b9979);
    leaf.rotation.set(.52*Math.sin(a),a,.52*Math.cos(a));this.features.push(leaf);
   }
  }else{
   this.mesh(p,new T.CylinderGeometry(.77,.77,.15,20),0x536583,0,.04,0);
   const colors=[0xe49b8c,0xcab87c,0x7bb4ae,0x9d8cbe];
   for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    this.features.push(this.box(p,Math.sin(a)*.62,.14,Math.cos(a)*.62,.18,.065,.18,colors[i%4]));
   }
   this.box(p,0,.24,0,.65,.19,.61,0x95bdab);
   this.box(p,0,.60,-.37,.69,.69,.13,0x69888f);
  }
 }
 render(round,reward,reduced,dt){
  if(this.index!==round.index)this.room(round.index);
  const preview=round.phase==='ready',playing=round.phase==='ride';
  const t=round.t,tilt=clamp(round.angle,-1.2,1.2);
  const buck=reduced?0:Math.sin(t*6.3+round.index)*.050;
  this.mount.rotation.set(playing?buck:0,playing?Math.sin(t*1.2)*.12:0,playing?-tilt*.65:0);
  this.mount.position.y=1.14+(playing?Math.abs(buck)*.35:0);
  this.hero.position.set(0,this.seatOffset,0);
  this.hero.rotation.set(0,0,playing?-round.input*.17:0);
  this.hero.userData.torso.rotation.z=playing?-round.input*.16:0;
  if(round.phase==='tumble'||round.phase==='result'&&round.result&&!round.result.win){
   const u=round.phase==='result'?1:clamp(round.effect/1.3,0,1);
   this.mount.rotation.z=(1-u)*-tilt*.65;
   this.hero.position.set(2.27*u,this.seatOffset+Math.sin(u*Math.PI)*1.24-u*.51,.65*u);
   this.hero.rotation.set(-.30*u,0,-u*1.15);
   this.hero.userData.torso.rotation.z=0;
  }
  if(round.phase==='celebrate'||round.phase==='result'&&round.result?.win){
   const e=round.phase==='result'?2.1:round.effect;
   this.hero.position.y=this.seatOffset+(reduced?0:Math.abs(Math.sin(e*6.5))*.14*Math.max(0,1-e/2.1));
  }
  this.hero.userData.torso.children.forEach(object=>{
   if(object.isMesh&&object.material.color.getHex()===0x426b79&&reward)object.material=this.mat(reward==='aurora'?0x7364a0:0xc48e58);
  });
  this.features.forEach((object,i)=>{
   if(EPISODES[round.index].mount==='printer')object.position.z=.60+(playing&&!reduced?Math.sin(t*8)*.11:0);
   if(EPISODES[round.index].mount==='mug')object.scale.y=reduced?1:1+Math.sin(t*4+i)*.23;
   if(EPISODES[round.index].mount==='plant')object.rotation.z=(reduced?0:Math.sin(t*4+i)*.14);
  });
  this.world.updateMatrixWorld(true);
  if(round.phase==='tumble'||round.phase==='result'&&round.result&&!round.result.win){
   const bounds=new T.Box3().setFromObject(this.hero);
   const lift=Math.max(0,this.matTop-bounds.min.y);
   this.hero.position.y+=lift;
  }
  this.papers.forEach((paper,i)=>{
   const animate=round.phase==='tumble'||round.phase==='celebrate',e=round.effect||0;
   paper.visible=animate&&!reduced;
   if(paper.visible){
    const u=clamp(e/1.9,0,1),a=i*2.399;
    paper.position.set(Math.cos(a)*(u*2.0),.43+Math.sin(u*Math.PI)*(1.4+i%3*.35),Math.sin(a)*u*1.5);
    paper.rotation.set(i+e*3,a,e*5);
   }
  });
  const cameraTarget=preview?vec(3.55,3.35,6.15):vec(3.30,3.03,6.28);
  this.camera.position.copy(cameraTarget);
  this.camera.lookAt(preview?vec(0,1.19,0):vec(.10,1.23,.08));
  this.renderer.render(this.scene,this.camera);
 }
}
