const fs = require('fs');
const path = 'c:/Users/Eduardo/Desktop/Desktop Projetos/psi-painel/psi-painel-karen/pages/Comandas.tsx';
let content = fs.readFileSync(path, 'utf8');

function fix(oldSnippet, newSnippet) {
  const index = content.indexOf(oldSnippet.trim());
  if (index !== -1) {
    // We replace the first match found regardless of leading/trailing whitespace
    // this is a bit dangerous but for very unique snippets it works
    content = content.replace(oldSnippet.trim(), newSnippet);
    console.log('Fixed block');
  } else {
    console.log('Failed block');
  }
}

// Table Row Identification fix:
const oldTableRow = `{(c.sessions_total || 0) > 0 && (
                                               <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">
                                                   {c.sessions_used || 0}/{c.sessions_total} Sessões
                                               </span>
                                           )}`;
const newTableRow = `<span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5"># {c.id}</span>`;
fix(oldTableRow, newTableRow);

// Monetary Mask fix:
const oldPriceInput = `type="number"
                                       value={item.price || 0}`;
const newPriceInput = `type="text"
                                       placeholder="0,00"
                                       icon={<DollarSign size={16} className="text-emerald-500" />}
                                       value={String(item.price || 0).replace('.', ',')}`;
fix(oldPriceInput, newPriceInput);

fs.writeFileSync(path, content);
console.log('Done');
