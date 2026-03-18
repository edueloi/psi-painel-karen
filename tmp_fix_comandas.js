const fs = require('fs');
const path = 'c:/Users/Eduardo/Desktop/Desktop Projetos/psi-painel/psi-painel-karen/pages/Comandas.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix Table Row
const tableRowOld = `                               <td className="px-8 py-5">
                                   <div className="flex items-center gap-3">
                                       <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100 shrink-0">
                                           {(c.patientName || c.patient_name || 'P').split(' ').map(n => n[0]).join('').toUpperCase()}
                                       </div>
                                       <div className="flex flex-col">
                                           <span className="font-black text-slate-700 text-sm whitespace-nowrap">{c.patientName || c.patient_name}</span>
                                           {(c.sessions_total || 0) > 0 && (
                                               <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">
                                                   {c.sessions_used || 0}/{c.sessions_total} Sessões
                                               </span>
                                           )}
                                       </div>
                                   </div>
                               </td>`;

const tableRowNew = `                               <td className="px-8 py-5">
                                   <div className="flex items-center gap-4">
                                       <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100 shrink-0">
                                           {(c.patientName || c.patient_name || 'P').split(' ').map(n => n[0]).join('').toUpperCase()}
                                       </div>
                                       <div className="flex flex-col">
                                           <span className="font-black text-slate-700 text-sm whitespace-nowrap">{c.patientName || c.patient_name}</span>
                                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5"># {c.id}</span>
                                       </div>
                                   </div>
                               </td>`;

const progressBarCell = `                               <td className="px-8 py-5">
                                   <div className="flex flex-col gap-1.5 whitespace-nowrap">
                                       <div className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                           {c.sessions_used || 0} de {c.sessions_total || 1} <span className="text-slate-400 font-bold text-[9px]">Atendimentos</span>
                                       </div>
                                       <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                           <div 
                                               className="h-full bg-indigo-500 transition-all shadow-[0_0_8px_rgba(99,102,241,0.3)]" 
                                               style={{ width: \`\${Math.min(100, ((c.sessions_used || 0) / (c.sessions_total || 1)) * 100)}%\` }}
                                           ></div>
                                       </div>
                                   </div>
                               </td>`;

// Apply Table Row changes
content = content.replace(tableRowOld.trim(), tableRowNew.trim());

// 2. Fix Description and Value columns in table
content = content.replace(/<td className="px-8 py-5">\s+<div className="max-w-\[200px\] truncate text-xs font-bold text-slate-400">\{c.description\}<\/div>\s+<\/td>/g, 
    `<td className="px-8 py-5">
                                   <div className="max-w-[200px] truncate text-xs font-bold text-slate-500/70">{c.description || 'Serviço'}</div>
                               </td>
${progressBarCell}`);

content = content.replace(/<span className="font-black text-slate-800">\{formatCurrency\(c\.totalValue\)\}<\/span>/g,
    `<span className="font-black text-indigo-600 text-base">{formatCurrency(c.totalValue || c.total || 0)}</span>`);

// 3. Fix onChange
const onChangeOld = `                                         const newItems = [...(editingComanda?.items || [])];
                                         newItems[idx] = {
                                             ...newItems[idx],
                                             name: found?.name || 'Item',
                                             price: found?.price || found?.totalPrice || 0,
                                             [isPkg ? 'package_id' : 'service_id']: id,
                                             type: isPkg ? 'package' : 'service'
                                         };
                                         const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * (curr.qty || 1)), 0);`;

const onChangeNew = `                                         const newItems = [...(editingComanda?.items || [])];
                                         newItems[idx] = {
                                             ...newItems[idx],
                                             name: found?.name || 'Item',
                                             price: found?.price || (found as any)?.total_price || (found as any)?.totalPrice || 0,
                                             qty: isPkg ? ((found as any)?.sessions_count || (found as any)?.sessions || 1) : (newItems[idx].qty || 1),
                                             [isPkg ? 'package_id' : 'service_id']: id,
                                             type: isPkg ? 'package' : 'service'
                                         };
                                         const newTotal = newItems.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.qty || 1)), 0);`;

content = content.replace(onChangeOld.trim(), onChangeNew.trim());

fs.writeFileSync(path, content);
console.log('Successfully updated Comandas.tsx');
