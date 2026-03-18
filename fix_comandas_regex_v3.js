const fs = require('fs');
const path = 'c:/Users/Eduardo/Desktop/Desktop Projetos/psi-painel/psi-painel-karen/pages/Comandas.tsx';
let content = fs.readFileSync(path, 'utf8');

function fix(oldText, newText) {
    const escaped = oldText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const regex = new RegExp(escaped, 'g');
    if (regex.test(content)) {
        content = content.replace(regex, newText);
        console.log('Fixed block');
        return true;
    }
    console.log('Failed block starting with:', oldText.trim().substring(0, 30));
    return false;
}

fix('{(c.sessions_total || 0) > 0 && (\\s+<span className="text-\\[9px\\] font-black text-indigo-500 uppercase tracking-widest mt-0.5">\\s+{c.sessions_used || 0}/{c.sessions_total} Sessões\\s+</span>\\s+)}',
    '<span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5"># {c.id}</span>');

fix('type="number"\\s+value={item.price || 0}', 
    'type="text"\\s+placeholder="0,00"\\s+icon={<DollarSign size={16} className="text-emerald-500" />}\\s+value={String(item.price || 0).replace(".", ",")}');

fs.writeFileSync(path, content);
console.log('Done');
