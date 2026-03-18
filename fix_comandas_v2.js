const fs = require('fs');
const path = 'c:/Users/Eduardo/Desktop/Desktop Projetos/psi-painel/psi-painel-karen/pages/Comandas.tsx';
let content = fs.readFileSync(path, 'utf8');

function fix(oldText, newText) {
    const regex = new RegExp(oldText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'), 'g');
    if (regex.test(content)) {
        content = content.replace(regex, newText);
        console.log('Fixed one block');
        return true;
    }
    console.log('Could not find block starting with:', oldText.trim().substring(0, 50));
    return false;
}

fix('(comanda.sessions_total || 0) > 0 && (\n                                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">\n                                                  {comanda.sessions_used || 0}/{comanda.sessions_total} SESSÕES\n                                              </span>\n                                          )', 
'(comanda.sessions_total || 0) > 0 && (\n                                              <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shadow-sm">\n                                                  {comanda.sessions_used || 0} de {comanda.sessions_total} SESSÕES\n                                              </span>\n                                          )');

fix('<div className="flex flex-col">\n                                           <span className="font-black text-slate-700 text-sm whitespace-nowrap">{c.patientName || c.patient_name}</span>\n                                           {(c.sessions_total || 0) > 0 && (\n                                               <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">\n                                                   {c.sessions_used || 0}/{c.sessions_total} Sessões\n                                               </span>\n                                           )}\n                                       </div>',
'<div className="flex flex-col">\n                                           <span className="font-black text-slate-700 text-sm whitespace-nowrap">{c.patientName || c.patient_name}</span>\n                                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5"># {c.id}</span>\n                                       </div>');

fix('<div className="max-w-[200px] truncate text-xs font-bold text-slate-400">{c.description}</div>', 
'<div className="max-w-[200px] truncate text-xs font-bold text-slate-500/70">{c.description || \'Serviço\'}</div>\n                               </td>\n                               <td className="px-8 py-5">\n                                   <div className="flex flex-col gap-1.5 whitespace-nowrap">\n                                       <div className="text-[11px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">\n                                           {c.sessions_used || 0} de {c.sessions_total || 1} <span className="text-slate-400 font-bold text-[9px]">Atens.</span>\n                                       </div>\n                                       <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">\n                                           <div \n                                               className="h-full bg-indigo-500 transition-all shadow-[0_0_8px_rgba(99,102,241,0.3)]" \n                                               style={{ width: `${Math.min(100, ((c.sessions_used || 0) / (c.sessions_total || 1)) * 100)}%` }}></div>\n                                       </div>\n                                   </div>');

fix('<span className="font-black text-slate-800">{formatCurrency(c.totalValue)}</span>',
'<span className="font-black text-indigo-600 text-base">{formatCurrency(c.totalValue || c.total || 0)}</span>');

fix('newItems[idx] = {\n                                             ...newItems[idx],\n                                             name: found?.name || \'Item\',\n                                             price: found?.price || found?.totalPrice || 0,\n                                             [isPkg ? \'package_id\' : \'service_id\']: id,\n                                             type: isPkg ? \'package\' : \'service\'\n                                         };',
'newItems[idx] = {\n                                             ...newItems[idx],\n                                             name: found?.name || \'Item\',\n                                             price: found?.price || (found as any)?.total_price || (found as any)?.totalPrice || 0,\n                                             qty: isPkg ? ((found as any)?.sessions_count || (found as any)?.sessions || (newItems[idx].qty || 1)) : (newItems[idx].qty || 1),\n                                             [isPkg ? \'package_id\' : \'service_id\']: id,\n                                             type: isPkg ? \'package\' : \'service\'\n                                         };');

fix('const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * (curr.qty || 1)), 0);',
'const newTotal = newItems.reduce((acc, curr) => acc + ((curr.price || 0) * (curr.qty || 1)), 0);');

fs.writeFileSync(path, content);
console.log('Successfully updated Comandas.tsx');
