// Tests the real JScript entry point with simulated WSH and Calculator I/O.
// No Windows GUI is exercised.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'..');
const reference={16:['36','176','1C','6','14','4.2'],10:['54','374','28','6','20','4.125'],8:['66','566','34','6','24','4.1'],2:['110110','101110110','11100','110','10100','100.001']};
let checks=0;
for(const base of [16,10,8,2]) {
 const files={'C:\\Lab4\\text1.txt':fs.readFileSync(path.join(root,'text1.txt'),'utf8')}; let seq=0,exit,requests=0;
 const stream=(name,write)=> {let i=0,lines=(files[name]||'').trimEnd().split(/\r?\n/); if(write)files[name]=''; return {get AtEndOfStream(){return i>=lines.length;},ReadLine(){return lines[i++];},ReadAll(){return files[name];},WriteLine(s){files[name]+=String(s)+'\r\n';},Close(){}};};
 const fso={GetParentFolderName(){return 'C:\\Lab4';},GetSpecialFolder(){return 'C:\\Temp';},GetTempName(){return 'test'+(++seq);},BuildPath(a,b){return a+'\\'+b;},CreateTextFile(n){return stream(n,true);},OpenTextFile(n){assert.ok(n in files,n);return stream(n,false);},DeleteFile(n){delete files[n];},FileExists(n){return n in files;}};
 const answers=base===16?[6]:base===10?[7,6]:base===8?[7,7,6]:[7,7,7];
 const shell={Popup(){return answers.shift();},Run(command){requests++;const [,req,res]=command.match(/-Request "([^"]+)" -Response "([^"]+)"/);const [mode,a,op,b]=files[req].trimEnd().split(/\r?\n/);let value=Number(a);if(mode==='binary'){const n=Number(b);value=op==='+'?value+n:op==='-'?value-n:op==='*'?value*n:value/n;}files[res]='OK\r\n'+value;return 0;}};
 const context={ActiveXObject:function(name){return name==='Scripting.FileSystemObject'?fso:shell;},WScript:{ScriptFullName:'C:\\Lab4\\script3.js',Echo(){},Quit(code){exit=code;throw {quit:true};}}};
 try{vm.runInNewContext(fs.readFileSync(path.join(root,'script3.js'),'utf8'),context);}catch(e){if(!e.quit)throw e;}
 assert.equal(exit,0);checks++;
 const result=files['C:\\Lab4\\text2.txt'].trim().split(/\r?\n/).slice(1).map(s=>s.split(' = ')[1]);
 assert.deepEqual(result,reference[base]);checks++;
 assert.equal(requests,7);checks++;
 fs.writeFileSync(path.join(root,'expected-'+base+'.txt'),reference[base].join('\n')+'\n');
}
console.log('PASS: '+checks+' integration assertions; all four selections, six report examples, seven simulated Calculator requests per run. Windows GUI NOT tested.');
