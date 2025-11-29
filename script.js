const API_BASE = ""; // empty => same origin

let tasks = [];

function $(id){ return document.getElementById(id); }

function renderTasks(){
  const el = $("taskList");
  el.innerHTML = "";
  tasks.forEach((t, idx) => {
    const div = document.createElement("div");
    div.className = "task-item";
    div.innerHTML = `<div>
      <div style="font-weight:700">${t.id} — ${t.title}</div>
      <div class="small">due: ${t.due_date || "—"} · est: ${t.estimated_hours}h · imp: ${t.importance}</div>
      <div class="small">deps: ${(t.dependencies||[]).join(", ") || "none"}</div>
    </div>`;
    const right = document.createElement("div");
    const rm = document.createElement("button");
    rm.textContent = "Remove";
    rm.style.background = "#ef4444";
    rm.onclick = ()=>{ tasks.splice(idx,1); renderTasks(); refreshRaw(); };
    right.appendChild(rm);
    div.appendChild(right);
    el.appendChild(div);
  });
  refreshRaw();
}

function refreshRaw(){ $("rawjson").textContent = JSON.stringify(tasks, null, 2); }

$("addTask").onclick = ()=>{
  const title = $("t_title").value.trim() || "Untitled";
  const due = $("t_due").value || null;
  const hours = parseFloat($("t_hours").value) || 2;
  const imp = parseInt($("t_imp").value) || 5;
  const depsRaw = $("t_deps").value.trim();
  const deps = depsRaw ? depsRaw.split(",").map(s=>s.trim()).filter(Boolean) : [];
  const id = "task-" + (tasks.length + 1) + "-" + Math.random().toString(36).slice(2,6);
  const t = { id, title, due_date: due, estimated_hours: hours, importance: imp, dependencies: deps };
  tasks.push(t);
  renderTasks();
};

$("clearTasks").onclick = ()=>{ tasks = []; renderTasks(); };

$("loadBulk").onclick = ()=>{
  try {
    const arr = JSON.parse($("bulk").value);
    if (!Array.isArray(arr)) throw "Not an array";
    arr.forEach((t,i)=>{ if(!t.id) t.id = "bulk-"+(i+1)+"-"+Math.random().toString(36).slice(2,5); if(!t.dependencies) t.dependencies = []; });
    tasks = tasks.concat(arr);
    renderTasks();
  } catch(e){ alert("Invalid JSON: " + e); }
};

async function analyzeOrSuggest(path){
  $("loading").textContent = "Loading...";
  const strat = $("strategy").value;
  try {
    const res = await fetch(API_BASE + path + "?strategy=" + encodeURIComponent(strat), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tasks)
    });
    const data = await res.json();
    if (!res.ok) {
      $("results").innerHTML = `<pre>${JSON.stringify(data,null,2)}</pre>`;
    } else {
      if (path.includes("analyze")) renderAnalyze(data);
      else renderSuggest(data);
    }
  } catch(err){
    alert("Request failed: " + err);
  } finally {
    $("loading").textContent = "";
  }
}

$("analyzeBtn").onclick = ()=> analyzeOrSuggest("/api/tasks/analyze/");
$("suggestBtn").onclick = ()=> analyzeOrSuggest("/api/tasks/suggest/");

function renderAnalyze(data){
  const out = $("results");
  out.innerHTML = "";
  if (data.cycles && data.cycles.length){
    const c = document.createElement("div");
    c.style.background = "#fff3cd";
    c.style.padding = "8px";
    c.style.borderRadius = "6px";
    c.style.marginBottom = "8px";
    c.innerHTML = `<strong>Dependency cycles:</strong> ${JSON.stringify(data.cycles)}`;
    out.appendChild(c);
  }
  data.tasks.forEach(t=>{
    const card = document.createElement("div");
    card.className = "task-item";
    const badge = document.createElement("div");
    badge.className = "badge " + t.priority_label;
    badge.textContent = t.priority_label;
    badge.style.marginRight = "8px";
    card.innerHTML = `<div>
      <div style="font-weight:700">${t.title} <span style="font-weight:400; color:#475569">(${t.id})</span></div>
      <div class="small">due: ${t.due_date || "—"} · est: ${t.estimated_hours}h · imp: ${t.importance}</div>
      <div class="small">score: ${t.score} · warnings: ${(t.warnings||[]).join(", ")||"none"}</div>
    </div>`;
    card.prepend(badge);
    out.appendChild(card);
  });
  $("rawjson").textContent = JSON.stringify(data, null, 2);
}

function renderSuggest(data){
  const out = $("results");
  out.innerHTML = "<h3>Top Suggestions</h3>";
  data.suggestions.forEach(s=>{
    const div = document.createElement("div");
    div.className = "task-item";
    div.innerHTML = `<div>
      <div style="font-weight:700">${s.title} <span style="font-weight:400; color:#475569">(${s.id})</span></div>
      <div class="small">score: ${s.score} · ${s.priority_label}</div>
      <div class="small">explanation: ${s.explanation}</div>
      <div class="small">issues: ${(s.issues||[]).join(", ") || "none"}</div>
    </div>`;
    const btn = document.createElement("button");
    btn.textContent = "Mark done (local)";
    btn.onclick = ()=>{
      tasks = tasks.filter(x=>x.id !== s.id);
      renderTasks();
      div.remove();
    };
    div.appendChild(btn);
    out.appendChild(div);
  });
  $("rawjson").textContent = JSON.stringify(data, null, 2);
}

renderTasks();
