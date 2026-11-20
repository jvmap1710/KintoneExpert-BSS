import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
export async function check(file, sheets, required) {
 const b=await readFile(new URL(`../skills/ke-document-writer/assets/${file}`,import.meta.url));
 let end=b.length-22;while(end>=0 && b.readUInt32LE(end)!==0x06054b50)end--;
 assert(end>=0);let offset=b.readUInt32LE(end+16);const entries=new Map();
 for(let i=0;i<b.readUInt16LE(end+10);i++) {
  const size=b.readUInt32LE(offset+20),method=b.readUInt16LE(offset+10),nl=b.readUInt16LE(offset+28),extra=b.readUInt16LE(offset+30),comment=b.readUInt16LE(offset+32);
  const name=b.subarray(offset+46,offset+46+nl).toString(),local=b.readUInt32LE(offset+42),start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28);
  assert([0,8].includes(method));const raw=b.subarray(start,start+size);entries.set(name,(method===8?inflateRawSync(raw):raw).toString());offset+=46+nl+extra+comment;
 }
 for (const [name,xml] of entries) entries.set(name,xml.replace(/(<\/?)[A-Za-z_][\w.-]*:/g,'$1'));
 const wb=entries.get('xl/workbook.xml');
 assert.deepEqual([...wb.matchAll(/<sheet\s[^>]*name="([^"]+)"/g)].map(m=>m[1]),sheets);
 const all=[...entries.values()].join('\n');
 assert(!/FFVN|FUJIFILM|INISS|NgocNM|Phiếu yêu cầu xuất NVL|Biên bản xác nhận|tc=\{|mailto:|https?:\/\/(?:demo-|[^\s<]*kintone)/iu.test(all),'No source customer material');
 for(const [name,xml] of entries) {
  assert(!/comments|threaded|persons|vbaProject|externalLinks|media\/|drawings\//i.test(name),`Unexpected part ${name}`);
  assert(!/<f(?:\s|>)/.test(xml),'No executable formulas');
 }
 for(const term of required)assert(all.includes(term),`Missing ${term}`);
 assert(all.includes('VÍ DỤ GIẢ LẬP'),'Sample label');
 console.log(`PASS: ${file}, sheet structure, synthetic content, no executable/embedded customer material`);
}
