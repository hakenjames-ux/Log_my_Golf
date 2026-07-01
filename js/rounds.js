// ── LOG ROUND MODAL ───────────────────────────────────────────────────────
function clearCourseSelection(){
  selCourse_=null;
  document.getElementById('fCourseSearch').value='';
  document.getElementById('selectedCourseDisplay').style.display='none';
  var dd=document.getElementById('courseDropdown'); if(dd) dd.classList.remove('open');
}
function buildHoles(){
  var l1=document.getElementById('holeLabels1'),l2=document.getElementById('holeLabels2');
  var f=document.getElementById('holesFront'),b=document.getElementById('holesBack');
  if(!f) return;
  f.innerHTML=b.innerHTML=l1.innerHTML=l2.innerHTML='';
  for(var i=1;i<=9;i++){
    l1.innerHTML+='<div class="hole-lbl">'+i+'</div>';
    l2.innerHTML+='<div class="hole-lbl">'+(i+9)+'</div>';
    f.innerHTML+='<input class="hole-inp" id="h'+i+'" type="number" min="1" max="15" placeholder="—">';
    b.innerHTML+='<input class="hole-inp" id="h'+(i+9)+'" type="number" min="1" max="15" placeholder="—">';
  }
  for(var j=1;j<=18;j++)(function(n){var el=document.getElementById('h'+n);if(el)el.addEventListener('input',syncT);})(j);
}
function syncT(){
  var s=0,f=0;
  for(var i=1;i<=18;i++){var el=document.getElementById('h'+i);var v=el?parseInt(el.value):NaN;if(!isNaN(v)){s+=v;f++;}}
  if(f) document.getElementById('fTotal').value=s;
}

// ── COURSE SEARCH ─────────────────────────────────────────────────────────
async function searchCourses(q){
  var dd=document.getElementById('courseDropdown');
  if(!q||q.length<2){dd.classList.remove('open');return;}
  dd.innerHTML='<div class="csearch-opt" style="color:#aaa;font-style:italic;cursor:default;font-size:0.82rem;">Searching…</div>';
  dd.classList.add('open');
  clearTimeout(courseSearchTimer);
  courseSearchTimer=setTimeout(async function(){
    try{
      var ql=q.toLowerCase();
      var r=await sb.from('courses')
        .select('id,name,location,county,par,rating,slope,holes')
        .or('name.ilike.*'+ql+'*,location.ilike.*'+ql+'*,county.ilike.*'+ql+'*')
        .order('name').limit(10);
      if(r.error||!r.data||!r.data.length){
        dd.innerHTML='<div class="csearch-opt" style="color:#aaa;cursor:default;font-style:italic;font-size:0.82rem;">No courses found — <span style="color:var(--gold);cursor:pointer;text-decoration:underline;" onclick="openAddCourse()">add it?</span></div>';
        dd.classList.add('open'); return;
      }
      window._cc=r.data;
      dd.innerHTML=r.data.map(function(c){
        return '<div class="csearch-opt" data-idx="'+c.id+'"><div class="copt-name">'+c.name+'</div><div class="copt-meta">'+c.location+' · Par '+(c.par||'—')+' · '+c.holes+'H · Rating '+(c.rating||'—')+' · Slope '+(c.slope||'—')+'</div></div>';
      }).join('');
      dd.classList.add('open');
    }catch(e){dd.innerHTML='<div class="csearch-opt" style="color:#aaa;cursor:default;">Search error</div>';}
  },300);
}
function pickCourse(id){
  var c=(window._cc||[]).find(function(x){return x.id===id;});
  if(!c) return;
  selCourse_=c;
  document.getElementById('fCourseSearch').value='';
  document.getElementById('courseDropdown').classList.remove('open');
  document.getElementById('selectedCourseName').textContent=c.name+' — '+c.location;
  document.getElementById('selectedCourseDisplay').style.display='block';
  if(c.par) document.getElementById('fPar').value=c.par;
  if(c.rating) document.getElementById('fRating').value=c.rating;
  if(c.slope) document.getElementById('fSlope').value=c.slope;
  toast(c.name+' selected ✓');
}

