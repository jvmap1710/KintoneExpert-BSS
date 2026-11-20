import { access, mkdir, writeFile, mkdtemp, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [kind, outputArg] = process.argv.slice(2);
if (!['structure', 'permissions'].includes(kind) || !outputArg?.endsWith('.xlsx')) throw Error('Usage: build-design-templates.mjs structure|permissions <new.xlsx>');
const output = path.resolve(outputArg);
try { await access(output); throw Error('Refusing to overwrite output'); } catch(e) { if(e.code !== 'ENOENT') throw e; }
await mkdir(path.dirname(output), {recursive:true});
const commands = [];
const col = i => String.fromCharCode(65+i);
const set = (s,a,p) => commands.push({command:'set',path:`/${s}/${a}`,props:p});
function cell(s,c,r,value,header=false) {
 set(s,`${col(c)}${r}`,{value,numberformat:'@','font.name':'Calibri','font.size':'11pt','font.bold':String(header),'font.color':header?'FFFFFF':'203B4D',fill:header?'A6511B':'FFFFFF','alignment.wrapText':'true','alignment.vertical':'top'});
}
function sheet(name,headers,rows=[],widths=[]) {
 commands.push({command:'add',parent:'/',type:'sheet',props:{name}});
 headers.forEach((h,c)=>{cell(name,c,1,h,true);set(name,`col[${col(c)}]`,{width:String(widths[c]||28)});});
 widths.forEach((width,c)=>set(name,`col[${col(c)}]`,{width:String(width)}));
 set(name,'row[1]',{height:'48'});
 rows.forEach((row,i)=>{row.forEach((v,c)=>cell(name,c,i+2,v));set(name,`row[${i+2}]`,{height:'65'});});
 set(name,'A1',{value:headers[0]});
 commands.push({command:'set',path:`/${name}`,props:{freeze:'C2',zoom:'80',printTitleRows:'1:1'}});
}
const demo='VÍ DỤ GIẢ LẬP — không phải cấu hình đã duyệt';
const fields=['Rich Text','Label','Number','Radio Button','Multi-choice','Date','Date and time','Link','Department Selection','Related records','Blank space','Field Group','Text','Text Area','Calculated','Check box','Drop-down','Time','Attachment','User Selection','Group Selection','Lookup','Border','Table','Record Number','Created by','Created datetime','Update by','Update datetime'];
if(kind==='structure') {
 sheet('Danh sách app',['Space','App','Có workflow'],[['Demo','Yêu cầu mẫu','x'],['Demo','Tổng hợp mẫu',''],['',demo,'']],[25,50,22]);
 sheet('Database',['Space','App','Field Name','Field Code','Field Type','Field Group or Table','Required (x) or not?','Appearance Condition','Default Value','Value List','Formula','Key?','Config','Note','Customization'],[
 ['Demo','Yêu cầu mẫu','Mã yêu cầu','request_code','Text','','x','','','','','PK','Không trùng giá trị',demo,''],
 ['Demo','Yêu cầu mẫu','Số lượng','quantity','Number','','x','','1','','','','',demo,'Khi lưu, báo lỗi nếu số lượng nhỏ hơn 1.'],
 ['Demo','Tổng hợp mẫu','Mã yêu cầu','request_code','Text','','x','','','','','PK','Không trùng giá trị',demo,''],
 ],[20,30,30,25,24,30,22,35,23,30,35,15,45,40,60]);
 sheet('Plug-in',['Data Transfer Plug-in'],[],[32,28,30,42,42,32,36,20,36,36,36,30,30,30,30]);
 const blocks=[
 [2,0,['App','Plug-in Name','Setting Name','Trigger Conditions','Process action','Destination app','Field in destination (match)','Operator','Field in this app (match)','Destination app field','Field in this app','Add new if not found']],
 [10,0,['Conditional Display Plug-in']], [11,0,['STT','App','Condition','Output']],
 [10,5,['Table Numbering Plug-in']], [11,5,['App','Number field']],
 [10,8,['Advanced Lookup Plug-in']], [11,8,['App','Lookup field','Datasource app field','Condition','In-app field']],
 [17,0,['Table Lookup Plug-in']], [18,0,['App','The Lookup field','Allow editing of table lookup values','Run all lookup fields automatically','Datasource table','Endpoint table','Datasource table field','Endpoint table field']],
 [17,9,['Related Records Auto-Calculation Plug-in']], [18,9,['Apps','When Should Calculation Occur?','Related Record Field','Field in Related Record','Calculation Type','Output Field']],
 [24,0,['Calculate and Fill Plug-in']], [25,0,['App','Settings','Trigger Events','Trigger Conditions','Field to Fill','Value']],
 [24,7,['Conditional Table Summation Plug-in']], [25,7,['App','Table','Table Column Fields','Condition','Value','Output']],
 [31,0,['Process Management History Plug-in']], [32,0,['App','Process Management History Table','Datetime','Status Before','Status After','Action','Assignee','Elapsed Time (Min)']],
 ];
 blocks.forEach(([r,start,headers])=>{headers.forEach((h,i)=>cell('Plug-in',start+i,r,h,true));set('Plug-in',`row[${r}]`,{height:'70'});});
 ['Yêu cầu mẫu','Data Transfer Plug-in','Ví dụ copy mã','All records','When a record is created','Tổng hợp mẫu','Mã yêu cầu','=','Mã yêu cầu','Mã yêu cầu','Mã yêu cầu','x'].forEach((v,c)=>cell('Plug-in',c,3,v));
 cell('Plug-in',0,5,demo);set('Plug-in','row[3]',{height:'75'});set('Plug-in','row[5]',{height:'75'});
 sheet('Views',['App','View No.','View Name','View type','Visible fields and column order','Filter','Sort by','Ascending/Descending'],[['Yêu cầu mẫu','1','Danh sách mẫu','List view','Mã yêu cầu; Số lượng','All records','Mã yêu cầu','Ascending'],['',demo]],[32,15,32,22,48,45,30,25]);
 sheet('Customization',['App','Subject','Customization Description'],[
 ['Yêu cầu mẫu','Số lượng',`${demo}. Khi lưu, báo lỗi nếu Số lượng nhỏ hơn 1; cùng yêu cầu tại Database.Customization, không triển khai hai lần.`],
 ['Yêu cầu mẫu → Tổng hợp mẫu','Đồng bộ mã yêu cầu',`${demo}. Khi tạo yêu cầu, đối sánh Mã yêu cầu ở app Tổng hợp mẫu; chưa có thì tạo, đã có thì cập nhật mã. Không xóa record. Đối chiếu khối Data Transfer; chỉ là một yêu cầu.`],
 ],[38,40,110]);
 sheet('Value List',['Field Type'],fields.map(x=>[x]),[32]);
} else {
 const legend='VÍ DỤ GIẢ LẬP: O = cấp quyền, X = không cấp quyền; ô trống = chưa xác định. Không dùng sample làm chính sách dự án.';
 sheet('Groups',['Group Code','Group Name','Parent Group Code','Description','Requested Operation','Note'],[
 ['demo_service','Nhóm dịch vụ mẫu','','Nhóm cha trong thiết kế tổ chức','Create',demo],
 ['demo_processing','Nhóm xử lý mẫu','demo_service','Nhóm con xử lý yêu cầu','Create',demo],
 ['demo_readers','Nhóm xem mẫu','demo_service','Nhóm con xem yêu cầu','Create',demo],
 ],[28,38,28,55,25,65]);
 set('Groups','A7:F7',{merge:'true'});cell('Groups',0,7,'Mỗi dòng một group. Parent Group Code trống = nhóm gốc; tham chiếu code ở sheet này. Quan hệ cha/con là thiết kế nghiệp vụ; cần đối chiếu khả năng tenant, không mặc định kế thừa quyền hoặc thành viên.');set('Groups','row[7]',{height:'65'});
 sheet('Users',['User Code / Login Name','Display Name','Email','Group Codes','Requested Operation','Note'],[
 ['demo.user01','Người dùng mẫu 01','user01@example.com','demo_processing; demo_readers','Create',demo],
 ['demo.user02','Người dùng mẫu 02','user02@example.com','demo_readers','Reuse',demo],
 ],[32,36,40,48,25,65]);
 set('Users','A7:F7',{merge:'true'});cell('Users',0,7,'Mỗi dòng một user. Group Codes dùng dấu ; để liệt kê nhiều nhóm, tham chiếu Group Code trong Groups. Create = đề nghị tạo; Reuse = dùng user hiện hữu. Không điền password/token. Mẫu chưa cho phép tạo tài khoản hay đổi membership.');set('Users','row[7]',{height:'65'});
 sheet('Apps',['Space','App','Type','User, Group, or Department','View records','Add records','Edit records','Delete records','Manage app','Import from file','Export to file'],[
 ['Demo','Yêu cầu mẫu','Group','Nhóm xử lý mẫu','O','O','O','X','X','X','X'],
 ['Demo','Yêu cầu mẫu','Group','Nhóm xem mẫu','O','X','X','X','X','X','X'],
 ],[20,30,22,40,22,22,22,22,22,22,22]);
 sheet('Records',['Space','App','Priority','Target Records / Condition','Type','User, Group, or Department','View','Edit','Delete'],[
 ['Demo','Yêu cầu mẫu','1','Status = Nháp','Group','Nhóm xử lý mẫu','O','O','X'],
 ['Demo','Yêu cầu mẫu','2','All records','Group','Nhóm xem mẫu','O','X','X'],
 ],[20,30,16,45,22,40,18,18,18]);
 sheet('Fields',['Space','App','Type','User, Group, or Department','Field','View','Edit'],[
 ['Demo','Yêu cầu mẫu','Group','Nhóm xử lý mẫu','Số lượng','O','O'],
 ['Demo','Yêu cầu mẫu','Group','Nhóm xem mẫu','Số lượng','O','X'],
 ],[20,30,22,40,40,18,18]);
 for(const s of ['Apps','Records','Fields']) {set(s,'A6:G6',{merge:'true'});cell(s,0,6,legend);set(s,'row[6]',{height:'45'});}
}
commands.push({command:'remove',path:'/Sheet1'});
const batch=path.join(await mkdtemp(path.join(tmpdir(),'ke-design-')),'batch.json');
await writeFile(batch,JSON.stringify(commands),{flag:'wx'});
function office(args) {const r=spawnSync(process.execPath,[path.join(root,'platform/ke-office-cli/scripts/run-officecli.mjs'),...args],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});if(r.status!==0)throw Error(r.stdout+r.stderr);}
office(['create',output]);office(['batch',output,'--input',batch,'--stop-on-error','--json']);office(['close',output]);await unlink(batch);console.log(output);
