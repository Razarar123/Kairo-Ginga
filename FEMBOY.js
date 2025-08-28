// ====== Quiz Pro — full JS ======

// ---------- Data (replace with your real banks) ----------
const BANK = {
  "Microbiology": {
    "Set 1": [
      { id: "mb1", q: "Gram-positive bacteria have:", options: [
          "A thin peptidoglycan layer and outer membrane",
          "A thick peptidoglycan layer and no outer membrane",
          "No peptidoglycan",
          "A periplasmic flagellum only"
        ], answer: 1 },
      { id: "mb2", q: "Which stain is primary in Gram staining?", options: [
          "Safranin", "Crystal violet", "Carbol fuchsin", "Methylene blue"
        ], answer: 1 },
      { id: "mb3", q: "Endospores are typically produced by:", options: [
          "E. coli", "Staphylococcus", "Bacillus and Clostridium", "Mycoplasma"
        ], answer: 2 },
      { id: "mb4", q: "Which structure enables bacterial conjugation?", options: [
          "Fimbriae", "Sex pilus", "Flagellum", "Capsule"
        ], answer: 1 },
      { id: "mb5", q: "Optimal autoclave sterilization condition:", options: [
          "100°C for 15 min at 1 atm", "121°C for 15 min at 15 psi",
          "160°C for 1 hour", "4°C overnight"
        ], answer: 1 }
    ],
    "Set 2": [
      { id: "mb6", q: "Which is NOT a bacterial shape?", options: [
          "Coccus", "Bacillus", "Spirillum", "Prion"
        ], answer: 3 },
      { id: "mb7", q: "Mycobacterium cell wall contains:", options: [
          "Teichoic acid", "LPS", "Mycolic acids", "No lipids"
        ], answer: 2 },
      { id: "mb8", q: "Koch's postulates relate to:", options: [
          "Determining antibiotic resistance", "Establishing causative agent of disease",
          "Measuring growth rate", "Vaccine development"
        ], answer: 1 },
      { id: "mb9", q: "Bacterial growth phase with constant rate:", options: [
          "Lag", "Log (exponential)", "Stationary", "Death"
        ], answer: 1 },
      { id: "mb10", q: "Antiseptics are used on:", options: [
          "Inert surfaces", "Living tissues", "Laboratory benches", "Surgical instruments only"
        ], answer: 1 }
    ]
  },
  "Photosynthesis": {
    "Set 1": [
      { id: "ps1", q: "Primary pigment in photosynthesis:", options: [
          "Carotene", "Chlorophyll a", "Phycoerythrin", "Xanthophyll"
        ], answer: 1 },
      { id: "ps2", q: "Light reactions occur in:", options: [
          "Stroma", "Matrix", "Thylakoid membrane", "Cytosol"
        ], answer: 2 },
      { id: "ps3", q: "Calvin cycle product that exits the cycle:", options: [
          "Glucose", "G3P", "Pyruvate", "NADPH"
        ], answer: 1 },
      { id: "ps4", q: "Photosystem II primary electron donor:", options: [
          "P680", "P700", "NADPH", "ATP"
        ], answer: 0 },
      { id: "ps5", q: "C4 plants first fix CO2 into:", options: [
          "3-phosphoglycerate", "Oxaloacetate (4C)", "Acetyl-CoA", "Glucose"
        ], answer: 1 }
    ]
  }
};

// ---------- State ----------
const LS_HISTORY = "quiz_wrong_history_v1";
let current = {
  subject: null,
  set: null,
  quiz: [],
  idx: 0,
  score: 0,
};

// ---------- Utils ----------
const $ = (s,scope=document)=>scope.querySelector(s);
const $$ = (s,scope=document)=>[...scope.querySelectorAll(s)];

function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

function rand(){ // cryptographically better random [0,1)
  if (window.crypto?.getRandomValues) {
    const u = new Uint32Array(1);
    crypto.getRandomValues(u);
    return u[0] / 4294967296; // 2^32
  }
  return Math.random();
}
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(rand()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}
function shuffleOptionsInPlace(q){
  const pairs = q.options.map((text, idx)=>({text, idx}));
  shuffle(pairs);
  q.options = pairs.map(p=>p.text);
  q.answer = pairs.findIndex(p=>p.idx === q.answer);
  return q;
}