// ── DATA ──────────────────────────────────────────────────────────────────
async function loadRounds(){
  var r=await sb.from('rounds').select('*').eq('user_id',currentUser.id).order('date',{ascending:true});
  if(!r.error&&r.data) rounds=r.data;
}
async function logRound(){
  if(!selCourse_){toast('Please search and select a course first.');return;}
  var date=document.getElementById('fDate').value;
  var holes=parseInt(document.getElementById('fHoles').value)||18;
  var par=parseInt(document.getElementById('fPar').value)||(holes===9?36:72);
  var rating=parseFloat(document.getElementById('fRating').value)||par;
  var slope=parseInt(document.getElementById('fSlope').value)||113;
  var total=parseInt(document.getElementById('fTotal').value);
  // For 9-hole rounds the par/rating fields hold the course's full 18-hole values
  // (auto-filled when selecting a course), so halve them to match a 9-hole score.
  if(holes===9){
    if(par>=54) par=Math.round(par/2);
    if(rating>=54) rating=parseFloat((rating/2).toFixed(1));
  }
  if(!date){toast('Please select a date.');return;}
  var minScore=holes===9?18:36;
  var maxScore=holes===9?81:150;
  if(isNaN(total)||total<minScore||total>maxScore){toast('Please enter a valid score ('+minScore+'–'+maxScore+').');return;}
  var diff=parseFloat(((total-rating)*113/slope).toFixed(1));
  var btn=document.getElementById('submitBtn');
  btn.innerHTML='<span class="spinner"></span>Saving…'; btn.disabled=true;
  var putts=document.getElementById('fPutts').value?parseInt(document.getElementById('fPutts').value):null;
  var fairways=document.getElementById('fFairways').value?parseInt(document.getElementById('fFairways').value):null;
  var gir=document.getElementById('fGIR').value?parseInt(document.getElementById('fGIR').value):null;
  var penalties=document.getElementById('fPenalties').value?parseInt(document.getElementById('fPenalties').value):null;
  var notes=document.getElementById('fNotes')?document.getElementById('fNotes').value.trim()||null:null;
  var fields={course:selCourse_.name,date:date,par:par,score:total,rating:rating,slope:slope,diff:diff,holes_played:holes,putts:putts,fairways_hit:fairways,greens_in_regulation:gir,penalties:penalties,notes:notes};
  var r;
  if(editingRoundId){
    r=await sb.from('rounds').update(fields).eq('id',editingRoundId).eq('user_id',currentUser.id).select().single();
  } else {
    fields.user_id=currentUser.id;
    r=await sb.from('rounds').insert(fields).select().single();
  }
  btn.innerHTML=editingRoundId?'Save Changes':'Record Round'; btn.disabled=false;
  if(r.error){toast('Error: '+r.error.message);return;}
  if(editingRoundId){
    var ei=rounds.findIndex(function(x){return x.id===editingRoundId;});
    if(ei>=0) rounds[ei]=r.data; else rounds.push(r.data);
  } else {
    rounds.push(r.data);
  }
  rounds.sort(function(a,b){return a.date.localeCompare(b.date);});
  var wasEdit=!!editingRoundId;
  editingRoundId=null;
  // Capture course + photos before the form resets
  var photoCourseId=selCourse_.id, photoCourseName=selCourse_.name;
  var photosToUpload=pendingRoundPhotos.slice();
  clearCourseSelection();
  document.getElementById('fTotal').value='';
  document.getElementById('fHoles').value='18';
  document.getElementById('fPar').value='72';
  ['fPutts','fFairways','fGIR','fPenalties'].forEach(function(id){document.getElementById(id).value='';});
  for(var i=1;i<=18;i++){var el=document.getElementById('h'+i);if(el)el.value='';}
  // Collapse optional panels
  ['courseDetailsPanel','optStatsPanel','holeByHolePanel'].forEach(function(id){
    var p=document.getElementById(id); if(p) p.style.display='none';
  });
  ['toggleCourseDetails','toggleOptStats','toggleHoleByHole'].forEach(function(id){
    var b=document.getElementById(id); if(b){b.classList.remove('open');b.innerHTML=b.innerHTML.replace('－','＋');}
  });
  if(document.getElementById('fNotes')) document.getElementById('fNotes').value='';
  clearRoundPhotos();
  closeLogModal();
  renderAll();
  if(wasEdit){ toast('Round updated ✓'); }
  else { toast('Round recorded!'); maybeCelebrate(r.data); }
  // Upload any attached photos to the course gallery (and the user's profile)
  if(photosToUpload.length){
    toast('Uploading '+photosToUpload.length+' photo'+(photosToUpload.length>1?'s':'')+'…');
    Promise.all(photosToUpload.map(function(f){return uploadPhotoForCourse(f,photoCourseId,photoCourseName);}))
      .then(function(res){ var n=res.filter(Boolean).length; if(n) toast(n+' photo'+(n>1?'s':'')+' added ✓'); });
  }
}
async function deleteRound(id){
  var r=await sb.from('rounds').delete().eq('id',id).eq('user_id',currentUser.id);
  if(r.error){toast('Error deleting.');return;}
  rounds=rounds.filter(function(x){return x.id!==id;}); renderAll(); toast('Round removed.');
}

