// ── COURSES BROWSER ───────────────────────────────────────────────────────
async function renderCoursesBrowser(){
  if(!sb) return;
  var q=(document.getElementById('courseBrowserSearch')&&document.getElementById('courseBrowserSearch').value||'').toLowerCase();
  var grid=document.getElementById('coursesGrid');
  grid.innerHTML='<div class="skel" style="height:220px;"></div>'.repeat(6);
  try{
    var query=sb.from('courses').select('id,name,location,county,country,par,yardage,rating,slope,holes,type').order('name').limit(200);
    if(q) query=query.or('name.ilike.*'+q+'*,location.ilike.*'+q+'*,county.ilike.*'+q+'*');
    if(cFilter==='18') query=query.eq('holes',18);
    else if(cFilter==='9') query=query.eq('holes',9);
    else if(['links','parkland','heathland','moorland','downland'].indexOf(cFilter)>-1) query=query.eq('type',cFilter);
    var r=await query;
    if(r.error||!r.data){grid.innerHTML='<div class="courses-empty">Could not load courses: '+(r.error?r.error.message:'')+'</div>';return;}
    var data=r.data;
    document.getElementById('courseCount').textContent=data.length+(data.length===200?'+':'')+' courses';
    var tmap={links:'tag-links',parkland:'tag-parkland',heathland:'tag-heathland',moorland:'tag-moorland',downland:'tag-downland'};
    if(!data.length){grid.innerHTML='<div class="courses-empty">No courses match your search.</div>';return;}

    // Fetch review averages for visible courses
    var ids=data.map(function(c){return c.id;});
    var revR=await sb.from('course_reviews').select('course_id,overall,difficulty').in('course_id',ids);
    var revMap={};
    (revR.data||[]).forEach(function(rv){
      if(!revMap[rv.course_id]) revMap[rv.course_id]={sum:0,count:0,diffSum:0,diffCount:0};
      if(rv.overall){revMap[rv.course_id].sum+=rv.overall;revMap[rv.course_id].count++;}
      if(rv.difficulty){revMap[rv.course_id].diffSum+=rv.difficulty;revMap[rv.course_id].diffCount++;}
    });

    // Fetch one photo per visible course for the card banner
    var photoMap={};
    try{
      var photoR=await sb.from('course_photos').select('course_id,url').in('course_id',ids);
      (photoR.data||[]).forEach(function(p){ if(!photoMap[p.course_id]) photoMap[p.course_id]=p.url; });
    }catch(e){}

    // Played courses for this user
    var playedIds={};
    rounds.forEach(function(ro){ playedIds[ro.course]=true; });

    grid.innerHTML=data.map(function(c){
      var rv=revMap[c.id];
      var avgRating=rv&&rv.count?Math.round(rv.sum/rv.count*10)/10:null;
      var avgDiff=rv&&rv.diffCount?Math.round(rv.diffSum/rv.diffCount*10)/10:null;
      var played=rounds.some(function(ro){return ro.course===c.name;});
      var stars=avgRating?'★'.repeat(Math.round(avgRating))+'☆'.repeat(5-Math.round(avgRating)):'☆☆☆☆☆';
      var photoUrl=photoMap[c.id];
      return '<div class="course-card">'+
        (photoUrl?'<div style="margin:-20px -22px 14px;height:130px;overflow:hidden;"><img src="'+photoUrl+'" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.parentNode.style.display=\'none\'"></div>':'')+
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:2px;">'+
          '<div class="cc-name">'+c.name+'</div>'+
          (played?'<span class="cc-played-badge">✓ Played</span>':'')+
        '</div>'+
        '<div class="cc-loc">📍 '+c.location+(c.county?', '+c.county:'')+'</div>'+
        '<div class="cc-tags">'+
          '<span class="cc-tag '+(c.holes===18?'tag-18':'tag-9')+'\">'+c.holes+' holes</span>'+
          '<span class="cc-tag '+(tmap[c.type]||'tag-parkland')+'\">'+(c.type||'parkland')+'</span>'+
          (c.country&&c.country!=='England'?'<span class="cc-tag" style="border-color:#c8d8e8;color:#2a4a6a;background:#f0f5fc;">'+c.country+'</span>':'')+
        '</div>'+
        '<div class="cc-stats">'+
          '<div class="cc-stat"><div class="cc-stat-v">'+(c.par||'—')+'</div><div class="cc-stat-l">Par</div></div>'+
          '<div class="cc-stat"><div class="cc-stat-v">'+(c.yardage?c.yardage.toLocaleString():'—')+'</div><div class="cc-stat-l">Yards</div></div>'+
          '<div class="cc-stat"><div class="cc-stat-v">'+(c.rating||'—')+'</div><div class="cc-stat-l">Rating</div></div>'+
          '<div class="cc-stat"><div class="cc-stat-v">'+(c.slope||'—')+'</div><div class="cc-stat-l">Slope</div></div>'+
        '</div>'+
        '<div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;">'+
          '<div>'+
            '<span style="color:var(--gold);font-size:0.85rem;letter-spacing:1px;">'+stars+'</span>'+
            (avgRating?'<span style="font-size:0.72rem;color:var(--text-muted);margin-left:5px;">'+avgRating+'/5'+(rv.count?' ('+rv.count+')':(')'))+'</span>':'<span style="font-size:0.72rem;color:var(--text-muted);margin-left:5px;">No reviews yet</span>')+
          '</div>'+
          (avgDiff?'<span style="font-family:\'Inter\',sans-serif;font-size:0.6rem;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-muted);">Difficulty: '+avgDiff+'/5</span>':'')+
        '</div>'+
        '<div style="display:flex;gap:8px;margin-top:10px;">'+
          '<button class="cc-action-btn review-btn" data-id="'+c.id+'" data-name="'+c.name.replace(/"/g,'&quot;')+'" data-loc="'+(c.location||'')+'" data-county="'+(c.county||'')+'">Review</button>'+
          '<button class="cc-action-btn weather-btn" data-name="'+c.name.replace(/"/g,'&quot;')+'" data-loc="'+(c.location||'').replace(/"/g,'&quot;')+'">Weather</button>'+
          '<button class="cc-action-btn book-btn" data-name="'+c.name.replace(/"/g,'&quot;')+'" data-loc="'+(c.location||'').replace(/"/g,'&quot;')+'">Book</button>'+
        '</div>'+
      '</div>';
    }).join('');
  }catch(e){grid.innerHTML='<div class="courses-empty">Error: '+e.message+'</div>';}
}
function setCourseFilter(f,btn){
  cFilter=f;
  document.querySelectorAll('.filter-pill').forEach(function(b){b.classList.remove('active');});
  if(btn) btn.classList.add('active');
  renderCoursesBrowser();
}

// ── ADD COURSE MODAL ──────────────────────────────────────────────────────
function openAddCourse(){
  document.getElementById('addCourseModal').style.display='flex';
}
function closeAddCourse(){
  document.getElementById('addCourseModal').style.display='none';
  ['acName','acLocation','acCounty','acPar','acYardage','acRating','acSlope'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
}
document.getElementById('addCourseModal').addEventListener('click',function(e){if(e.target===this)closeAddCourse();});
document.getElementById('reviewModal').addEventListener('click',function(e){if(e.target===this)closeReviewModal();});
document.getElementById('weatherModal').addEventListener('click',function(e){if(e.target===this)closeWeatherModal();});
async function submitCourse(){
  var name=document.getElementById('acName').value.trim();
  var location=document.getElementById('acLocation').value.trim();
  var county=document.getElementById('acCounty').value.trim()||null;
  var country=document.getElementById('acCountry').value;
  var par=parseInt(document.getElementById('acPar').value)||72;
  var yardage=parseInt(document.getElementById('acYardage').value)||null;
  var rating=parseFloat(document.getElementById('acRating').value)||null;
  var slope=parseInt(document.getElementById('acSlope').value)||null;
  var holes=parseInt(document.getElementById('acHoles').value)||18;
  var type=document.getElementById('acType').value||'parkland';
  if(!name||!location){toast('Please enter course name and location.');return;}
  var timeout=new Promise(function(_,reject){setTimeout(function(){reject(new Error('Timed out — check Supabase RLS policies'));},10000);});
  try{
    var insert=sb.from('courses').insert({name:name,location:location,county:county,country:country,par:par,yardage:yardage,rating:rating,slope:slope,holes:holes,type:type,submitted_by:currentUser.id}).select().single();
    var r=await Promise.race([insert,timeout]);
    if(r.error){toast('Error: '+r.error.message);return;}
    toast('Course added ✓');
    closeAddCourse();
  }catch(err){toast('Error: '+err.message);}
}