// ---------- History (localStorage) ----------
function loadHistory(){
  try{
    const v = JSON.parse(localStorage.getItem(LS_HISTORY));
    return Array.isArray(v) ? v : [];
  }catch{ return []; }
}
function saveHistory(arr){ localStorage.setItem(LS_HISTORY, JSON.stringify(arr)); }
function addWrong(subject,set,qid){
  const list = loadHistory();
  if (!list.some(x=>x.subject===subject && x.set===set && x.qid===qid)) {
    list.push({subject,set,qid,ts: Date.now()});
    saveHistory(list);
  }
}
function removeWrong(subject,set,qid){
  const list = loadHistory().filter(x=>!(x.subject===subject && x.set===set && x.qid===qid));
  saveHistory(list);
}

// ---------- Toast ----------
function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1400);
}

// ---------- Setup UI ----------
function populateSelectors(){
  const subSel = $("#subjectSelect");
  const setSel = $("#setSelect");
  subSel.innerHTML = "";
  Object.keys(BANK).forEach((sub, i)=>{
    const opt = document.createElement("option");
    opt.value = sub; opt.textContent = sub;
    subSel.appendChild(opt);
  });
  const firstSubject = subSel.value || Object.keys(BANK)[0];
  setSel.innerHTML = "";
  Object.keys(BANK[firstSubject]).forEach(setName=>{
    const opt = document.createElement("option");
    opt.value = setName; opt.textContent = setName;
    setSel.appendChild(opt);
  });
  subSel.addEventListener("change", ()=>{
    const s = subSel.value;
    setSel.innerHTML = "";
    Object.keys(BANK[s]).forEach(setName=>{
      const opt = document.createElement("option");
      opt.value = setName; opt.textContent = setName;
      setSel.appendChild(opt);
    });
  });
}

function buildShuffledQuiz(subject,set){
  const base = deepClone(BANK[subject][set]);
  base.forEach(shuffleOptionsInPlace);
  shuffle(base);
  return base;
}

// ---------- Quiz flow ----------
function startQuiz(){
  current.subject = $("#subjectSelect").value;
  current.set = $("#setSelect").value;
  current.quiz = buildShuffledQuiz(current.subject, current.set);
  current.idx = 0;
  current.score = 0;
  $("#setupPanel").classList.add("hidden");
  $("#resultPanel").classList.add("hidden");
  $("#quizPanel").classList.remove("hidden");
  renderQuestion();
}

function renderQuestion(){
  const q = current.quiz[current.idx];
  $("#crumb").textContent = `${current.subject} › ${current.set}`;
  $("#progress").textContent = `Question ${current.idx+1} of ${current.quiz.length}`;
  $("#questionText").textContent = q.q;

  const options = $("#options");
  options.innerHTML = "";
  q.options.forEach((text, i)=>{
    const btn = document.createElement("button");
    btn.className = "option";
    btn.type = "button";
    btn.innerHTML = `<span>${String.fromCharCode(65+i)}.</span> <div>${text}</div>`;
    btn.addEventListener("click", ()=> onPick(i, btn));
    options.appendChild(btn);
  });

  $("#btnNext").disabled = true;
  $("#btnSubmit").classList.toggle("hidden", current.idx !== current.quiz.length-1);
}

function onPick(choiceIdx, btnEl){
  const q = current.quiz[current.idx];
  // prevent double-pick
  if ($(".option.selected")) return;
  // mark selection
  btnEl.classList.add("selected");
  // reveal correctness only AFTER user picked
  const isCorrect = choiceIdx === q.answer;
  if (isCorrect){
    btnEl.classList.add("correct");
    current.score++;
    // if in wrong history already, remove it because now answered correctly
    removeWrong(current.subject, current.set, q.id);
  } else {
    btnEl.classList.add("incorrect");
    // show which one is correct (reveal AFTER pick)
    const correctBtn = $$(".option") [q.answer];
    if (correctBtn) correctBtn.classList.add("correct");
    // track wrong
    addWrong(current.subject, current.set, q.id);
  }
  // enable next/submit
  $("#btnNext").disabled = false;
}

function nextQuestion(){
  if (current.idx < current.quiz.length - 1){
    current.idx++;
    renderQuestion();
  }
}