// ── ROUND DETAIL MODAL ────────────────────────────────────────────────────
var currentRoundId=null;

function openRoundModal(id){
  var r=rounds.find(function(x){return x.id===id;});
  if(!r) return;
  currentRoundId=id;
  var ov=r.score-r.par, ovS=ov===0?'E':(ov>0?'+'+ov:''+ov);
  var ovCol=ov<0?'var(--under)':ov>0?'var(--over)':'var(--gold)';
  document.getElementById('rdCourse').textContent=r.course;
  document.getElementById('rdDate').textContent=fDate(r.date)+' · '+(r.holes_played||18)+' holes';
  document.getElementById('rdScore').textContent=r.score;
  var vp=document.getElementById('rdVsPar');
  vp.textContent=ovS; vp.style.color=ovCol;
  document.getElementById('rdDiff').textContent=parseFloat(r.diff).toFixed(1);

  // Meta tiles (par, rating, slope + any optional stats present)
  var meta=[
    {l:'Par',v:r.par},
    {l:'Course Rating',v:r.rating||'—'},
    {l:'Slope',v:r.slope||'—'}
  ];
  if(r.putts!=null) meta.push({l:'Putts',v:r.putts});
  if(r.fairways_hit!=null) meta.push({l:'Fairways',v:r.fairways_hit+'/14'});
  if(r.greens_in_regulation!=null) meta.push({l:'GIR',v:r.greens_in_regulation+'/18'});
  if(r.penalties!=null) meta.push({l:'Penalties',v:r.penalties});
  document.getElementById('rdMeta').innerHTML=meta.map(function(m){
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 12px;background:var(--ink-soft);border-radius:var(--radius);">'+
      '<span style="font-family:\'Inter\',sans-serif;font-size:0.62rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);">'+m.l+'</span>'+
      '<span style="font-weight:700;color:var(--augusta-deep);font-size:0.9rem;">'+m.v+'</span>'+
    '</div>';
  }).join('');

  // Notes
  var notesEl=document.getElementById('rdNotes');
  if(r.notes){ notesEl.style.display='block'; notesEl.textContent='“'+r.notes+'”'; }
  else { notesEl.style.display='none'; }

  document.getElementById('roundDetailModal').style.display='flex';
}

function closeRoundModal(){
  document.getElementById('roundDetailModal').style.display='none';
  currentRoundId=null;
}

async function confirmDeleteCurrentRound(){
  if(!currentRoundId) return;
  if(!confirm('Delete this round? This cannot be undone.')) return;
  var id=currentRoundId;
  closeRoundModal();
  await deleteRound(id);
}

// ── EDIT A ROUND (reuses the Log a Round modal) ───────────────────────────
var editingRoundId=null;

function editCurrentRound(){
  if(!currentRoundId) return;
  var r=rounds.find(function(x){return x.id===currentRoundId;});
  if(!r) return;
  closeRoundModal();
  openLogModalForEdit(r);
}

