(()=> {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORE='nasch_finance_data_v1', THEME='nasch_finance_theme_v1';
const today=()=>iso(new Date()), iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromISO=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n)||0);
const sum=a=>a.reduce((v,x)=>v+(Number(x)||0),0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const monthName=d=>d.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
const load=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||'{}');return {income:x.income||{},expenses:x.expenses||{},debts:Array.isArray(x.debts)?x.debts:[]}}catch{return {income:{},expenses:{},debts:[]}}};
let db=load(), selectedIncome=today(),selectedExpense=today(), incomeMonth=new Date(),expenseMonth=new Date(),statsDate=new Date(),statsRange='weekly',editingExpense=null,editingDebt=null,payingDebt=null;
function persist(){try{localStorage.setItem(STORE,JSON.stringify(db));renderAll()}catch(e){alert('No se pudo guardar. El almacenamiento del navegador puede estar lleno. No cierres la aplicación hasta revisar tus datos.');console.error(e)}}
function incomeRows(date){if(!db.income[date])db.income[date]=Array.from({length:10},()=>({amount:'',tip:'',comment:''}));return db.income[date]}
function dayIncome(date){return db.income[date]||[]}
function dayExpenses(date){return db.expenses[date]||[]}
function incomeSums(date){const a=dayIncome(date);return {earn:sum(a.map(x=>x.amount)),tips:sum(a.map(x=>x.tip))}}
function expenseSum(date){return sum(dayExpenses(date).map(x=>x.amount))}
function monthBounds(d){return {days:new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}}
function monthSums(d){let inc=0,tips=0,exp=0;const days=monthBounds(d).days;for(let n=1;n<=days;n++){const k=iso(new Date(d.getFullYear(),d.getMonth(),n)),v=incomeSums(k);inc+=v.earn;tips+=v.tips;exp+=expenseSum(k)}return {inc,tips,exp}}
function totalSums(){let inc=0,tips=0,exp=0;Object.keys(db.income).forEach(k=>{const v=incomeSums(k);inc+=v.earn;tips+=v.tips});Object.keys(db.expenses).forEach(k=>exp+=expenseSum(k));return {inc,tips,exp}}
function navigate(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));$$('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));window.scrollTo({top:0,behavior:'instant'});if(page==='income')renderIncome();if(page==='expenses')renderExpenses();if(page==='debts')renderDebts();if(page==='stats')renderStats()}
$$('[data-page]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
function calendar(id,month,selected,type){
 const el=$('#'+id),first=new Date(month.getFullYear(),month.getMonth(),1),days=monthBounds(month).days;el.innerHTML='';
 ['D','L','M','X','J','V','S'].forEach(x=>{const e=document.createElement('div');e.className='cal-label';e.textContent=x;el.append(e)});
 for(let i=0;i<first.getDay();i++){const e=document.createElement('div');e.className='cal-day blank';el.append(e)}
 for(let n=1;n<=days;n++){const k=iso(new Date(month.getFullYear(),month.getMonth(),n)),b=document.createElement('button');b.className='cal-day'+(k===selected?' selected':'');b.textContent=n;
 const has=type==='income'?dayIncome(k).some(x=>Number(x.amount)||Number(x.tip)||String(x.comment||'').trim()):dayExpenses(k).length>0;if(has)b.classList.add('has');
 b.onclick=()=>{if(type==='income'){selectedIncome=k;renderIncome()}else{selectedExpense=k;renderExpenses()}};el.append(b)}
}
$$('[data-month]').forEach(b=>b.onclick=()=>{const delta=Number(b.dataset.month),kind=b.dataset.kind;if(kind==='income'){incomeMonth=new Date(incomeMonth.getFullYear(),incomeMonth.getMonth()+delta,1);selectedIncome=iso(new Date(incomeMonth.getFullYear(),incomeMonth.getMonth(),1));renderIncome()}else{expenseMonth=new Date(expenseMonth.getFullYear(),expenseMonth.getMonth()+delta,1);selectedExpense=iso(new Date(expenseMonth.getFullYear(),expenseMonth.getMonth(),1));renderExpenses()}});
function renderIncome(){
 $('#incomeMonth').textContent=monthName(incomeMonth);calendar('incomeCalendar',incomeMonth,selectedIncome,'income');
 $('#incomeDate').textContent=fromISO(selectedIncome).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const rows=incomeRows(selectedIncome);$('#incomeRows').innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><input type="number" min="0" step=".01" inputmode="decimal" aria-label="Cantidad ${i+1}" data-row="${i}" data-field="amount" value="${esc(r.amount)}" placeholder="0.00"></td><td><input type="number" min="0" step=".01" inputmode="decimal" aria-label="Propina ${i+1}" data-row="${i}" data-field="tip" value="${esc(r.tip)}" placeholder="0.00"></td><td><input class="comment" aria-label="Comentario ${i+1}" data-row="${i}" data-field="comment" value="${esc(r.comment)}" placeholder="Comentario"></td></tr>`).join('');
 $('#incomeRows').querySelectorAll('input').forEach(inp=>{const update=()=>{const r=incomeRows(selectedIncome)[Number(inp.dataset.row)];r[inp.dataset.field]=inp.value;localStorage.setItem(STORE,JSON.stringify(db));renderIncomeTotals();renderHome();calendar('incomeCalendar',incomeMonth,selectedIncome,'income')};inp.addEventListener('change',update);inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();inp.blur()}})});
 renderIncomeTotals();
}
function renderIncomeTotals(){const t=incomeSums(selectedIncome);$('#earnTotal').textContent=money(t.earn);$('#tipTotal').textContent=money(t.tips);$('#dayIncomeTotal').textContent=money(t.earn+t.tips)}
function renderExpenses(){
 $('#expenseMonth').textContent=monthName(expenseMonth);calendar('expenseCalendar',expenseMonth,selectedExpense,'expenses');
 $('#expenseDate').textContent=fromISO(selectedExpense).toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const a=dayExpenses(selectedExpense);$('#expenseList').innerHTML=a.length?a.map((x,i)=>`<div class="entry"><div style="flex:1;min-width:0"><b>${esc(x.concept)}</b><small>${esc(x.comment||'Sin comentario')}</small><div class="actions"><button class="mini-btn" data-edit-exp="${i}">Editar</button><button class="mini-btn" data-delete-exp="${i}">Eliminar</button></div></div><strong>${money(x.amount)}</strong></div>`).join(''):'<div class="empty">Todavía no hay gastos registrados en este día.</div>';
 $('#dayExpenseTotal').textContent=money(expenseSum(selectedExpense));
 $$('[data-edit-exp]').forEach(b=>b.onclick=()=>openExpenseEdit(Number(b.dataset.editExp)));
 $$('[data-delete-exp]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este gasto?')){a.splice(Number(b.dataset.deleteExp),1);if(!a.length)delete db.expenses[selectedExpense];persist()}});
}
function openExpenseEdit(index=null){editingExpense=index;const form=$('#expenseForm');form.reset();$('#expenseModalTitle').textContent=index===null?'Registrar gasto':'Editar gasto';if(index!==null){const x=dayExpenses(selectedExpense)[index];form.elements.concept.value=x.concept;form.elements.amount.value=x.amount;form.elements.comment.value=x.comment||''}$('#expenseModal').showModal()}
$('#newExpense').onclick=()=>openExpenseEdit();
$('#expenseForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),item={concept:String(f.get('concept')).trim(),amount:Number(f.get('amount')),comment:String(f.get('comment')).trim()};if(!item.concept||!(item.amount>0))return;const a=db.expenses[selectedExpense]||(db.expenses[selectedExpense]=[]);if(editingExpense===null)a.push(item);else a[editingExpense]=item;$('#expenseModal').close();persist()};
function debtPaid(d){return sum((d.payments||[]).map(p=>p.amount))}
function renderDebts(){
 const pending=db.debts.reduce((s,d)=>s+Math.max(0,d.amount-debtPaid(d)),0);$('#pendingTotal').textContent=money(pending);$('#debtCount').textContent=db.debts.length;
 $('#debtList').innerHTML=db.debts.length?db.debts.map((d,i)=>{const paid=debtPaid(d),left=Math.max(0,d.amount-paid),pct=d.amount?Math.min(100,paid/d.amount*100):0;return `<div class="entry"><div style="flex:1;min-width:0"><b>${esc(d.person)}</b><small>Pidió el dinero: ${esc(d.date)}</small><small>Prestado: ${money(d.amount)} · Abonado: ${money(paid)}</small><small>Pendiente: ${money(left)}</small><div style="height:5px;background:var(--line);border-radius:9px;margin-top:8px;overflow:hidden"><i style="display:block;width:${pct}%;height:100%;background:var(--green)"></i></div><div class="actions"><button class="mini-btn" data-pay="${i}">＋ Abono</button><button class="mini-btn" data-history="${i}">Historial</button><button class="mini-btn" data-edit-debt="${i}">Editar</button><button class="mini-btn" data-delete-debt="${i}">Eliminar</button></div></div><strong>${money(left)}</strong></div>`}).join(''):'<div class="empty">Todavía no tienes deudas por cobrar registradas.</div>';
 $$('[data-pay]').forEach(b=>b.onclick=()=>openPayment(Number(b.dataset.pay)));
 $$('[data-history]').forEach(b=>b.onclick=()=>showHistory(Number(b.dataset.history)));
 $$('[data-edit-debt]').forEach(b=>b.onclick=()=>openDebtEdit(Number(b.dataset.editDebt)));
 $$('[data-delete-debt]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar esta deuda y todo su historial de abonos?')){db.debts.splice(Number(b.dataset.deleteDebt),1);persist()}});
}
function openDebtEdit(index=null){editingDebt=index;const f=$('#debtForm');f.reset();$('#debtModalTitle').textContent=index===null?'Nueva deuda por cobrar':'Editar deuda';f.elements.date.value=today();if(index!==null){const d=db.debts[index];f.elements.person.value=d.person;f.elements.amount.value=d.amount;f.elements.date.value=d.date;f.elements.comment.value=d.comment||''}$('#debtModal').showModal()}
$('#newDebt').onclick=()=>openDebtEdit();
$('#debtForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),v={person:String(f.get('person')).trim(),amount:Number(f.get('amount')),date:f.get('date'),comment:String(f.get('comment')).trim()};if(!v.person||!(v.amount>0))return;if(editingDebt===null)db.debts.push({...v,payments:[]});else{const old=db.debts[editingDebt],paid=debtPaid(old);if(v.amount<paid){alert('La cantidad prestada no puede ser menor que los abonos ya registrados.');return}db.debts[editingDebt]={...old,...v}}$('#debtModal').close();persist()};
function openPayment(index){payingDebt=index;const d=db.debts[index];$('#paymentPerson').textContent=`Abono para ${d.person}. Saldo pendiente: ${money(d.amount-debtPaid(d))}`;const f=$('#paymentForm');f.reset();f.elements.date.value=today();$('#paymentModal').showModal()}
$('#paymentForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),d=db.debts[payingDebt],amount=Number(f.get('amount'));if(!(amount>0)||amount>d.amount-debtPaid(d)){alert('El abono debe ser mayor que cero y no superar el saldo pendiente.');return}d.payments.push({amount,date:f.get('date')});$('#paymentModal').close();persist()};
function showHistory(i){const d=db.debts[i],items=d.payments||[];alert(`Historial de ${d.person}\nPrestado: ${money(d.amount)}\n\n${items.length?items.map(p=>`${p.date}: ${money(p.amount)}`).join('\n'):'No hay abonos registrados.'}\n\nPendiente: ${money(d.amount-debtPaid(d))}`)}
function monday(d){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
function buckets(){
 const out=[];
 if(statsRange==='weekly'){const start=monday(statsDate);for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);out.push({label:d.toLocaleDateString('es-MX',{weekday:'short'}),dates:[iso(d)]})}}
 else if(statsRange==='monthly'){const days=monthBounds(statsDate).days;for(let w=0;w<4;w++){const a=w*7+1,b=w===3?days:(w+1)*7,dates=[];for(let n=a;n<=b;n++)dates.push(iso(new Date(statsDate.getFullYear(),statsDate.getMonth(),n)));out.push({label:`Sem ${w+1}`,dates})}}
 else{for(let m=0;m<12;m++){const d=new Date(statsDate.getFullYear(),m,1),days=monthBounds(d).days,dates=[];for(let n=1;n<=days;n++)dates.push(iso(new Date(d.getFullYear(),m,n)));out.push({label:d.toLocaleDateString('es-MX',{month:'short'}),dates})}}
 return out.map(x=>{let inc=0,exp=0,tips=0;for(const k of x.dates){const t=incomeSums(k);inc+=t.earn+t.tips;tips+=t.tips;exp+=expenseSum(k)}return {...x,inc,exp,tips}})
}
const compact=n=>n>=10000?'$'+(n/1000).toFixed(1)+'k':'$'+Math.round(n);
function renderStats(){
 const period=statsRange==='weekly'?`Semana del ${monday(statsDate).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}`:statsRange==='monthly'?monthName(statsDate):String(statsDate.getFullYear());$('#statsPeriod').textContent=period;
 const data=buckets(),max=Math.max(1,...data.flatMap(x=>[x.inc,x.exp]));
 $('#statsChart').innerHTML=data.map(x=>`<div class="group"><div class="bars"><div class="bar in" style="height:${Math.max(x.inc?2:0,x.inc/max*100)}%"><em>${compact(x.inc)}</em></div><div class="bar out" style="height:${Math.max(x.exp?2:0,x.exp/max*100)}%"><em>${compact(x.exp)}</em></div></div><span class="group-label">${x.label}</span></div>`).join('');
 let inc=0,exp=0,tips=0;data.forEach(x=>{inc+=x.inc;exp+=x.exp;tips+=x.tips});
 $('#statsSummary').innerHTML=[['Ingresos',money(inc)],['Propinas',money(tips)],['Gastos',money(exp)],['Balance',money(inc-exp)]].map(x=>`<div class="summary"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
}
$$('[data-range]').forEach(b=>b.onclick=()=>{statsRange=b.dataset.range;$$('[data-range]').forEach(x=>x.classList.toggle('selected',x===b));renderStats()});
$('#statsPrev').onclick=()=>{if(statsRange==='weekly')statsDate.setDate(statsDate.getDate()-7);else if(statsRange==='monthly')statsDate=new Date(statsDate.getFullYear(),statsDate.getMonth()-1,1);else statsDate=new Date(statsDate.getFullYear()-1,statsDate.getMonth(),1);renderStats()};
$('#statsNext').onclick=()=>{if(statsRange==='weekly')statsDate.setDate(statsDate.getDate()+7);else if(statsRange==='monthly')statsDate=new Date(statsDate.getFullYear(),statsDate.getMonth()+1,1);else statsDate=new Date(statsDate.getFullYear()+1,statsDate.getMonth(),1);renderStats()};
function renderHome(){
 const all=totalSums(),month=monthSums(new Date());$('#homeBalance').textContent=money(all.inc+all.tips-all.exp);$('#homeIncome').textContent=money(month.inc+month.tips);$('#homeExpense').textContent=money(month.exp);
 const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d)}const vals=days.map(d=>{const k=iso(d),t=incomeSums(k);return {label:d.toLocaleDateString('es-MX',{weekday:'short'}),inc:t.earn+t.tips,exp:expenseSum(k)}}),max=Math.max(1,...vals.flatMap(x=>[x.inc,x.exp]));
 $('#homeChart').innerHTML=vals.map(x=>`<div class="group"><div class="bars"><div class="bar in" style="height:${x.inc/max*100}%"><em>${compact(x.inc)}</em></div><div class="bar out" style="height:${x.exp/max*100}%"><em>${compact(x.exp)}</em></div></div><span class="group-label">${x.label}</span></div>`).join('');
}
function setTheme(t){document.body.classList.toggle('dark',t==='dark');localStorage.setItem(THEME,t);$$('[data-theme]').forEach(b=>b.classList.toggle('selected',b.dataset.theme===t))}
$$('[data-theme]').forEach(b=>b.onclick=()=>setTheme(b.dataset.theme));$('#quickTheme').onclick=()=>setTheme(document.body.classList.contains('dark')?'light':'dark');
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
function renderAll(){renderHome();renderIncome();renderExpenses();renderDebts();renderStats();setTheme(localStorage.getItem(THEME)||'light')}
$('#today').textContent=new Date().toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
renderAll();
if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
})();