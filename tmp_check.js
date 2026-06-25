
const EMOJI_MAP = {
  "会議":"💬","通勤":"🚃","レビュー":"💻","作業":"⌨️","資料作成":"✏️","メール":"📧",
  "勉強":"📚","運動":"🏃","散歩":"🚶","家事":"🧹","育児":"🍼","通話":"📞",
  "睡眠":"🛌","食事":"🍙","休憩":"☕","昼寝":"😴","ゲーム":"🎮","読書":"📖","入浴":"🛁"
};
const ASSET_BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/';
const ACTION_CONFIG = {
  "会議":{name:"Folded hands",file:"folded_hands_3d.png",alt:"会議"},
  "通勤":{name:"Automobile",file:"automobile_3d.png",alt:"通勤"},
  "レビュー":{name:"Laptop",file:"laptop_3d.png",alt:"レビュー"},
  "作業":{name:"Keyboard",file:"keyboard_3d.png",alt:"作業"},
  "資料作成":{name:"Memo",file:"memo_3d.png",alt:"資料作成"},
  "メール":{name:"Envelope",file:"envelope_3d.png",alt:"メール"},
  "勉強":{name:"Books",file:"books_3d.png",alt:"勉強"},
  "運動":{name:"Person running",file:"person_running_3d.png",alt:"運動"},
  "散歩":{name:"Person walking",file:"person_walking_3d.png",alt:"散歩"},
  "家事":{name:"Broom",file:"broom_3d.png",alt:"家事"},
  "育児":{name:"Baby bottle",file:"baby_bottle_3d.png",alt:"育児"},
  "通話":{name:"Telephone receiver",file:"telephone_receiver_3d.png",alt:"通話"},
  "睡眠":{name:"Bed",file:"bed_3d.png",alt:"睡眠"},
  "食事":{name:"Bento box",file:"bento_box_3d.png",alt:"食事"},
  "休憩":{name:"Hot beverage",file:"hot_beverage_3d.png",alt:"休憩"},
  "昼寝":{name:"Sleeping face",file:"sleeping_face_3d.png",alt:"昼寝"},
  "ゲーム":{name:"Video game",file:"video_game_3d.png",alt:"ゲーム"},
  "読書":{name:"Open book",file:"open_book_3d.png",alt:"読書"},
  "入浴":{name:"Bathtub",file:"bathtub_3d.png",alt:"入浴"}
};
const DEFAULT_ASSET = {name:"Beaming face with smiling eyes",file:"beaming_face_with_smiling_eyes_3d.png",alt:"emoji"};
const ACTIONS = Object.keys(EMOJI_MAP);
const MOODS = ["😆","🙂","😌","🥲","😩","😢"];

function assetUrl(config){
  return ASSET_BASE + encodeURIComponent(config.name) + "/3D/" + config.file;
}
function actionAsset(action){
  return ACTION_CONFIG[action] || DEFAULT_ASSET;
}
function getRandomAction(){
  const pile = state.entries.filter(e=>e.delta>0 && !e.exp);
  if(pile.length) return pile[Math.floor(Math.random()*pile.length)].act;
  return ACTIONS[Math.floor(Math.random()*ACTIONS.length)];
}

function createImageBody(act,size){
  const config = actionAsset(act);
  return {
    act,
    size,
    radius:size * 0.44,
    x:0,
    y:0,
    vx:0,
    vy:0,
    angle:(Math.random()-.5) * 0.5,
    va:(Math.random()-.5) * 2,
    src:assetUrl(config),
    alt:config.alt
  };
}

