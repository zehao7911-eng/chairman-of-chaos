const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const parts=['core.mjs','view.mjs','sdk.mjs','music.mjs','app.mjs'].map(file=>
 fs.readFileSync(path.join(root,file),'utf8').replace(/^import .*?;\s*/gm,'').replace(/\bexport\s+/g,''));
const library=fs.readFileSync(path.join(root,'vendor/three.min.js'),'utf8');
let html=fs.readFileSync(path.join(root,'index-source.html'),'utf8')
 .replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync(path.join(root,'style.css'),'utf8')+'</style>')
 .replace('<script src="vendor/three.min.js"></script>',()=>'<script>'+library.replace(/<\/script/gi,'<\\/script')+'</script>')
 .replace('<script type="module" src="app.mjs"></script>',()=>'<script>(()=>{'+parts.join('\n')+'})();</script>');
for(const file of ['index.html','standalone.html'])fs.writeFileSync(path.join(root,file),html);
console.log('Built Chairman of Chaos '+Buffer.byteLength(html)+' bytes');
