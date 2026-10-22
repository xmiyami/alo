const assert = require('node:assert/strict');
const E = require('../engine.js');
let checks = 0, calls = 0;
const arithmetic = (a, op, b) => { calls++; switch(op) { case '+': return a+b; case '-': return a-b; case '*': return a*b; case '/': return a/b; } throw Error(op); };
const cases = [['9*6',54],['0xF7+0x7F',374],['(0x10+010)*@10',48],['0xA.8+@1.1',12],['010.4/2',4.25],['2+3*4',14],['(2+3)*4',20],['-5+2',-3],['7/2',3.5],['0xFF',255],['@101.01',5.25],['0.5+0.25',0.75],['8/4/2',1],['10-3-2',5],['-(2+3)',-5],['0Xff',255],['00',0],['0',0],['.5*2',1]];
for (const [s,n] of cases) { assert.equal(E.evaluate(E.parse(s),arithmetic),n,s); checks++; }
for (const s of ['','0x','@','08','@102','0xG','1..2','2(3)','(2+3','2+3)','alert(1)','1;2','1e3','1/0','4/(2-2)','9'.repeat(30),'('.repeat(70)+'1'+')'.repeat(70)]) {
 assert.throws(()=>E.evaluate(E.parse(s),arithmetic),undefined,s); checks++;
}
for (const [n,b,s] of [[374,16,'0x176'],[374,10,'374'],[374,8,'0566'],[374,2,'@101110110'],[4.25,8,'04.2'],[10.5,16,'0xA.8'],[-3.5,2,'-@11.1'],[0,16,'0x0'],[0.75,10,'0.75']]) { assert.equal(E.format(n,b),s); checks++; }
assert.match(E.format(1/3,2),/\[truncated\]$/); checks++;
assert.throws(()=>E.format(1,3)); checks++;
let order=[]; E.evaluate(E.parse('2+3*4'),(a,op,b)=>{ order.push(op); return arithmetic(a,op,b); }); assert.deepEqual(order,['*','+']); checks++;
console.log(`PASS: ${checks} checks; ${calls} arithmetic callbacks. GUI bridge is NOT tested by these tests.`);
const fs=require('node:fs');
let reference={};
for(const base of [16,10,8,2]) reference[base]=fs.readFileSync(require('node:path').join(__dirname,'../text1.txt'),'utf8').trim().split(/\r?\n/).map(s=>s+' = '+E.format(E.evaluate(E.parse(s),arithmetic),base));
fs.writeFileSync(require('node:path').join(__dirname,'../results/expected-results.json'),JSON.stringify(reference,null,2)+'\n');