class ShakaScene {
  constructor(el, options={}){
    this.el = el;
    this.full = !!options.full;
    this.bodies = [];
    this.running = false;
    this.width = 0;
    this.height = 0;
    this.lastTime = 0;
    this.gravity = 1800;
    this.bounce = 0.28;
    this.drag = 0.995;
    this.floorBounce = 0.32;
    this.maxCount = this.full ? 60 : 42;
  }
  measure(){
    const rect = this.el.getBoundingClientRect();
    this.width = rect.width || 320;
    this.height = rect.height || 640;
  }
  reset(){
    this.stop();
    this.el.innerHTML = "";
    this.measure();
    this.bodies = [];
    const count = Math.min(this.maxCount, Math.max(18, Math.round(fatigue())));
    for(let i=0;i<count;i++){
      const size = 24 + Math.random() * 18;
      const act = getRandomAction();
      const body = createImageBody(act, size);
      body.x = 8 + Math.random() * Math.max(0, this.width - body.size - 16);
      body.y = this.height + Math.random() * 140;
      body.vx = (Math.random() - 0.5) * 90;
      body.vy = -Math.random() * 90;
      body.el = this.createBody(body);
      this.bodies.push(body);
    }
    this.start();
    requestAnimationFrame(()=>this.bodies.forEach(b=>b.el.style.opacity="1"));
  }
  createBody(body){
    const span = document.createElement("span");
    span.style.width = body.size + "px";
    span.style.height = body.size + "px";
    span.style.left = body.x + "px";
    span.style.bottom = body.y + "px";
    const img = document.createElement("img");
    img.src = body.src;
    img.alt = body.alt;
    span.appendChild(img);
    this.el.appendChild(span);
    return span;
  }
  start(){
    if(this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick();
  }
  stop(){
    this.running = false;
  }
  tick(){
    if(!this.running) return;
    const now = performance.now();
    const dt = Math.min(0.032, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.step(dt);
    requestAnimationFrame(()=>this.tick());
  }
  step(dt){
    this.measure();
    const bodies = this.bodies;
    for(const body of bodies){
      body.vy += this.gravity * dt;
      body.vx *= this.drag;
      body.vy *= 0.998;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.angle += body.va * dt;
      if(body.x < 0){ body.x = 0; body.vx = Math.abs(body.vx) * this.bounce; }
      const rightLimit = this.width - body.size;
      if(body.x > rightLimit){ body.x = rightLimit; body.vx = -Math.abs(body.vx) * this.bounce; }
      if(body.y < 0){ body.y = 0; body.vy = -body.vy * this.floorBounce; body.vx *= 0.82; if(Math.abs(body.vy) < 30) body.vy = 0; }
    }
    const len = bodies.length;
    for(let i=0;i<len;i++){
      for(let j=i+1;j<len;j++){
        const a = bodies[i];
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
        const minDist = a.radius + b.radius;
        if(dist < minDist){
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if(rel < 0){
            const impulse = -(1 + this.bounce) * rel * 0.5;
            a.vx -= impulse * nx;
            a.vy -= impulse * ny;
            b.vx += impulse * nx;
            b.vy += impulse * ny;
          }
        }
      }
    }
    this.updateElements();
  }
  updateElements(){
    const right = this.width;
    const top = this.height;
    for(const body of this.bodies){
      body.el.style.left = `${Math.max(0, Math.min(right - body.size, body.x))}px`;
      body.el.style.bottom = `${Math.max(0, Math.min(top - body.size, body.y))}px`;
      body.el.style.transform = `rotate(${body.angle}rad)`;
    }
  }
  shake(){
    for(const body of this.bodies){
      body.vx += (Math.random() - 0.5) * 420;
      body.vy += -Math.random() * 320;
    }
    this.start();
  }
  organize(){
    this.stop();
    this.measure();
    const cols = Math.min(10, this.bodies.length);
    const margin = 12;
    const gapX = (this.width - margin*2) / cols;
    this.bodies.forEach((body, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      body.vx = 0;
      body.vy = 0;
      body.x = margin + col * gapX + (gapX - body.size) / 2;
      body.y = margin + row * (body.size + 6);
      body.angle = (Math.random() - 0.5) * 0.35;
      if(body.el) body.el.style.opacity = "1";
    });
    this.updateElements();
  }
}

let sceneFront, sceneBack;

function renderList(){
  const list = document.getElementById("list");
  list.innerHTML="";
  state.entries.forEach((e,i)=>{
    const d=document.createElement("div");
    d.className="item"+(e.exp?" exp":"");
    const sign=e.delta>=0?"+":"−";
    const col=e.delta>=0?"var(--ink-2)":"var(--lime-ink)";
    d.innerHTML=`<div class="tt"><span class="f">${e.from}</span><span class="t">${e.to}</span></div>
      <div class="bd"><span class="ttl">${EMOJI_MAP[e.act]||""} ${e.title||e.act}</span><span class="face">${e.mood}</span>
      <span class="d" style="color:${col}">${sign}${Math.abs(e.delta)}</span></div>`;
    d.onclick=()=>openDetail(i);
    list.appendChild(d);
  });
}

function tickClock(){
  const d=new Date();
  const hh=String(d.getHours()).padStart(2,"0");
  const mm=String(d.getMinutes()).padStart(2,"0");
  const bc=document.getElementById("backClock");
  if(bc) bc.textContent=hh+":"+mm;
  document.querySelectorAll(".statusbar span:first-child").forEach(s=>s.textContent=d.getHours()+":"+mm);
}

function renderAll(){
  renderList();
  if(!sceneFront){
    sceneFront = new ShakaScene(document.getElementById("shakaFront"), {full:false});
  } else {
    sceneFront.reset();
  }
  if(!sceneBack){
    sceneBack = new ShakaScene(document.getElementById("shakaBack"), {full:true});
  } else {
    sceneBack.reset();
  }
  tickClock();
}

const flip=document.getElementById("flip");
const faceFront=document.querySelector(".face.front");
const faceBack=document.querySelector(".face.back");
function showBack(){
  flip.classList.add("flipped");
  faceFront.style.cssText="opacity:0;pointer-events:none;z-index:1";
  faceBack.style.cssText="opacity:1;pointer-events:auto;z-index:3";
}
function showFront(){
  flip.classList.remove("flipped");
  faceBack.style.cssText="opacity:0;pointer-events:none;z-index:1";
  faceFront.style.cssText="opacity:1;pointer-events:auto;z-index:2";
}
document.getElementById("toShaka").onclick=()=>{ state.sortMode=false; sceneBack && sceneBack.reset(); showBack(); };
document.getElementById("toTimeline").onclick=()=>{ document.getElementById("drawer").classList.remove("open"); showFront(); };

document.getElementById("drawerTab").onclick=()=>document.getElementById("drawer").classList.toggle("open");

let motionOn=false;
let lastMotion={x:null,y:null,z:null};
function enableMotion(){
  if(motionOn) return;
  if(typeof DeviceMotionEvent==='undefined'){
    toast("⚠️","この端末では振動検知が使えません。");
    return;
  }
  const attach = ()=>{
    window.addEventListener('devicemotion', onMotion);
    motionOn=true;
    toast("📳","本体振動を検知するようにしました");
  };
  if(typeof DeviceMotionEvent.requestPermission==='function'){
    DeviceMotionEvent.requestPermission().then(result=>{
      if(result==='granted') attach();
      else toast("⚠️","振動検知の許可が必要です。");
    }).catch(()=>toast("⚠️","振動検知の許可取得に失敗しました。"));
  } else {
    attach();
  }
}
function onMotion(event){
  const acc = event.accelerationIncludingGravity || event.acceleration;
  if(!acc || acc.x==null) return;
  if(lastMotion.x!=null){
    const d = Math.abs(acc.x-lastMotion.x)+Math.abs(acc.y-lastMotion.y)+Math.abs(acc.z-lastMotion.z);
    if(d > 13) performShake();
  }
  lastMotion = {x:acc.x, y:acc.y, z:acc.z};
}
function performShake(){
  state.sortMode=false;
  sceneBack && sceneBack.shake();
  sceneFront && sceneFront.shake();
  toast("🫨","シャカシャカ…");
}

document.getElementById("shakeBtn").onclick=()=>{ enableMotion(); performShake(); };
document.getElementById("sortBtn").onclick=()=>{ state.sortMode=true; sceneBack && sceneBack.organize(); toast("🧺","きれいにそろえた"); };

let toastT;
function toast(em,txt){
  const t=document.getElementById("toast");
  t.innerHTML=`<span class="em">${em}</span>${txt}`;
  t.classList.add("on"); clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove("on"),1600);
}

const scrim=document.getElementById("scrim"), addSheet=document.getElementById("addSheet");
let sel={title:"",act:"会議",mood:"🥲",delta:12};
function buildAddSheet(){
  const ac=document.getElementById("actChips"); ac.innerHTML="";
  ACTIONS.forEach(a=>{
    const c=document.createElement("button");
    c.className="chip"+(a===sel.act?" sel":""); c.innerHTML=`${EMOJI_MAP[a]} ${a}`;
    c.onclick=()=>{sel.act=a;buildAddSheet();}; ac.appendChild(c);
  });
  const mr=document.getElementById("moodRow"); mr.innerHTML="";
  MOODS.forEach(m=>{
    const b=document.createElement("button");
    b.className="moodbtn"+(m===sel.mood?" sel":""); b.textContent=m;
    b.onclick=()=>{sel.mood=m;buildAddSheet();}; mr.appendChild(b);
  });
  document.getElementById("deltaNum").value=sel.delta;
  updateGrid();
}
function updateGrid(){
  const grid=document.getElementById("emojiGrid");
  const em=EMOJI_MAP[sel.act]||"✨";
  grid.innerHTML=Array.from({length:Math.abs(sel.delta)},()=>`<span>${em}</span>`).join("");
  grid.style.opacity=sel.delta>=0?1:.25;
}
function openAdd(){
  sel={title:"",act:"会議",mood:"🥲",delta:12};
  document.getElementById("tTitle").value="";
  buildAddSheet(); scrim.classList.add("on"); addSheet.classList.add("on");
}
function closeSheets(){ scrim.classList.remove("on"); addSheet.classList.remove("on"); document.getElementById("detailSheet").classList.remove("on"); }
document.getElementById("addBtn").onclick=openAdd;
document.getElementById("cancelAdd").onclick=closeSheets;
scrim.onclick=closeSheets;

document.getElementById("tTitle").oninput=(e)=>{
  const t=e.target.value;
  const found=ACTIONS.find(a=>t.includes(a));
  if(found && found!==sel.act){ sel.act=found; buildAddSheet(); }
};
document.getElementById("stepUp").onclick=()=>{ sel.delta=Math.min(100,sel.delta+1); document.getElementById("deltaNum").value=sel.delta; updateGrid(); };
document.getElementById("stepDown").onclick=()=>{ sel.delta=Math.max(-100,sel.delta-1); document.getElementById("deltaNum").value=sel.delta; updateGrid(); };
document.getElementById("deltaNum").oninput=(e)=>{ sel.delta=Math.max(-100,Math.min(100,Math.round(+e.target.value||0))); updateGrid(); };
document.getElementById("saveAdd").onclick=()=>{
  const from=document.getElementById("tFrom").value, to=document.getElementById("tTo").value;
  const title=(document.getElementById("tTitle").value||"").trim() || sel.act;
  const delta=sel.delta;
  if(sel.act==="睡眠"){
    state.entries.forEach(e=>e.exp=true);
    state.entries.push({from,to,title,act:"睡眠",mood:sel.mood,delta:0,exp:false});
    state.entries.sort((a,b)=>a.from.localeCompare(b.from));
    state.sortMode=false;
    closeSheets(); showFront(); renderAll(); save();
    toast("🛌","眠った。ケースを空にした");
    return;
  }
  state.entries.push({from,to,title,act:sel.act,mood:sel.mood,delta,exp:false});
  state.entries.sort((a,b)=>a.from.localeCompare(b.from));
  closeSheets(); renderAll();
  toast(EMOJI_MAP[sel.act]||"✨", delta>=0?"記録した（+"+delta+"）":"回復した（"+delta+"）");
  save();
};

const detailSheet=document.getElementById("detailSheet");
function openDetail(i){
  const e=state.entries[i];
  const body=document.getElementById("detailBody");
  const sign=e.delta>=0?"+":"−";
  body.innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
      <div style="font-size:40px;filter:drop-shadow(0 4px 5px rgba(27,27,24,.2))">${EMOJI_MAP[e.act]||"✨"}</div>
      <div style="flex:1"><div style="font-size:19px;font-weight:700">${e.title||e.act}</div>
        <div class="caps">${e.from} – ${e.to} ・ ${e.mood}</div></div>
      <div style="font-family:var(--font-display);font-weight:800;font-size:30px;color:${e.delta>=0?'var(--ink)':'var(--lime-ink)'}">${sign}${Math.abs(e.delta)}</div>
    </div>
    <div style="background:var(--surface-sunk);border-radius:12px;padding:12px 14px;font-size:13px;color:var(--ink-2);margin:14px 0 18px">
      ${e.delta>0
        ? (e.exp?"この行動の疲労はもう効果が切れています。ケースから消せます。":"この行動はいまケースに積もっています。食事や休憩から1時間ほどで効果が切れ、消せるようになります。")
        : "回復のログ。睡眠後はまとめてケースを空にできます。"}
    </div>
    <div style="display:flex;gap:10px">
      ${e.delta>0 && !e.exp
        ? `<button class="btn sunk" style="flex:1;padding:13px" data-act="expire">効果が切れた</button>`
        : ``}
      <button class="btn ${e.delta>0&&!e.exp?'pink':'pri'}" style="flex:1;padding:13px" data-act="remove">この項目を消す</button>
    </div>`;
  body.querySelectorAll("button").forEach(b=>{
    b.onclick=()=>{
      const a=b.dataset.act;
      if(a==="expire"){ e.exp=true; toast("⌛","効果が切れた"); }
      else { state.entries.splice(i,1); toast("🧹","消した"); }
      closeSheets(); renderAll(); save();
    };
  });
  scrim.classList.add("on"); detailSheet.classList.add("on");
}

function save(){ try{localStorage.setItem("shaka_proto_v2",JSON.stringify(state));}catch(e){} }
function load(){ try{const s=localStorage.getItem("shaka_proto_v2"); if(s) state=JSON.parse(s);}catch(e){} }
load(); renderAll();
setInterval(tickClock,1000);