function finishQuiz(){
  $("#quizPanel").classList.add("hidden");
  $("#resultPanel").classList.remove("hidden");
  $("#scoreLine").textContent = `Score: ${current.score} / ${current.quiz.length}`;
}

function backToSets(){
  $("#resultPanel").classList.add("hidden");
  $("#setupPanel").classList.remove("hidden");
}

function retake(){
  current.quiz = buildShuffledQuiz(current.subject, current.set); // reshuffle every retake
  current.idx = 0;
  current.score = 0;
  $("#resultPanel").classList.add("hidden");
  $("#quizPanel").classList.remove("hidden");
  renderQuestion();
}

// ---------- Wrong History Review (Modal) ----------
let review = {
  list: [],
  idx: 0,
};

function openHistory(){
  const list = loadHistory().sort((a,b)=>a.ts-b.ts);
  review.list = list;
  review.idx = 0;
  const m = $("#historyModal");
  renderHistoryItem();
  m.showModal();
}

function renderHistoryItem(){
  const body = $("#historyBody");
  if (!review.list.length){
    body.innerHTML = `<p class="muted">Nothing to review. Great job!</p>`;
    return;
  }
  const item = review.list[review.idx];
  const q = findQuestion(item.subject, item.set, item.qid);
  if (!q){
    body.innerHTML = `<p class="muted">Question not found in current bank. (Subject/Set changed)</p>`;
    return;
  }

  // Build a fresh shuffled copy so the answer is NOT revealed until user picks
  const fresh = deepClone(q);
  shuffleOptionsInPlace(fresh);

  // Render
  body.innerHTML = `
    <div class="content">
      <div class="crumb">${item.subject} › ${item.set} • ${new Date(item.ts).toLocaleString()}</div>
      <h4 class="question">${fresh.q}</h4>
      <div id="revOptions" class="options"></div>
    </div>
  `;

  const cont = $("#revOptions");
  fresh.options.forEach((t, i)=>{
    const b = document.createElement("button");
    b.className = "option";
    b.type = "button";
    b.innerHTML = `<span>${String.fromCharCode(65+i)}.</span> <div>${t}</div>`;
    b.addEventListener("click", ()=>{
      // Reveal AFTER user picks
      if ($(".option.selected", cont)) return;
      b.classList.add("selected");
      const correct = i === fresh.answer;
      if (correct){
        b.classList.add("correct");
        // master record: remove from history since answered correctly in review
        removeWrong(item.subject, item.set, item.qid);
        // also update the in-memory list for this modal session
        review.list = loadHistory().sort((a,b)=>a.ts-b.ts);
        toast("Removed from wrong history ✓");
      }else{
        b.classList.add("incorrect");
        const good = $$(".option", cont)[fresh.answer];
        if (good) good.classList.add("correct");
      }
    });
    cont.appendChild(b);
  });
}

function nextHistory(){ if (review.list.length){ review.idx = (review.idx + 1) % review.list.length; renderHistoryItem(); } }
function prevHistory(){ if (review.list.length){ review.idx = (review.idx - 1 + review.list.length) % review.list.length; renderHistoryItem(); } }

function findQuestion(subject,set,qid){
  const bucket = BANK[subject]?.[set];
  if (!bucket) return null;
  return bucket.find(x=>x.id===qid) || null;
}

// ---------- Reset all ----------
function resetAll(){
  localStorage.removeItem(LS_HISTORY);
  toast("All history cleared.");
}

// ---------- Wire up ----------
window.addEventListener("DOMContentLoaded", ()=>{
  populateSelectors();

  $("#btnStart").addEventListener("click", startQuiz);
  $("#btnNext").addEventListener("click", nextQuestion);
  $("#btnSubmit").addEventListener("click", finishQuiz);
  $("#btnBack").addEventListener("click", backToSets);
  $("#btnRetake").addEventListener("click", retake);

  $("#btnHistory").addEventListener("click", openHistory);
  $("#btnOpenHistory").addEventListener("click", openHistory);
  $("#btnHistoryNext").addEventListener("click", nextHistory);
  $("#btnHistoryPrev").addEventListener("click", prevHistory);

  $("#btnResetAll").addEventListener("click", resetAll);
});
