import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

const submitMarker = '    setLoading(true);try{const code=generateCode();';
if (!src.includes(submitMarker)) throw new Error('[patch-tournament-registration-wa-reliable] submit marker not found');

const submitReplacement = "    setLoading(true);const waDigits=form.whatsapp.replace(/\\D/g,'').replace(/^0/,'62');const waWindow=waDigits?window.open('about:blank','_blank'):null;try{const code=generateCode();";
src = src.replace(submitMarker, submitReplacement);

const oldTail = "setSuccess({code});window.open(`https://wa.me/${wa}?text=${message}`,'_blank');";
const newTail = "setSuccess({code});if(waWindow&&!waWindow.closed){waWindow.location.href=`https://wa.me/${wa}?text=${message}`;}else{window.location.href=`https://wa.me/${wa}?text=${message}`;}";
if (!src.includes(oldTail)) throw new Error('[patch-tournament-registration-wa-reliable] WhatsApp success tail not found');
src = src.replace(oldTail, newTail);

fs.writeFileSync(path, src);
console.log('[patch-tournament-registration-wa-reliable] mobile-safe registration WhatsApp notification applied');