function openLogModalForEdit(r){
  editingRoundId=r.id;
  // Open the modal but in edit mode (no reset to today's date)
  document.getElementById('logRoundModal').style.display='flex';
  clearRoundPhotos();
  initRoundPhotoInput();
  document.getElementById('logModalTitle').textContent='Edit Round';
  document.getElementById('submitBtn').textContent='Save Changes';
  // Course (rounds only store the name; rebuild a minimal selection object)
  selCourse_={id:r.course_id||null,name:r.course,par:r.par,rating:r.rating,slope:r.slope};
  document.getElementById('fCourseSearch').value='';
  document.getElementById('selectedCourseName').textContent=r.course;
  document.getElementById('selectedCourseDisplay').style.display='block';
  var dd=document.getElementById('courseDropdown'); if(dd) dd.classList.remove('open');
  // Core fields
  document.getElementById('fDate').value=r.date?r.date.slice(0,10):'';
  document.getElementById('fHoles').value=(r.holes_played===9?'9':'18');
  document.getElementById('fTotal').value=r.score;
  document.getElementById('fNotes').value=r.notes||'';
  // Course details
  document.getElementById('fPar').value=r.par;
  document.getElementById('fRating').value=r.rating||'';
  document.getElementById('fSlope').value=r.slope||'';
  // Optional stats
  document.getElementById('fPutts').value=r.putts!=null?r.putts:'';
  document.getElementById('fFairways').value=r.fairways_hit!=null?r.fairways_hit:'';
  document.getElementById('fGIR').value=r.greens_in_regulation!=null?r.greens_in_regulation:'';
  document.getElementById('fPenalties').value=r.penalties!=null?r.penalties:'';
  // Clear any stale hole-by-hole inputs (edit uses the total directly)
  for(var i=1;i<=18;i++){var h=document.getElementById('h'+i);if(h)h.value='';}
  // Expand any optional panel that has data so the user can see/change it
  expandPanelIf('courseDetailsPanel','toggleCourseDetails', r.rating||r.slope);
  expandPanelIf('optStatsPanel','toggleOptStats', r.putts!=null||r.fairways_hit!=null||r.greens_in_regulation!=null||r.penalties!=null);
}

function expandPanelIf(panelId,btnId,cond){
  var p=document.getElementById(panelId), b=document.getElementById(btnId);
  if(!p||!b) return;
  var open=p.style.display==='block';
  if(cond&&!open){ p.style.display='block'; b.classList.add('open'); b.innerHTML=b.innerHTML.replace('＋','－'); }
  else if(!cond&&open){ p.style.display='none'; b.classList.remove('open'); b.innerHTML=b.innerHTML.replace('－','＋'); }
}
async function clearAllRounds(){
  if(!confirm('Delete all rounds? Cannot be undone.')) return;
  var r=await sb.from('rounds').delete().eq('user_id',currentUser.id);
  if(r.error){toast('Error.');return;}
  rounds=[]; renderAll(); toast('History cleared.');
}

// ── HANDICAP ──────────────────────────────────────────────────────────────
function calcHcp(rs){
  if(!rs||!rs.length) return null;

  // Build a chronological list of 18-hole-equivalent differentials.
  // - 18-hole rounds use their differential directly.
  // - Each 9-hole round is converted to an 18-hole equivalent (× 2), so it
  //   counts immediately rather than waiting to be paired with another.
  var combined=rs.map(function(r){
    if(r.holes_played===9) return parseFloat((r.diff*2).toFixed(1));
    return r.diff;
  });
  if(!combined.length) return null;

  var n=combined.length;
  var count=n>=20?8:n>=17?7:n>=14?6:n>=11?5:n>=9?4:n>=7?3:n>=5?2:n>=3?1:null;
  if(!count) return null;

  // Most recent 20 rounds, then take the best 'count' differentials
  var diffs=combined.slice(-20).sort(function(a,b){return a-b;});
  var avg=diffs.slice(0,count).reduce(function(s,v){return s+v;},0)/count;
  return Math.round(avg*10)/10;
}

