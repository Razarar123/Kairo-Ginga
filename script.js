/* ==============================
   Microbiology Study Hub — JS
   (Full file)
   ============================== */

/* ---------- Utilities ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

function shuffleArray(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3000);
}

/* ---------- Local Storage State ---------- */
const PROGRESS_KEY = "studyhub_progress_v4"; // Incremented version for achievements
const SETTINGS_KEY = "studyhub_settings_v7";

const S_Progress = () => {
  try {
    const defaults = {
        achievements: {},
        stats: {
            loginDays: [],
            quizzesCompleted: 0,
            questionsAnswered: 0,
            correctStreak: 0,
            perfectScores: 0
        }
    };
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    // Merge saved data with defaults to ensure new properties exist
    const merged = { ...defaults, ...saved };
    merged.stats = { ...defaults.stats, ...saved.stats };
    return merged;
  } catch { return {} }
}
const W_Progress = s => localStorage.setItem(PROGRESS_KEY, JSON.stringify(s));

const S_Settings = () => {
    try {
        const defaults = { 
            randomizeSetSelection: false, 
            randomizeQuestionOrder: true,
            shuffleAnswerOrder: true,
            excludeSeenQuestions: false,
            randomizeAll: false,
            defaultSetQuestions: 5,
            defaultRandomQuestions: 10,
            showTribute: true,
            soundEffects: true,
            backgroundMusic: true,
            backgroundMusicTrack: 'chill',
            backgroundMusicVolume: 0.3,
            correctVolume: 1.0,
            incorrectVolume: 1.0,
            navigateVolume: 1.0,
            finishGoodVolume: 1.0,
            finishBadVolume: 1.0,
            musicMuted: false
        };
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        return { ...defaults, ...saved };
    } catch { 
        return { 
            randomizeSetSelection: false, 
            randomizeQuestionOrder: true,
            shuffleAnswerOrder: true,
            excludeSeenQuestions: false,
            randomizeAll: false,
            defaultSetQuestions: 5,
            defaultRandomQuestions: 10,
            showTribute: true,
            soundEffects: true,
            backgroundMusic: true,
            backgroundMusicTrack: 'chill',
            backgroundMusicVolume: 0.3,
            correctVolume: 1.0,
            incorrectVolume: 1.0,
            navigateVolume: 1.0,
            finishGoodVolume: 1.0,
            finishBadVolume: 1.0,
            musicMuted: false
        } 
    }
}
const W_Settings = s => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));

const getSet = (k, i) => S_Progress() ?.[k] ?.[i];
const putSet = (k, i, val) => {
  const s = S_Progress();
  if (!s[k]) s[k] = {};
  s[k][i] = val;
  W_Progress(s)
}
const resetSet = (k, i) => {
  const s = S_Progress();
  if (s ?.[k] ?.[i]) {
    delete s[k][i];
    W_Progress(s)
  }
}
const addWrong = (k, i, qid) => {
  const s = S_Progress();
  (s.__history ??= []).push({ k, i, qid, ts: Date.now() });
  W_Progress(s)
}
const remWrong = (k, i, qid) => {
  const s = S_Progress();
  if (!s.__history) return;
  s.__history = s.__history.filter(x => !(x.k === k && x.i === i && x.qid === qid));
  W_Progress(s)
}

let settings = S_Settings();
let currentTab = "subjects";

// START: SOUND ENGINE
const Sound = {
    _fadeInterval: null,
    
    getCurrentMusicElement: () => {
        return $(`#sound-background-${settings.backgroundMusicTrack}`);
    },

    fadeVolume: (audioElement, targetVolume, duration = 1000) => {
        clearInterval(Sound._fadeInterval);
        const startVolume = audioElement.volume;
        const volumeChange = targetVolume - startVolume;
        if (volumeChange === 0) return;

        const steps = 50;
        const stepDuration = duration / steps;
        let currentStep = 0;

        Sound._fadeInterval = setInterval(() => {
            currentStep++;
            const progress = currentStep / steps;
            audioElement.volume = startVolume + (volumeChange * progress);

            if (currentStep >= steps) {
                audioElement.volume = targetVolume;
                clearInterval(Sound._fadeInterval);
            }
        }, stepDuration);
    },

    play: (id, volume = 1.0) => {
        if (!settings.soundEffects && !id.includes('background')) return;
        const soundElement = document.getElementById(id);
        if (soundElement) {
            soundElement.volume = Math.max(0, Math.min(volume, 1)); // Volume is capped at 1.0 (100%)
            soundElement.currentTime = 0;
            soundElement.play().catch(e => {});
        }
    },
    playBackgroundMusic: () => {
        if (!settings.backgroundMusic) return;
        const bgMusic = Sound.getCurrentMusicElement();
        if (bgMusic && bgMusic.paused) {
            bgMusic.volume = settings.backgroundMusicVolume;
            bgMusic.play().catch(e => {});
        }
    },
    stopAllBackgroundMusic: () => {
        $$('audio[id^="sound-background-"]').forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    },
    toggleMute: () => {
        const bgMusic = Sound.getCurrentMusicElement();
        if (!bgMusic) return;
        settings.musicMuted = !settings.musicMuted;
        $$('audio[id^="sound-background-"]').forEach(audio => audio.muted = settings.musicMuted);
        W_Settings(settings);
        updateMusicToggleButton();
    },
    switchTrack: (newTrack) => {
        Sound.stopAllBackgroundMusic();
        settings.backgroundMusicTrack = newTrack;
        W_Settings(settings);
        Sound.playBackgroundMusic();
    },
    duckBackgroundMusic: (duration = 400) => {
        const bgMusic = Sound.getCurrentMusicElement();
        if (bgMusic && !bgMusic.paused && !bgMusic.muted) {
            Sound.fadeVolume(bgMusic, 0.1, duration);
        }
    },
    unduckBackgroundMusic: () => {
        const bgMusic = Sound.getCurrentMusicElement();
         if (bgMusic && !bgMusic.paused && !bgMusic.muted) {
            Sound.fadeVolume(bgMusic, settings.backgroundMusicVolume, 1500);
        }
    },
    playCorrect: () => Sound.play('sound-correct', settings.correctVolume),
    playIncorrect: () => Sound.play('sound-incorrect', settings.incorrectVolume),
    playNavigate: () => Sound.play('sound-navigate', settings.navigateVolume),
    playFinishGood: () => Sound.play('sound-finish-good', settings.finishGoodVolume),
    playFinishBad: () => Sound.play('sound-finish-bad', settings.finishBadVolume),
    playAchievement: () => Sound.play('sound-achievement', 1.0)
};
// END: SOUND ENGINE

/* ---------- Data ---------- */
const SUBJECTS = [{
  code: "BIOPY4",
  type: "subtopics",
}, {
  code: "IMM201",
  type: "plain",
}, {
  code: "MBG301",
  type: "plain",
}, ];
const SUBTOPICS = {
  "BIOPY4": [{
    name: "Cell Structure & Function",
  }, {
    name: "Microbial Growth & Control",
  }, {
    name: "Genetics & Molecular Biology",
  }, ]
};

/* ---------- Question Pools (≥25 each) ---------- */
const POOL = {
  /* BIOPY4 subtopic 1 */
  "BIOPY4::Cell Structure & Function": [{
    id: "c_01",
    type: "mcq",
    q: "Primary stain in Gram staining:",
    options: ["Crystal violet", "Safranin", "Carbol fuchsin", "Methylene blue"],
    answer: 0
  }, {
    id: "c_02",
    type: "mcq",
    q: "Gram-negative hallmark:",
    options: ["Thick PG no OM", "Thin PG + outer membrane", "No PG", "Teichoic acids only"],
    answer: 1
  }, {
    id: "c_03",
    type: "subjective",
    q: "Describe the function of the bacterial cell wall and mention its primary component.",
    answer: "The primary function of the bacterial cell wall is to provide structural support, maintain the cell's shape, and protect it from osmotic lysis. The main component is peptidoglycan (also known as murein)."
  }, {
    id: "c_04",
    type: "mcq",
    q: "Bacterial ribosome:",
    options: ["50S+40S", "60S+40S", "50S+30S", "70S+50S"],
    answer: 2
  }, {
    id: "c_05",
    type: "mcq",
    q: "Capsule is best seen by:",
    options: ["India ink (negative)", "Ziehl–Neelsen", "Endospore stain", "Giemsa"],
    answer: 0
  }, {
    id: "c_06",
    type: "mcq",
    q: "Flagella all around cell:",
    options: ["Monotrichous", "Lophotrichous", "Amphitrichous", "Peritrichous"],
    answer: 3
  }, {
    id: "c_07",
    type: "mcq",
    q: "Peptidoglycan crosslinks inhibited by:",
    options: ["Tetracycline", "Vancomycin", "Polymyxin B", "Rifampicin"],
    answer: 1
  }, {
    id: "c_08",
    type: "mcq",
    q: "Teichoic acids present in:",
    options: ["Gram-positive wall", "Gram-negative OM", "Periplasm only", "Archaea"],
    answer: 0
  }, {
    id: "c_09",
    type: "mcq",
    q: "ETC in bacteria is located on:",
    options: ["Cell membrane", "Periplasm", "Cytosol", "Outer membrane"],
    answer: 0
  }, {
    id: "c_10",
    type: "mcq",
    q: "Endospore core contains:",
    options: ["Chitin", "Dipicolinic acid", "Lignin", "Cellulose"],
    answer: 1
  }, {
    id: "c_11",
    type: "mcq",
    q: "Acid-fast cell wall contains:",
    options: ["Sterols", "Mycolic acids", "Chitin", "Ergosterol"],
    answer: 1
  }, {
    id: "c_12",
    type: "mcq",
    q: "Periplasm is found in:",
    options: ["Gram-positive", "Gram-negative", "Mycoplasma", "Fungi"],
    answer: 1
  }, {
    id: "c_13",
    type: "mcq",
    q: "Fimbriae mainly mediate:",
    options: ["Motility", "Adherence", "Secretion", "Conjugation"],
    answer: 1
  }, {
    id: "c_14",
    type: "mcq",
    q: "S-layer is composed of:",
    options: ["Protein/glycoprotein", "Polysaccharide", "Lipid", "DNA"],
    answer: 0
  }, {
    id: "c_15",
    type: "mcq",
    q: "Typical bacterial genome:",
    options: ["Linear diploid", "Circular haploid", "Linear haploid", "Circular diploid"],
    answer: 1
  }, {
    id: "c_16",
    type: "mcq",
    q: "PHB inclusions store:",
    options: ["Nitrogen", "Sulfur", "Carbon/energy", "Iron"],
    answer: 2
  }, {
    id: "c_17",
    type: "mcq",
    q: "MreB is associated with:",
    options: ["Rod shape", "Replication", "Secretion", "Motility"],
    answer: 0
  }, {
    id: "c_18",
    type: "mcq",
    q: "Glycocalyx functions:",
    options: ["Protein synthesis", "Adherence & protection", "ATP generation", "DNA repair"],
    answer: 1
  }, {
    id: "c_19",
    type: "mcq",
    q: "L-form bacteria lack:",
    options: ["Ribosomes", "DNA", "Cell wall", "Membrane"],
    answer: 2
  }, {
    id: "c_20",
    type: "mcq",
    q: "Microscopy for 3D surface:",
    options: ["Bright-field", "Phase-contrast", "SEM", "TEM"],
    answer: 2
  }, {
    id: "c_21",
    type: "mcq",
    q: "Quellung reaction detects:",
    options: ["Capsule swelling", "Spore coat", "Flagella", "Teichoic acids"],
    answer: 0
  }, {
    id: "c_22",
    type: "mcq",
    q: "Porins are in:",
    options: ["Gram+ wall", "Gram− outer membrane", "Cytoplasmic membrane", "S-layer only"],
    answer: 1
  }, {
    id: "c_23",
    type: "mcq",
    q: "LPS toxic component:",
    options: ["Lipid A", "Core polysaccharide", "O-antigen", "Teichoic acid"],
    answer: 0
  }, {
    id: "c_24",
    type: "mcq",
    q: "Mycoplasma membranes contain:",
    options: ["Ergosterol", "Cholesterol", "Mycolic acids", "LTA"],
    answer: 1
  }, {
    id: "c_25",
    type: "mcq",
    q: "Pili used for:",
    options: ["Conjugation/adherence", "Chemotaxis", "Sporulation", "Phototaxis"],
    answer: 0
  }],
  /* BIOPY4 subtopic 2 */
  "BIOPY4::Microbial Growth & Control": [{
    id: "g_01",
    q: "Mesophile optimum:",
    options: ["0–15°C", "15–45°C", "45–80°C", ">80°C"],
    answer: 1
  }, {
    id: "g_02",
    q: "Thermoduric means:",
    options: ["Grow at high T only", "Survive high T briefly", "Psychrophile", "Barophile"],
    answer: 1
  }, {
    id: "g_03",
    q: "Autoclave standard:",
    options: ["100°C 15 min", "121°C 15 min @15 psi", "160°C 1 h", "134°C 1 min"],
    answer: 1
  }, {
    id: "g_04",
    q: "Filtration is best for:",
    options: ["Heat-sensitive fluids", "Glassware", "Metal tools", "Dry powders"],
    answer: 0
  }, {
    id: "g_05",
    q: "Microaerophile prefers:",
    options: ["0% O₂", "Low O₂", "Normal air", "High CO₂ only"],
    answer: 1
  }, {
    id: "g_06",
    q: "Quorum sensing role:",
    options: ["DNA replication", "Cell–cell communication", "Protein folding", "Glycolysis"],
    answer: 1
  }, {
    id: "g_07",
    q: "Batch phases:",
    options: ["Lag, log, stationary, death", "Lag only", "Log only", "Stationary only"],
    answer: 0
  }, {
    id: "g_08",
    q: "CFU counts measure:",
    options: ["Total cells", "Viable cells", "Dead cells", "Spores only"],
    answer: 1
  }, {
    id: "g_09",
    q: "MacConkey is:",
    options: ["Selective + differential", "Enriched only", "Selective only", "Differential only"],
    answer: 0
  }, {
    id: "g_10",
    q: "D-value is:",
    options: ["1-log kill time", "MIC", "MBC", "TDP"],
    answer: 0
  }, {
    id: "g_11",
    q: "Phenolics action:",
    options: ["DNA crosslink", "Membrane disruption", "PG synthesis block", "Protein synthesis"],
    answer: 1
  }, {
    id: "g_12",
    q: "Alcohol best at:",
    options: ["<40%", "60–90%", "100%", "Any"],
    answer: 1
  }, {
    id: "g_13",
    q: "VBNC means:",
    options: ["Viable non-culturable", "Very big non-cell", "Viral burden non-count", "Variable bacillary count"],
    answer: 0
  }, {
    id: "g_14",
    q: "Halotolerant grows in:",
    options: ["Acid", "Salt", "Cold", "Pressure"],
    answer: 1
  }, {
    id: "g_15",
    q: "Chemostat maintains:",
    options: ["Batch culture", "Steady-state continuous culture", "Anaerobiosis", "Quiescence"],
    answer: 1
  }, {
    id: "g_16",
    q: "PMF drives:",
    options: ["DNA ligation", "ATP synthesis", "Transcription", "Splicing"],
    answer: 1
  }, {
    id: "g_17",
    q: "Decimal reduction time:",
    options: ["Time for 90% kill", "Half-life", "Tmax", "Tmin"],
    answer: 0
  }, {
    id: "g_18",
    q: "Sporicidal level:",
    options: ["Low-level disinfectant", "High-level/sterilant", "Antiseptic only", "Soap"],
    answer: 1
  }, {
    id: "g_19",
    q: "Psychrotroph grows at:",
    options: ["0–7°C", "25–30°C", "50–60°C", ">80°C"],
    answer: 0
  }, {
    id: "g_20",
    q: "Bacteriostatic agent:",
    options: ["Kills cells", "Inhibits growth", "Removes water", "Oxidizes lipids"],
    answer: 1
  }, {
    id: "g_21",
    q: "TDP is:",
    options: ["Thermal death point", "Turbidity decimal point", "Total dilution point", "Threshold density point"],
    answer: 0
  }, {
    id: "g_22",
    q: "HEPA used for:",
    options: ["Liquid sterilization", "Air filtration", "Metal sterilization", "Dry heat"],
    answer: 1
  }, {
    id: "g_23",
    q: "Iodophors are:",
    options: ["Phenolics", "Halogens", "Alcohols", "QACs"],
    answer: 1
  }, {
    id: "g_24",
    q: "MIC definition:",
    options: ["Lowest conc. preventing visible growth", "Highest bactericidal conc.", "Median serum level", "Peak level"],
    answer: 0
  }, {
    id: "g_25",
    q: "MBC definition:",
    options: ["Lowest bactericidal conc.", "Lowest inhibitory conc.", "Most buffered conc.", "Minimum biofilm conc."],
    answer: 0
  }],
  /* BIOPY4 subtopic 3 */
  "BIOPY4::Genetics & Molecular Biology": [{
    id: "m_01",
    q: "Transfer via phage:",
    options: ["Transformation", "Conjugation", "Transduction", "Transposition"],
    answer: 2
  }, {
    id: "m_02",
    q: "Hfr strains have:",
    options: ["Integrated F factor", "Free F plasmid", "No F genes", "Deleted oriT"],
    answer: 0
  }, {
    id: "m_03",
    q: "lacZ encodes:",
    options: ["β-galactosidase", "Permease", "Transacetylase", "Repressor"],
    answer: 0
  }, {
    id: "m_04",
    q: "DNA gyrase targeted by:",
    options: ["β-lactams", "Quinolones", "Macrolides", "Polymyxins"],
    answer: 1
  }, {
    id: "m_05",
    q: "Rho-independent termination:",
    options: ["Hairpin + poly-U", "Rho helicase", "RNase H", "RNAP pause only"],
    answer: 0
  }, {
    id: "m_06",
    q: "CRISPR provides:",
    options: ["Motility", "Adaptive anti-phage immunity", "Protein export", "Metabolism"],
    answer: 1
  }, {
    id: "m_07",
    q: "Attenuation senses:",
    options: ["tRNA charging", "pH", "NaCl", "Light"],
    answer: 0
  }, {
    id: "m_08",
    q: "Transposase function:",
    options: ["Cuts/pastes mobile DNA", "Ligates Okazaki", "Methylates DNA", "Degrades RNA"],
    answer: 0
  }, {
    id: "m_09",
    q: "oriT needed for:",
    options: ["Chromosome replication", "Conjugative transfer", "Transcription", "Translation"],
    answer: 1
  }, {
    id: "m_10",
    q: "σ factor does:",
    options: ["Promoter recognition", "Ribosome assembly", "Splicing", "Polyadenylation"],
    answer: 0
  }, {
    id: "m_11",
    q: "Blue-white screening uses:",
    options: ["lacZ α-complementation", "GFP", "Antibiograms", "qPCR Ct"],
    answer: 0
  }, {
    id: "m_12",
    q: "SOS regulators:",
    options: ["LexA & RecA", "AraC & CRP", "LacI & CAP", "Rho & NusA"],
    answer: 0
  }, {
    id: "m_13",
    q: "Two-component system:",
    options: ["Sensor kinase/response regulator", "Ligase/helicase", "σ/core RNAP", "ABC/porin"],
    answer: 0
  }, {
    id: "m_14",
    q: "Riboswitches respond to:",
    options: ["Metabolites binding RNA", "Proteases", "Phosphatases", "Lipids"],
    answer: 0
  }, {
    id: "m_15",
    q: "Integrons capture cassettes via:",
    options: ["Integrase", "Topoisomerase I", "RNase E", "Ligase"],
    answer: 0
  }, {
    id: "m_16",
    q: "Electroporation increases:",
    options: ["DNA uptake", "ATP yield", "Peptide bond", "Capsule"],
    answer: 1
  }, {
    id: "m_17",
    q: "PCR denaturation:",
    options: ["~55°C", "~72°C", "~94–98°C", "~37°C"],
    answer: 2
  }, {
    id: "m_18",
    q: "Lambda lysogeny keeps:",
    options: ["cI repressor active", "Cro dominant", "No repression", "CRP active"],
    answer: 0
  }, {
    id: "m_19",
    q: "Chi sites stimulate:",
    options: ["RecBCD recombination", "Mismatch repair", "BER", "NHEJ"],
    answer: 0
  }, {
    id: "m_20",
    q: "Shine–Dalgarno binds:",
    options: ["23S rRNA", "16S rRNA", "5S rRNA", "tRNAi^Met"],
    answer: 1
  }, {
    id: "m_21",
    q: "Operon is:",
    options: ["Group of genes under single promoter", "Single gene only", "Promoterless cassette", "Noncoding RNA only"],
    answer: 0
  }, {
    id: "m_22",
    q: "Lac operon induced by:",
    options: ["Glucose", "Lactose/allolactose", "Galactose", "Sucrose"],
    answer: 1
  }, {
    id: "m_23",
    q: "CAP–cAMP activates under:",
    options: ["High glucose", "Low glucose", "High lactose", "High cAMP & glucose"],
    answer: 1
  }, {
    id: "m_24",
    q: "RecA key role:",
    options: ["Recombination & SOS", "DNA ligation", "Helicase", "Transcription"],
    answer: 0
  }, {
    id: "m_25",
    q: "Ames test detects:",
    options: ["Mutagens via reversion", "Antibiotics", "Toxins via LD50", "Phage titer"],
    answer: 0
  }],
  /* IMM201 (plain) */
  "IMM201": [{
    id: "i_01",
    q: "PRRs detect:",
    options: ["Self antigens", "PAMPs/MAMPs", "Antibodies", "Cytokines"],
    answer: 1
  }, {
    id: "i_02",
    q: "Opsonization enhances:",
    options: ["Transcription", "Phagocytosis", "Sporulation", "Conjugation"],
    answer: 1
  }, {
    id: "i_03",
    q: "Classical complement triggered by:",
    options: ["MBL", "C3 tickover", "Ag–Ab complexes", "LPS"],
    answer: 2
  }, {
    id: "i_04",
    q: "Main APC for naïve T cells:",
    options: ["Neutrophil", "Dendritic cell", "Eosinophil", "Basophil"],
    answer: 1
  }, {
    id: "i_05",
    q: "TLR4 recognizes:",
    options: ["Flagellin", "CpG DNA", "dsRNA", "LPS"],
    answer: 3
  }, {
    id: "i_06",
    q: "Neutralizing antibodies block:",
    options: ["Host cytokines", "Pathogen entry/toxins", "Complement", "MHC I"],
    answer: 1
  }, {
    id: "i_07",
    q: "Major opsonins:",
    options: ["C5b & Factor B", "C3b & IgG", "IgE & IL-4", "TNF-α & IL-1"],
    answer: 1
  }, {
    id: "i_08",
    q: "Th1 cytokines:",
    options: ["IL-4, IL-5", "IL-17", "IFN-γ, IL-2", "TGF-β"],
    answer: 2
  }, {
    id: "i_09",
    q: "MHC I presents:",
    options: ["Extracellular", "Cytosolic peptides", "Lysosomal", "Carbohydrates"],
    answer: 1
  }, {
    id: "i_10",
    q: "Cytotoxic without prior sensitization:",
    options: ["B cell", "NK cell", "Eosinophil", "Mast cell"],
    answer: 1
  }, {
    id: "i_11",
    q: "Affinity maturation site:",
    options: ["Thymus", "Bone marrow", "Germinal centers", "Red pulp"],
    answer: 2
  }, {
    id: "i_12",
    q: "Mucosal Ig:",
    options: ["IgA", "IgG", "IgM", "IgE"],
    answer: 0
  }, {
    id: "i_13",
    q: "Superantigens activate T cells by:",
    options: ["Bind TCR Vβ & MHC outside groove", "↑ uptake", "Stabilize pMHC", "Block BCR"],
    answer: 0
  }, {
    id: "i_14",
    q: "Type I IFNs:",
    options: ["Neutrophil degranulation", "Antiviral state", "Eosinophils", "↑ IgE"],
    answer: 1
  }, {
    id: "i_15",
    q: "Somatic hypermutation in:",
    options: ["Pre-B", "GC B cells", "Thymocytes", "NK cells"],
    answer: 1
  }, {
    id: "i_16",
    q: "MAC is:",
    options: ["C1–C3", "C3bBb", "C5b–C9", "C2aC4b"],
    answer: 2
  }, {
    id: "i_17",
    q: "ADCC mainly via:",
    options: ["Neutrophils", "NK cells (FcγRIII)", "Basophils", "DCs"],
    answer: 1
  }, {
    id: "i_18",
    q: "T cell central tolerance site:",
    options: ["Bone marrow", "Spleen", "Thymus", "Nodes"],
    answer: 2
  }, {
    id: "i_19",
    q: "IL-17 producer:",
    options: ["Th1", "Th2", "Th17", "Tfh"],
    answer: 2
  }, {
    id: "i_20",
    q: "Class switching requires:",
    options: ["RAG1/2", "AID + T cell help", "Ku70/80", "TdT"],
    answer: 1
  }, {
    id: "i_21",
    q: "DAMPs are:",
    options: ["Microbial", "Host danger signals", "Plant", "Food allergens"],
    answer: 1
  }, {
    id: "i_22",
    q: "Bridges innate↔adaptive:",
    options: ["Neutrophil", "Dendritic cell", "Basophil", "Erythrocyte"],
    answer: 1
  }, {
    id: "i_23",
    q: "Eosinophil growth cytokine:",
    options: ["IL-2", "IL-5", "IFN-γ", "IL-12"],
    answer: 1
  }, {
    id: "i_24",
    q: "Treg TF:",
    options: ["T-bet", "GATA3", "RORγt", "Foxp3"],
    answer: 3
  }, {
    id: "i_25",
    q: "Best correlate for neutralizing vaccines:",
    options: ["T cell index", "Serum neutralizing titer", "CRP", "ESR"],
    answer: 1
  }],
  /* MBG301 (plain) */
  "MBG301": [{
    id: "gk_01",
    q: "Restriction enzymes cut:",
    options: ["Proteins", "RNA", "Specific DNA sequences", "Lipids"],
    answer: 2
  }, {
    id: "gk_02",
    q: "Plasmids replicate via:",
    options: ["oriV", "Telomeres", "Centromeres", "Kinetochore"],
    answer: 0
  }, {
    id: "gk_03",
    q: "Blue-white uses:",
    options: ["lacZ α-comp.", "GFP", "Antibiogram", "qPCR"],
    answer: 0
  }, {
    id: "gk_04",
    q: "PCR denaturation:",
    options: ["~55°C", "~72°C", "~94–98°C", "~37°C"],
    answer: 2
  }, {
    id: "gk_05",
    q: "Ligase forms:",
    options: ["Hydrogen bonds", "Phosphodiester bonds", "Peptide bonds", "Ionic bonds"],
    answer: 1
  }, {
    id: "gk_06",
    q: "Electroporation increases:",
    options: ["Membrane rigidity", "DNA uptake", "ATP", "Ribosomes"],
    answer: 1
  }, {
    id: "gk_07",
    q: "Rolling-circle replication:",
    options: ["Some plasmids & phages", "Mitochondria", "Only chromosomes", "Fungi"],
    answer: 0
  }, {
    id: "gk_08",
    q: "IS elements are:",
    options: ["Integrative plasmids", "Simple transposons", "Phage tails", "Riboswitches"],
    answer: 1
  }, {
    id: "gk_09",
    q: "SOS response regulators:",
    options: ["LexA/RecA", "LacI/CAP", "AraC/CRP", "IHF only"],
    answer: 0
  }, {
    id: "gk_10",
    q: "CRISPR array is:",
    options: ["Exons/introns", "Repeats & spacers", "Promoters/operators", "UTRs"],
    answer: 1
  }, {
    id: "gk_11",
    q: "Conjugation pilus from:",
    options: ["Phage genome", "F plasmid tra genes", "rRNA loci", "IS10"],
    answer: 1
  }, {
    id: "gk_12",
    q: "Replica plating selects:",
    options: ["Auxotrophs", "MIC", "Viruses", "Endotoxin"],
    answer: 0
  }, {
    id: "gk_13",
    q: "Two-component system:",
    options: ["Sensor kinase & response regulator", "Ligase/helicase", "σ/core", "ABC/porin"],
    answer: 0
  }, {
    id: "gk_14",
    q: "Riboswitch regulation by:",
    options: ["Metabolite-binding RNA", "Protein operators", "sRNA degradation", "DNA methylation"],
    answer: 0
  }, {
    id: "gk_15",
    q: "Chi sites stimulate:",
    options: ["RecBCD recombination", "Mismatch repair", "BER", "NHEJ"],
    answer: 0
  }, {
    id: "gk_16",
    q: "Attenuation senses:",
    options: ["tRNA charging", "Membrane potential", "ATP:ADP", "pH"],
    answer: 0
  }, {
    id: "gk_17",
    q: "Integrons use:",
    options: ["Integrase", "Topo I", "Pol I", "RNase H"],
    answer: 0
  }, {
    id: "gk_18",
    q: "Plasmid incompatibility relates to:",
    options: ["Origin control systems", "Antibiotic selection", "GC content", "RBS"],
    answer: 0
  }, {
    id: "gk_19",
    q: "OriT is for:",
    options: ["Conjugation", "Chromosome replication", "Termination", "Translation"],
    answer: 0
  }, {
    id: "gk_20",
    q: "σ factor function:",
    options: ["Promoter recognition", "Splicing", "Poly-A", "Ribosome assembly"],
    answer: 0
  }, {
    id: "gk_21",
    q: "Generalized transduction by:",
    options: ["Temperate only", "Lytic phage mispackaging", "Conjugation", "Transformation"],
    answer: 1
  }, {
    id: "gk_22",
    q: "Specialized transduction by:",
    options: ["Lytic phage", "Lysogenic phage excision", "Transformation", "Transposition"],
    answer: 1
  }, {
    id: "gk_23",
    q: "Natural competence:",
    options: ["DNA uptake from environment", "Swarming", "Biofilm", "Secretion"],
    answer: 0
  }, {
    id: "gk_24",
    q: "Rho-independent termination:",
    options: ["Hairpin + poly-U", "Rho helicase", "RNase E", "Shine–Dalgarno"],
    answer: 0
  }, {
    id: "gk_25",
    q: "LacI is:",
    options: ["Repressor", "Activator", "Sigma factor", "Helicase"],
    answer: 0
  }]
};

/* ---------- Icons & crumbs ---------- */
function DocIcon() {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.classList.add("icon");
  s.innerHTML = '<path d="M14 2H7a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V8z" fill="currentColor" opacity=".18"/><path d="M14 2v6h6" fill="currentColor" opacity=".6"/>';
  return s
}
const strong = t => {
  const e = document.createElement("strong");
  e.textContent = t;
  e.style.color = "var(--ink-100)";
  return e
}
const crumb = (t, fn) => {
  const b = document.createElement("button");
  b.className = "crumb";
  b.onclick = () => {
    Sound.playNavigate();
    fn();
  };
  b.textContent = t;
  return b
}
const active = (t) => {
  const b = document.createElement("button");
  b.className = "crumb active";
  b.textContent = t;
  b.disabled = true;
  return b
}
const sep = () => {
  const s = document.createElement("span");
  s.className = "sep";
  s.textContent = "›";
  return s
}

/* ---------- Elements ---------- */
const headerContainer = $(".header-container");
const subjectsView = $("#subjectsView");
const progressView = $("#progressView");
const historyView = $("#historyView");
const qbankView = $("#qbankView");
const customQuizView = $("#customQuizView");
const tutorialsView = $("#tutorialsView");
const settingsView = $("#settingsView");
const quizPanel = $("#quizPanel");
const achievementsView = $("#achievementsView");


/* ---------- Tabs ---------- */
$("#tabs").addEventListener("click", e => {
  Sound.playNavigate();
  const btn = e.target.closest(".tab[data-tab]");
  if (!btn) return;
  $$(".tab[data-tab]").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentTab = btn.dataset.tab;

  const views = [subjectsView, progressView, historyView, qbankView, customQuizView, tutorialsView, settingsView, quizPanel, achievementsView];
  views.forEach(v => hide(v));

  if (currentTab === "subjects") {
    show(subjectsView);
    renderSubjects();
  } else if (currentTab === "progress") {
    show(progressView);
    renderProgress();
  } else if (currentTab === "history") {
    show(historyView);
    renderHistory();
  } else if (currentTab === "qbank") {
    show(qbankView);
    renderQuestionBank();
  } else if (currentTab === "customQuiz") {
    show(customQuizView);
    renderCustomQuiz();
  } else if (currentTab === "tutorials") {
    show(tutorialsView);
    renderTutorials();
  } else if (currentTab === "settings") {
    show(settingsView);
    renderSettings();
  } else if (currentTab === "achievements") {
    show(achievementsView);
    renderAchievements();
  }
});

$("#resetAll").onclick = () => {
  Sound.playNavigate();
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(SETTINGS_KEY); // Also reset settings for a full clear
  settings = S_Settings(); // Re-load default settings
  toast("All progress and settings cleared");
  
  // Re-render current view to reflect reset
  const activeTab = $(".tab.active").dataset.tab;
  $(`.tab[data-tab="${activeTab}"]`).click();
};

function show(el) {
  if(el) el.classList.remove("hidden");
}

function hide(el) {
  if(el) el.classList.add("hidden");
}

/* ---------- Subjects ---------- */
function renderSubjects() {
  subjectsView.innerHTML = "";

  if(settings.randomizeAll) {
      const btn = document.createElement("button");
      btn.className = "btn primary";
      btn.textContent = "🚀 Start Fully Randomized Quiz";
      btn.style.width = "100%";
      btn.style.padding = "20px";
      btn.style.fontSize = "1.2rem";
      btn.onclick = () => {
          const allQuestions = Object.values(POOL).flat();
          const questionSelection = shuffleArray(allQuestions).slice(0, settings.defaultRandomQuestions);
          renderQuiz('Full Random', '1', settings.defaultRandomQuestions, questionSelection);
      };
      subjectsView.append(btn);
      subjectsView.append(document.createElement("hr"));
  }


  const list = document.createElement("div");
  list.className = "list";
  SUBJECTS.forEach(s => {
    const row = document.createElement("button");
    row.className = "row";
    const L = document.createElement("div");
    L.className = "left";
    L.append(DocIcon(), strong(s.code));
    const R = document.createElement("div");
    R.className = "right";
    R.textContent = "›";
    row.append(L, R);
    row.onclick = () => {
        Sound.playNavigate();
        s.type === "subtopics" ? renderSubtopics(s) : renderSetsPlain(s);
    }
    list.append(row);
  });
  subjectsView.append(list);
}

function renderSubtopics(subject) {
  subjectsView.innerHTML = "";
  const bc = document.createElement("div");
  bc.className = "crumbs";
  bc.append(crumb("🏠 All subjects", renderSubjects), sep(), active(subject.code));
  subjectsView.append(bc);

  const list = document.createElement("div");
  list.className = "list";
  (SUBTOPICS[subject.code] || []).forEach(su => {
    const row = document.createElement("button");
    row.className = "row";
    const L = document.createElement("div");
    L.className = "left";
    L.append(DocIcon(), strong(su.name));
    const R = document.createElement("div");
    R.className = "right";
    R.textContent = "›";
    row.append(L, R);
    row.onclick = () => {
        Sound.playNavigate();
        renderSetsSub(subject, su);
    }
    list.append(row);
  });
  subjectsView.append(list);
}

function makeSetRow(key, i, renderFn) {
  const row = document.createElement("button");
  row.className = "row";
  const L = document.createElement("div");
  L.className = "left";
  L.append(DocIcon(), strong(`set ${i}`));
  const R = document.createElement("div");
  R.className = "right right-flex";
  const st = getSet(key, i);
  const badge = document.createElement("span");
  if (st) {
    badge.className = "pill ok";
    badge.textContent = `⭐ ${st.score}/${st.total}`;
  } else {
    badge.className = "pill warn";
    badge.textContent = "🔵 pending";
  }
  const restart = document.createElement("button");
  restart.className = "mini ghost";
  restart.textContent = "↻";
  restart.onclick = (e) => {
    Sound.playNavigate();
    e.stopPropagation();
    resetSet(key, i);
    toast(`Set ${i} reset`);
    renderFn(); // Re-render the current view
  };
  R.append(badge, restart);
  row.onclick = () => {
      Sound.playNavigate();
      renderQuiz(key, i, settings.defaultSetQuestions);
  };
  row.append(L, R);
  return row;
}

function renderSetsSub(subject, sub) {
  subjectsView.innerHTML = "";
  const bc = document.createElement("div");
  bc.className = "crumbs";
  bc.append(crumb("🏠 All subjects", renderSubjects), sep(), crumb(subject.code, () => renderSubtopics(subject)), sep(), active(sub.name));
  subjectsView.append(bc);

  const list = document.createElement("div");
  list.className = "list";
  const totalSets = Math.ceil(POOL[`${subject.code}::${sub.name}`].length / settings.defaultSetQuestions);
  for (let i = 1; i <= totalSets; i++) {
    const key = `${subject.code}::${sub.name}`;
    list.append(makeSetRow(key, i, () => renderSetsSub(subject, sub)));
  }
  subjectsView.append(list);
}

function renderSetsPlain(subject) {
  subjectsView.innerHTML = "";
  const bc = document.createElement("div");
  bc.className = "crumbs";
  bc.append(crumb("🏠 All subjects", renderSubjects), sep(), active(subject.code));
  subjectsView.append(bc);

  const list = document.createElement("div");
  list.className = "list";
  const totalSets = Math.ceil(POOL[subject.code].length / settings.defaultSetQuestions);
  for (let i = 1; i <= totalSets; i++) {
    const key = subject.code;
    list.append(makeSetRow(key, i, () => renderSetsPlain(subject)));
  }
  subjectsView.append(list);
}

/* ---------- Quiz ---------- */
let ctx = null; // {key,index,perSet,chosen,i,score,answered}

function renderQuiz(key, setIndex, perSet, customQuestions = null) {
    let questionSelection;

    if (customQuestions) {
        questionSelection = customQuestions;
    } else {
        let pool = (POOL[key] || []).slice();
        
        if (settings.excludeSeenQuestions) {
            const progress = S_Progress();
            const seenIds = new Set(Object.keys(progress.__seen || {}));
            const unseenPool = pool.filter(q => !seenIds.has(q.id));

            if (unseenPool.length > 0) {
                pool = unseenPool;
            } else {
                toast("All questions in this topic have been seen!");
            }
        }

        if (settings.randomizeSetSelection) {
            const shuffledPool = shuffleArray(pool);
            questionSelection = shuffledPool.slice(0, perSet);
        } else {
            const start = (setIndex - 1) * perSet;
            questionSelection = pool.slice(start, start + perSet);
        }
    }
    
    const progress = S_Progress();
    progress.__seen = progress.__seen || {};
    questionSelection.forEach(q => {
        progress.__seen[q.id] = true;
    });
    W_Progress(progress);
    
    let chosen = questionSelection.map(q => {
        if (q.type === 'subjective') {
            return { ...q };
        }
        const correct = q.options[q.answer];
        const displayOptions = settings.shuffleAnswerOrder ? shuffleArray([...q.options]) : [...q.options];
        return {
            ...q,
            type: 'mcq',
            options: displayOptions,
            correct
        };
    });
    
    if (settings.randomizeQuestionOrder) {
        shuffleArray(chosen);
    }

  hide(headerContainer);
  hide(subjectsView);
  hide(progressView);
  hide(historyView);
  hide(qbankView);
  hide(customQuizView);
  hide(tutorialsView);
  hide(settingsView);
  hide(achievementsView);
  show(quizPanel);

  const bc = $("#crumbs");
  bc.innerHTML = "";
  
  const exitQuiz = (renderFn, ...args) => {
      show(headerContainer);
      hide(quizPanel);
      renderFn(...args);
  };
  
  if (key === 'Custom Quiz' || key === 'Full Random') {
      bc.append(active(key));
  } else if (key.includes("::")) {
    const [scode, sub] = key.split("::");
    const subjectData = SUBJECTS.find(s => s.code === scode);
    const subtopicData = SUBTOPICS[scode].find(s => s.name === sub);
    bc.append(
      crumb("🏠 All subjects", () => exitQuiz(renderSubjects)), sep(),
      crumb(scode, () => exitQuiz(renderSubtopics, subjectData)), sep(),
      crumb(sub, () => exitQuiz(renderSetsSub, subjectData, subtopicData)), sep(),
      active(`set ${setIndex}`)
    );
  } else {
    const subjectData = SUBJECTS.find(s => s.code === key);
    bc.append(
      crumb("🏠 All subjects", () => exitQuiz(renderSubjects)), sep(),
      crumb(key, () => exitQuiz(renderSetsPlain, subjectData)), sep(),
      active(`set ${setIndex}`)
    );
  }

  ctx = { key, index: setIndex, perSet: chosen.length, chosen, i: 0, score: 0, answered: 0 };
  
  $("#btnNext").onclick = () => {
    Sound.playNavigate();
    if (ctx.i < ctx.chosen.length - 1) {
      ctx.i++;
      drawQ()
    }
  };
  $("#btnFinish").onclick = showResults;
  
  drawQ();
}

function handleAnswer(isCorrect) {
    const progress = S_Progress();
    progress.stats.questionsAnswered = (progress.stats.questionsAnswered || 0) + 1;
    if (isCorrect) {
        progress.stats.correctStreak = (progress.stats.correctStreak || 0) + 1;
    } else {
        progress.stats.correctStreak = 0;
    }
    W_Progress(progress);
    checkAchievements();
}

function handleNext() {
    const last = (ctx.i === ctx.chosen.length - 1);
    if (last) {
        hide($('#btnNext'));
        show($('#btnFinish'));
    } else {
        $("#btnNext").disabled = false;
    }
}

function drawQ() {
  const q = ctx.chosen[ctx.i];
  $("#qtext").textContent = `Q${ctx.i+1}. ${q.q}`;
  
  ctx.isAnswered = false;
  hide($("#opts"));
  hide($("#subjectivePanel"));
  $("#btnNext").disabled = true;
  hide($('#btnFinish'));
  show($('#btnNext'));

  
  const fill = $("#progFill");
  fill.style.width = Math.round((ctx.i / ctx.chosen.length) * 100) + "%";

  if (q.type === 'subjective') {
    show($("#subjectivePanel"));
    const answerInput = $("#subjectiveAnswerInput");
    const revealedPanel = $("#revealedAnswerPanel");
    const selfAssessPanel = $("#selfAssessPanel");
    const btnReveal = $("#btnReveal");
    const btnSkip = $("#btnSkip");
    const btnCorrect = $("#btnCorrect");
    const btnIncorrect = $("#btnIncorrect");

    answerInput.value = "";
    answerInput.disabled = false;
    btnCorrect.disabled = false;
    btnIncorrect.disabled = false;
    hide(revealedPanel);
    hide(selfAssessPanel);
    show(btnReveal);
    show(btnSkip);

    $("#answerText").textContent = q.answer;

    btnReveal.onclick = () => {
        Sound.playNavigate();
        answerInput.disabled = true;
        show(revealedPanel);
        show(selfAssessPanel);
        hide(btnReveal);
        hide(btnSkip);
    };

    btnSkip.onclick = () => {
        Sound.playIncorrect();
        addWrong(ctx.key, ctx.index, q.id);
        handleAnswer(false);
        ctx.answered++;
        fill.style.width = Math.round((ctx.answered / ctx.chosen.length) * 100) + "%";
        handleNext();
    };

    const handleSelfAssessment = (isCorrect) => {
        if (ctx.isAnswered) return;
        ctx.isAnswered = true;
        btnCorrect.disabled = true;
        btnIncorrect.disabled = true;

        if (isCorrect) {
            Sound.playCorrect();
            ctx.score++;
            remWrong(ctx.key, ctx.index, q.id);
        } else {
            Sound.playIncorrect();
            addWrong(ctx.key, ctx.index, q.id);
        }
        handleAnswer(isCorrect);
        ctx.answered++;
        fill.style.width = Math.round((ctx.answered / ctx.chosen.length) * 100) + "%";
        handleNext();
    };

    btnCorrect.onclick = () => handleSelfAssessment(true);
    btnIncorrect.onclick = () => handleSelfAssessment(false);

  } else { // MCQ
    show($("#opts"));
    const opts = $("#opts");
    opts.innerHTML = "";
    
    q.options.forEach(opt => {
        const b = document.createElement("button");
        b.className = "opt";
        b.textContent = opt;
        b.onclick = () => {
            if (ctx.isAnswered) return;
            ctx.isAnswered = true;

            $$(".opt", opts).forEach(x => x.disabled = true);
            const ok = (opt === q.correct);
            if (ok) {
                Sound.playCorrect();
                b.classList.add("correct");
                ctx.score++;
                remWrong(ctx.key, ctx.index, q.id);
            } else {
                Sound.playIncorrect();
                b.classList.add("incorrect");
                addWrong(ctx.key, ctx.index, q.id);
            }
            handleAnswer(ok);
            ctx.answered++;
            fill.style.width = Math.round((ctx.answered / ctx.chosen.length) * 100) + "%";
            handleNext();
        };
        opts.append(b);
    });
  }
}

/* ---------- Progress (live) ---------- */
function renderProgress() {
    progressView.innerHTML = "";
    const st = S_Progress();
    
    let totalPossibleSets = 0;
    const displayList = [];
    SUBJECTS.forEach(s => {
        if (s.type === 'plain') {
            totalPossibleSets += Math.ceil(POOL[s.code].length / settings.defaultSetQuestions);
            displayList.push({ code: s.code, key: s.code });
        } else if (s.type === 'subtopics') {
            const subtopics = SUBTOPICS[s.code] || [];
            subtopics.forEach(sub => {
                totalPossibleSets += Math.ceil(POOL[`${s.code}::${sub.name}`].length / settings.defaultSetQuestions);
                displayList.push({ 
                    code: `${s.code} - ${sub.name}`, 
                    key: `${s.code}::${sub.name}`
                });
            });
        }
    });

    let answered = 0, correct = 0, setsDone = 0;
    Object.keys(st).filter(k => !k.startsWith('__') && k !== 'achievements' && k !== 'stats').forEach(subjectKey => {
        Object.values(st[subjectKey]).forEach(v => {
            answered += v.total || 0;
            correct += v.score || 0;
            setsDone++;
        });
    });
    
    const acc = answered ? Math.round(correct / answered * 100) : 0;

    const stats = document.createElement("div");
    stats.className = "stats";
    stats.innerHTML = `
        <div class="stat-card"><div class="stat-k">Total answered</div><div class="stat-v">${answered}</div></div>
        <div class="stat-card"><div class="stat-k">Accuracy</div><div class="stat-v">${acc}%</div></div>
        <div class="stat-card"><div class="stat-k">Sets completed</div><div class="stat-v">${setsDone}/${totalPossibleSets}</div></div>`;
    progressView.append(stats);

    const grid = document.createElement("div");
    grid.className = "subject-grid";

    displayList.forEach(item => {
        const card = document.createElement("div");
        card.className = "subject-card";
        const head = document.createElement("div");
        head.className = "sub-head";
        
        const done = Object.keys(S_Progress()[item.key] || {}).length;
        const totalSets = Math.ceil(POOL[item.key].length / settings.defaultSetQuestions);
        head.innerHTML = `<div class="sub-title">${item.code}</div><div class="sub-meta">${done}/${totalSets} sets</div>`;
        card.append(head);

        const meter = document.createElement("div");
        meter.className = "meter";
        const mf = document.createElement("div");
        mf.className = "meter-fill";
        mf.style.width = (done / totalSets * 100) + "%";
        meter.append(mf);
        card.append(meter);

        const chips = document.createElement("div");
        chips.className = "chips";
        for (let i = 1; i <= totalSets; i++) {
            const state = getSet(item.key, i);
            const chip = document.createElement("button");
            chip.className = "chip " + (state ? "chip-ok" : "chip-warn");
            const emoji = document.createElement("span");
            const label = document.createElement("span");
            
            if (state) {
                emoji.textContent = "⭐";
                label.textContent = `set ${i} (${state.score}/${state.total})`;
            } else {
                emoji.textContent = "🔵";
                label.textContent = `set ${i}`;
            }

            const reset = document.createElement("button");
            reset.className = "reset";
            reset.textContent = "↻";
            reset.title = "Reset this set";
            reset.onclick = (e) => {
                e.stopPropagation();
                Sound.playNavigate();
                resetSet(item.key, i);
                toast(`Reset ${item.code} set ${i}`);
                renderProgress();
            };

            chip.append(emoji, label, reset);
            chip.onclick = () => {
                Sound.playNavigate();
                renderQuiz(item.key, i, settings.defaultSetQuestions);
            }

            chips.append(chip);
        }
        card.append(chips);
        grid.append(card);
    });
    progressView.append(grid);
}

/* ---------- Settings ---------- */
function renderSettings() {
    settingsView.innerHTML = `
        <div class="setting-group">
            <div class="setting-group-header" data-group="general">
                <div>
                    <div class="title">General Settings</div>
                    <div class="desc">Appearance and startup options.</div>
                </div>
                <div class="chevron">›</div>
            </div>
            <div class="setting-group-content">
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Show Tribute Animation</div>
                        <div class="desc">Play animation on app load.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="showTributeToggle" ${settings.showTribute ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <div class="setting-group">
            <div class="setting-group-header" data-group="randomizer">
                <div>
                    <div class="title">Randomization</div>
                    <div class="desc">Control how questions and answers are shuffled.</div>
                </div>
                <div class="chevron">›</div>
            </div>
            <div class="setting-group-content">
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Default Set Questions</div>
                        <div class="desc">Number of questions per set. (Min: 5)</div>
                    </div>
                    <div class="setting-control">
                        <input type="number" id="defaultSetQuestionsInput" value="${settings.defaultSetQuestions}" min="5" style="width: 80px; padding: 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--tile2); color: var(--ink-100);">
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Default Random Questions</div>
                        <div class="desc">Number of questions for "Randomize All". (Min: 10)</div>
                    </div>
                    <div class="setting-control">
                        <input type="number" id="defaultRandomQuestionsInput" value="${settings.defaultRandomQuestions}" min="10" style="width: 80px; padding: 8px; border-radius: 8px; border: 1px solid var(--line); background: var(--tile2); color: var(--ink-100);">
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Randomize All Subjects & Sets</div>
                        <div class="desc">Adds a quick-start button to the Subjects page.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="randomizeAllToggle" ${settings.randomizeAll ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Exclude Seen Questions</div>
                        <div class="desc">Don't repeat questions you've already answered.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="excludeSeenToggle" ${settings.excludeSeenQuestions ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Randomize Question Selection</div>
                        <div class="desc">Pull questions randomly from the available pool.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="randomizeSetSelectionToggle" ${settings.randomizeSetSelection ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Randomize Question Order</div>
                        <div class="desc">Shuffle question order within a set.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="randomizeQuestionOrderToggle" ${settings.randomizeQuestionOrder ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Shuffle Answer Order</div>
                        <div class="desc">Shuffle multiple-choice answer order.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="shuffleAnswerOrderToggle" ${settings.shuffleAnswerOrder ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <div class="setting-group">
            <div class="setting-group-header" data-group="audio">
                <div>
                    <div class="title">Audio Settings</div>
                    <div class="desc">Manage sound effects and music.</div>
                </div>
                <div class="chevron">›</div>
            </div>
            <div class="setting-group-content">
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Sound Effects</div>
                        <div class="desc">Enable UI sound effects.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="soundEffectsToggle" ${settings.soundEffects ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Background Music</div>
                        <div class="desc">Enable background music.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="backgroundMusicToggle" ${settings.backgroundMusic ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
                 <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Music Track</div>
                        <div class="desc">Choose your study vibe.</div>
                    </div>
                    <div class="setting-control" id="musicTrackControl">
                       <button class="mini ${settings.backgroundMusicTrack === 'chill' ? 'active' : ''}" data-track="chill">Chill</button>
                       <button class="mini ${settings.backgroundMusicTrack === 'hype' ? 'active' : ''}" data-track="hype">Hype</button>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Music Volume</div>
                    </div>
                    <div class="setting-control">
                        <input type="range" id="backgroundMusicVolumeSlider" min="0" max="1" step="0.05" value="${settings.backgroundMusicVolume}">
                        <span id="backgroundMusicVolumeLabel">${Math.round(settings.backgroundMusicVolume * 100)}%</span>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Navigation Volume</div>
                    </div>
                    <div class="setting-control">
                        <input type="range" id="navigateVolumeSlider" min="0" max="1" step="0.05" value="${settings.navigateVolume}">
                        <span id="navigateVolumeLabel">${Math.round(settings.navigateVolume * 100)}%</span>
                    </div>
                </div>
                 <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Correct Answer Volume</div>
                    </div>
                    <div class="setting-control">
                        <input type="range" id="correctVolumeSlider" min="0" max="1" step="0.05" value="${settings.correctVolume}">
                        <span id="correctVolumeLabel">${Math.round(settings.correctVolume * 100)}%</span>
                    </div>
                </div>
                <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Incorrect Answer Volume</div>
                    </div>
                    <div class="setting-control">
                        <input type="range" id="incorrectVolumeSlider" min="0" max="1" step="0.05" value="${settings.incorrectVolume}">
                        <span id="incorrectVolumeLabel">${Math.round(settings.incorrectVolume * 100)}%</span>
                    </div>
                </div>
                 <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">High Score Finish Volume</div>
                    </div>
                    <div class="setting-control">
                        <input type="range" id="finishGoodVolumeSlider" min="0" max="1" step="0.05" value="${settings.finishGoodVolume}">
                        <span id="finishGoodVolumeLabel">${Math.round(settings.finishGoodVolume * 100)}%</span>
                    </div>
                </div>
                 <div class="setting-row">
                    <div class="setting-text">
                        <div class="title">Low Score Finish Volume</div>
                    </div>
                    <div class="setting-control">
                        <input type="range" id="finishBadVolumeSlider" min="0" max="1" step="0.05" value="${settings.finishBadVolume}">
                        <span id="finishBadVolumeLabel">${Math.round(settings.finishBadVolume * 100)}%</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Accordion logic
    $$('.setting-group-header').forEach(header => {
        header.addEventListener('click', () => {
            Sound.playNavigate();
            const content = header.nextElementSibling;
            header.classList.toggle('open');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });

    // Event Listeners for Toggles
    $("#showTributeToggle").addEventListener('change', e => { settings.showTribute = e.target.checked; W_Settings(settings); });
    $("#randomizeAllToggle").addEventListener('change', e => { settings.randomizeAll = e.target.checked; W_Settings(settings); });
    $("#excludeSeenToggle").addEventListener('change', e => { settings.excludeSeenQuestions = e.target.checked; W_Settings(settings); });
    $("#randomizeSetSelectionToggle").addEventListener('change', e => { settings.randomizeSetSelection = e.target.checked; W_Settings(settings); });
    $("#randomizeQuestionOrderToggle").addEventListener('change', e => { settings.randomizeQuestionOrder = e.target.checked; W_Settings(settings); });
    $("#shuffleAnswerOrderToggle").addEventListener('change', e => { settings.shuffleAnswerOrder = e.target.checked; W_Settings(settings); });
    $("#soundEffectsToggle").addEventListener('change', e => { settings.soundEffects = e.target.checked; W_Settings(settings); });
    
    $("#backgroundMusicToggle").addEventListener('change', e => {
        settings.backgroundMusic = e.target.checked;
        W_Settings(settings);
        if (settings.backgroundMusic) Sound.playBackgroundMusic();
        else Sound.stopAllBackgroundMusic();
        updateMusicToggleButton();
    });
    
    // Music Track Selection
    $('#musicTrackControl').addEventListener('click', e => {
        const btn = e.target.closest('.mini');
        if(!btn) return;
        $$('.mini', e.currentTarget).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        Sound.switchTrack(btn.dataset.track);
    });

    // Event Listeners for Number Inputs
    $("#defaultSetQuestionsInput").addEventListener('change', e => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 5) {
            val = 5;
            e.target.value = val;
            toast("Minimum questions per set is 5.");
        }
        settings.defaultSetQuestions = val;
        W_Settings(settings);
        toast("Default set length saved.");
    });
    $("#defaultRandomQuestionsInput").addEventListener('change', e => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 10) {
            val = 10;
            e.target.value = val;
            toast("Minimum questions for random quiz is 10.");
        }
        settings.defaultRandomQuestions = val;
        W_Settings(settings);
        toast("Default random quiz length saved.");
    });

    // Helper for volume sliders
    const setupVolumeSlider = (sliderId, labelId, settingKey, soundPreviewFn) => {
        const slider = $(`#${sliderId}`);
        const label = $(`#${labelId}`);
        slider.addEventListener('input', e => {
            const newVolume = parseFloat(e.target.value);
            settings[settingKey] = newVolume;
            label.textContent = `${Math.round(newVolume * 100)}%`;
            if (settingKey === 'backgroundMusicVolume') {
                const bgMusic = Sound.getCurrentMusicElement();
                if (bgMusic) bgMusic.volume = newVolume;
            }
        });
        slider.addEventListener('change', () => {
            W_Settings(settings);
            if (soundPreviewFn) soundPreviewFn();
        });
    };

    // Setup all volume sliders
    setupVolumeSlider('backgroundMusicVolumeSlider', 'backgroundMusicVolumeLabel', 'backgroundMusicVolume');
    setupVolumeSlider('navigateVolumeSlider', 'navigateVolumeLabel', 'navigateVolume', Sound.playNavigate);
    setupVolumeSlider('correctVolumeSlider', 'correctVolumeLabel', 'correctVolume', Sound.playCorrect);
    setupVolumeSlider('incorrectVolumeSlider', 'incorrectVolumeLabel', 'incorrectVolume', Sound.playIncorrect);
    setupVolumeSlider('finishGoodVolumeSlider', 'finishGoodVolumeLabel', 'finishGoodVolume', Sound.playFinishGood);
    setupVolumeSlider('finishBadVolumeSlider', 'finishBadVolumeLabel', 'finishBadVolume', Sound.playFinishBad);
}

/* ---------- Wrong History (Practice Mode) ---------- */
let practiceList = [], practiceIdx = 0;

function renderHistory() {
    historyView.innerHTML = "";
    const st = S_Progress(),
        hist = (st.__history || []).slice(-120).reverse();

    const actions = document.createElement("div");
    actions.className = "history-actions";
    const clear = document.createElement("button");
    clear.className = "mini ghost";
    clear.textContent = "Clear history";
    clear.onclick = () => {
        Sound.playNavigate();
        const s = S_Progress();
        s.__history = [];
        W_Progress(s);
        renderHistory()
    };
    actions.append(clear);
    historyView.append(actions);

    if (!hist.length) {
        const empty = document.createElement("div");
        empty.className = "hist-empty";
        empty.textContent = "No wrong answers yet. Keep studying! ✨";
        historyView.append(empty);
        return;
    }

    const list = document.createElement("div");
    list.className = "history-list";

    const groupedHistory = hist.reduce((acc, item) => {
        const groupKey = `${item.k} • set ${item.i}`;
        if(!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
    }, {});

    Object.entries(groupedHistory).forEach(([groupKey, items]) => {
        const group = document.createElement('div');
        group.className = 'setting-group';
        
        const header = document.createElement('div');
        header.className = 'setting-group-header';
        header.innerHTML = `
            <div>
                <div class="title">${groupKey}</div>
            </div>
            <div class="chevron">›</div>
        `;
        group.append(header);

        const content = document.createElement('div');
        content.className = 'setting-group-content';
        
        const innerList = document.createElement('div');
        innerList.className = 'history-list';
        innerList.style.padding = '16px';

        items.forEach((item, idx) => {
            const q = (POOL[item.k] || []).find(x => x.id === item.qid);
            if (!q) return;

            const row = document.createElement("div");
            row.className = "hist-row";

            const qCell = document.createElement("div");
            qCell.className = "hist-q-cell";
            qCell.textContent = q.q;

            const actionCell = document.createElement("div");
            actionCell.className = "hist-action-cell";
            const btn = document.createElement("button");
            btn.className = "mini";
            btn.textContent = "📝 Practice";
            btn.onclick = () => {
                Sound.playNavigate();
                startPractice(hist.indexOf(item));
            };
            actionCell.append(btn);

            row.append(qCell, actionCell);
            innerList.append(row);
        });
        
        content.append(innerList);
        group.append(content);
        list.append(group);
    });

    historyView.append(list);

    // Accordion logic for history
    $$('.setting-group-header', historyView).forEach(header => {
        header.addEventListener('click', () => {
            Sound.playNavigate();
            const content = header.nextElementSibling;
            header.classList.toggle('open');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
}

function startPractice(startIndex) {
  const st = S_Progress();
  practiceList = (st.__history || []).slice(-120).reverse();
  if (!practiceList.length) {
    renderHistory();
    return;
  }
  practiceIdx = Math.max(0, Math.min(startIndex, practiceList.length - 1));
  $("#modal").classList.remove("hidden");
  drawPractice();
}

function drawPractice() {
  const st = S_Progress();
  practiceList = (st.__history || []).slice(-120).reverse();

  if (!practiceList.length) {
    $("#modal").classList.add("hidden");
    renderHistory();
    toast("All corrected — history is clear");
    return;
  }

  practiceIdx = Math.max(0, Math.min(practiceIdx, practiceList.length - 1));
  const it = practiceList[practiceIdx];
  const pool = POOL[it.k] || [];
  const q = pool.find(x => x.id === it.qid);

  if (!q) {
    remWrong(it.k, it.i, it.qid);
    drawPractice();
    return;
  }
  
  const [subject, subtopic] = it.k.split('::');
  $("#revMeta").textContent = subtopic ? `${subject} - ${subtopic} • set ${it.i}` : `${subject} • set ${it.i}`;
  $("#revQ").textContent = q.q;
  const ans = $("#revAns");
  ans.innerHTML = "";

  const correctText = q.type === 'subjective' ? q.answer : q.options[q.answer];
  
  if(q.type === 'subjective') {
    ans.innerHTML = `<div class="answer-text" style="color: var(--ink-100)">${q.answer}</div>`;
  } else {
    const opts = shuffleArray(q.options.slice());
    opts.forEach(optText => {
        const b = document.createElement("button");
        b.className = "opt";
        b.textContent = optText;
        b.onclick = () => {
            if (optText === correctText) {
                Sound.playCorrect();
                b.classList.add("correct");
                remWrong(it.k, it.i, it.qid);
                checkAchievements(); // Check for 'Redemption' achievement
                setTimeout(() => {
                    const s2 = S_Progress();
                    practiceList = (s2.__history || []).slice(-120).reverse();
                    if (!practiceList.length) {
                        $("#modal").classList.add("hidden");
                        renderHistory();
                        toast("Removed from Wrong History");
                        return;
                    }
                    practiceIdx = Math.min(practiceIdx, practiceList.length - 1);
                    drawPractice();
                    renderHistory();
                }, 550);
            } else {
                Sound.playIncorrect();
                b.classList.add("incorrect");
                b.disabled = true;
            }
        };
        ans.appendChild(b);
    });
  }

  $("#histPrev").onclick = () => {
    Sound.playNavigate();
    practiceIdx = (practiceIdx - 1 + practiceList.length) % practiceList.length;
    drawPractice();
  };
  $("#histNext").onclick = () => {
    Sound.playNavigate();
    practiceIdx = (practiceIdx + 1) % practiceList.length;
    drawPractice();
  };
  $("#openHistory").onclick = () => {
    Sound.playNavigate();
    $("#modal").classList.add("hidden");
    renderHistory();
  };
  $("#closeModal").onclick = () => {
    Sound.playNavigate();
    $("#modal").classList.add("hidden");
  };
}

/* ---------- Question Bank ---------- */
function renderQuestionBank() {
    qbankView.innerHTML = "";
    const progress = S_Progress();
    const seenIds = new Set(Object.keys(progress.__seen || {}));
    
    const actions = document.createElement("div");
    actions.className = "history-actions";
    const clear = document.createElement("button");
    clear.className = "mini ghost";
    clear.textContent = "Clear Seen History";
    clear.onclick = () => {
        Sound.playNavigate();
        const s = S_Progress();
        s.__seen = {};
        W_Progress(s);
        toast("Seen question history cleared.");
        renderQuestionBank();
    };
    actions.append(clear);
    qbankView.append(actions);
    
    Object.entries(POOL).forEach(([key, questions]) => {
        const [subject, subtopic] = key.split('::');
        const group = document.createElement('div');
        group.className = 'setting-group'; // Reuse style
        
        const header = document.createElement('div');
        header.className = 'setting-group-header';
        header.innerHTML = `
            <div>
                <div class="title">${subtopic ? `${subject} - ${subtopic}` : subject}</div>
            </div>
            <div class="chevron">›</div>
        `;
        group.append(header);

        const content = document.createElement('div');
        content.className = 'setting-group-content';
        
        const list = document.createElement('div');
        list.className = 'history-list';
        list.style.padding = '16px';

        questions.forEach(q => {
            const row = document.createElement("div");
            row.className = "hist-row";
            const seen = seenIds.has(q.id);
             if (seen) {
                row.style.opacity = "0.6";
            }

            const qCell = document.createElement("div");
            qCell.className = "hist-q-cell";
            qCell.textContent = q.q;

            const statusCell = document.createElement("div");
            statusCell.className = "hist-action-cell";
            statusCell.textContent = seen ? "✅ Seen" : "❔ Unseen";
            statusCell.style.color = seen ? 'var(--ok)' : 'var(--warn)';
            
            row.append(qCell, statusCell);
            list.append(row);
        });
        
        content.append(list);
        group.append(content);
        qbankView.append(group);
    });

    // Accordion logic for question bank
    $$('.setting-group-header', qbankView).forEach(header => {
        header.addEventListener('click', () => {
            Sound.playNavigate();
            const content = header.nextElementSibling;
            header.classList.toggle('open');
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
            }
        });
    });
}

/* ---------- Custom Quiz ---------- */
function renderCustomQuiz() {
    customQuizView.innerHTML = "";
    const intro = document.createElement('p');
    intro.textContent = "Select any combination of sets from any subject to create your own custom quiz.";
    intro.style.textAlign = 'center';
    intro.style.marginBottom = '20px';
    customQuizView.append(intro);

    const selectionGrid = document.createElement('div');
    selectionGrid.className = 'subject-grid'; // Reuse style
    selectionGrid.style.gap = '16px';

    Object.entries(POOL).forEach(([key, questions]) => {
        const [subject, subtopic] = key.split('::');
        const group = document.createElement('div');
        group.className = 'subject-card';
        
        const head = document.createElement('div');
        head.className = 'sub-head';
        head.innerHTML = `<div class="sub-title">${subtopic ? `${subject} - ${subtopic}` : subject}</div>`;
        group.append(head);

        const setChips = document.createElement('div');
        setChips.className = 'chips';
        
        const sets = {};
        const setSize = settings.defaultSetQuestions;
        questions.forEach((q, index) => {
            const setNum = Math.floor(index / setSize) + 1;
            if(!sets[setNum]) sets[setNum] = [];
            sets[setNum].push(q);
        });

        Object.keys(sets).forEach(setNum => {
            const label = document.createElement('label');
            label.className = 'chip';
            label.style.cursor = 'pointer';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.key = key;
            checkbox.dataset.set = setNum;
            checkbox.style.marginRight = '8px';
            label.append(checkbox, `Set ${setNum}`);
            setChips.append(label);
        });

        group.append(setChips);
        selectionGrid.append(group);
    });

    customQuizView.append(selectionGrid);

    const controls = document.createElement('div');
    controls.style.marginTop = '24px';
    controls.style.display = 'flex';
    controls.style.justifyContent = 'center';
    controls.style.alignItems = 'center';
    controls.style.gap = '16px';
    controls.style.flexWrap = 'wrap';

    const inputLabel = document.createElement('label');
    inputLabel.textContent = 'Number of questions:';
    inputLabel.style.fontWeight = '700';
    
    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.id = 'customQuizCount';
    numberInput.value = 10;
    numberInput.min = 1;
    numberInput.style.width = '80px';
    numberInput.style.padding = '8px';
    numberInput.style.borderRadius = '8px';
    numberInput.style.border = '1px solid var(--line)';
    numberInput.style.background = 'var(--tile2)';
    numberInput.style.color = 'var(--ink-100)';
    numberInput.style.fontFamily = 'inherit';
    
    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start Custom Quiz';

    // Logic to update max questions
    selectionGrid.addEventListener('change', () => {
        const selectedSets = $$('input[type="checkbox"]:checked', customQuizView);
        let questionCount = 0;
        selectedSets.forEach(checkbox => {
            const key = checkbox.dataset.key;
            const setNum = parseInt(checkbox.dataset.set, 10);
            const start = (setNum - 1) * settings.defaultSetQuestions;
            const setQuestions = POOL[key].slice(start, start + settings.defaultSetQuestions);
            questionCount += setQuestions.length;
        });
        numberInput.max = questionCount > 0 ? questionCount : 1;
        if (parseInt(numberInput.value) > questionCount) {
            numberInput.value = questionCount;
        }
    });


    startBtn.onclick = () => {
        const selectedSets = $$('input[type="checkbox"]:checked', customQuizView);
        if(selectedSets.length === 0) {
            toast("Please select at least one set.");
            return;
        }

        let customPool = [];
        selectedSets.forEach(checkbox => {
            const key = checkbox.dataset.key;
            const setNum = parseInt(checkbox.dataset.set, 10);
            const start = (setNum - 1) * settings.defaultSetQuestions;
            const setQuestions = POOL[key].slice(start, start + settings.defaultSetQuestions);
            customPool.push(...setQuestions);
        });

        const numQuestions = parseInt(numberInput.value, 10);
        if (isNaN(numQuestions) || numQuestions < 1) {
            toast("Please enter a valid number of questions.");
            return;
        }
        if (numQuestions > customPool.length) {
            toast(`You can only set a limit of ${customPool.length} questions.`);
            numberInput.value = customPool.length;
            return;
        }

        const finalQuestions = shuffleArray(customPool).slice(0, numQuestions);
        renderQuiz('Custom Quiz', 1, finalQuestions.length, finalQuestions);
    };

    controls.append(inputLabel, numberInput, startBtn);
    customQuizView.append(controls);
}

/* ---------- Tutorials ---------- */
function renderTutorials() {
    tutorialsView.innerHTML = `
        <div class="setting-group">
            <div class="setting-group-header open" data-group="custom-quiz">
                <div>
                    <div class="title">🔀 In-Depth Guide: Custom Quiz</div>
                    <div class="desc">Create the perfect study session tailored to your needs.</div>
                </div>
                <div class="chevron" style="transform: rotate(90deg);">›</div>
            </div>
            <div class="setting-group-content" style="max-height: 500px;">
                <div style="padding: 16px; line-height: 1.6;">
                    <p>The <strong>Custom Quiz</strong> tab is your most powerful tool for targeted studying. It allows you to break free from the pre-defined subjects and focus precisely on what you need to learn.</p>
                    <h4>How It Works:</h4>
                    <ol style="margin-left: 20px;">
                        <li><strong>Select Your Sets:</strong> Browse through all the subjects and subtopics. Click the checkboxes next to any set you want to include. You can mix and match from different subjects to create a comprehensive review. For example, select "Set 1" from <em>Genetics</em> and "Set 3" from <em>Immunology</em>.</li>
                        <li><strong>Choose the Length:</strong> After selecting your sets, the total number of available questions is calculated. You can then enter the exact number of questions you want in your quiz in the input box. This is great for quick 10-question reviews or longer 50-question practice exams.</li>
                        <li><strong>Start Quiz:</strong> Click the "Start Custom Quiz" button. The app will pull your chosen number of questions randomly from all the sets you selected and begin your personalized session.</li>
                    </ol>
                    <h4>Pro-Tips for Effective Studying:</h4>
                    <p>
                       - <strong>Target Weak Areas:</strong> After a few standard quizzes, check the "Progress" tab. If you see you're struggling with a specific topic, come here and build a custom quiz using only sets from that topic.
                       <br>- <strong>Spaced Repetition:</strong> Create a small quiz of 10-15 questions from topics you studied last week to reinforce your memory.
                       <br>- <strong>Exam Simulation:</strong> Combine sets from all subjects to simulate a final exam, helping you practice switching between different concepts.
                    </p>
                </div>
            </div>
        </div>
         <div class="setting-group">
            <div class="setting-group-header" data-group="history-practice">
                <div>
                    <div class="title">⌛ Mastering the History & Practice Mode</div>
                    <div class="desc">Turn your mistakes into your greatest strengths.</div>
                </div>
                <div class="chevron">›</div>
            </div>
            <div class="setting-group-content">
                <div style="padding: 16px; line-height: 1.6;">
                    <p>Every question you get wrong is automatically added to the <strong>History</strong> tab. This isn't a list of failures; it's a personalized list of opportunities to learn.</p>
                    <h4>How to Use It:</h4>
                    <p>
                       - <strong>Review Your Errors:</strong> Go to the "History" tab to see a list of all the questions you've answered incorrectly, grouped by the quiz you took.
                       <br>- <strong>Practice Mode:</strong> Click the "Practice" button next to any question. This opens a special review modal where you can try the question again without the pressure of a real quiz.
                       <br>- <strong>Instant Correction:</strong> If you get it right in practice mode, it's instantly removed from your history. This ensures your history list always reflects what you still need to work on.
                       <br>- <strong>Clear History:</strong> Once you feel confident, you can clear your entire history and start fresh.
                    </p>
                </div>
            </div>
        </div>
         <div class="setting-group">
            <div class="setting-group-header" data-group="q-bank">
                <div>
                    <div class="title">🏦 Understanding the Question Bank</div>
                </div>
                <div class="chevron">›</div>
            </div>
            <div class="setting-group-content">
                <div style="padding: 16px; line-height: 1.6;">
                    <p>The Question Bank shows you every single question available in the app. It helps you track your overall coverage of the material.</p>
                    <ul>
                        <li><strong>✅ Seen:</strong> This question has appeared in at least one of your quizzes.</li>
                        <li><strong>❔ Unseen:</strong> You have not yet encountered this question.</li>
                    </ul>
                    <p>Use the "Clear Seen History" button to reset the status of all questions back to "Unseen". This is useful if you want to start tracking your progress from scratch. Combine this with the "Exclude Seen Questions" setting for a powerful way to ensure you see every question at least once.</p>
                </div>
            </div>
        </div>
         <div class="setting-group">
            <div class="setting-group-header" data-group="random-settings">
                <div>
                    <div class="title">⚙️ Mastering the Randomization Settings</div>
                </div>
                <div class="chevron">›</div>
            </div>
            <div class="setting-group-content">
                <div style="padding: 16px; line-height: 1.6;">
                    <h4>Simple Explanation</h4>
                    <p>These toggles change how quizzes are created. You can make sets pull random questions, shuffle the order, and even hide questions you've already seen to focus on new material.</p>
                    <hr style="border-color: var(--line); margin: 16px 0;">
                    <h4>In-Depth Scenarios</h4>
                    <p>Here’s how the settings interact:</p>
                    <ul>
                        <li><strong>Scenario 1: Standard Study</strong><br>
                            <code>Randomize Question Selection</code> is OFF.<br>
                            <strong>Outcome:</strong> "Set 1" will always contain the first 5 questions from the topic's list. This is predictable and good for structured learning.
                        </li>
                        <br>
                        <li><strong>Scenario 2: Focused Review</strong><br>
                            <code>Randomize Question Selection</code> is ON.<br>
                            <code>Exclude Seen Questions</code> is ON.<br>
                            <strong>Outcome:</strong> Each time you start a quiz, it will pull random questions *that you haven't seen before* from that topic. This is the best way to ensure you cover all the material.
                        </li>
                        <br>
                         <li><strong>Scenario 3: Mixed Practice</strong><br>
                            <code>Randomize Question Selection</code> is ON.<br>
                            <code>Exclude Seen Questions</code> is OFF.<br>
                            <strong>Outcome:</strong> Quizzes will be a random mix of all questions from the topic, including ones you've already answered. This is great for reinforcing what you've learned.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    // Accordion logic for tutorials
    $$('.setting-group-header', tutorialsView).forEach(header => {
        header.addEventListener('click', () => {
            Sound.playNavigate();
            const content = header.nextElementSibling;
            const wasOpen = header.classList.contains('open');
            
            // Close all others
            $$('.setting-group-header', tutorialsView).forEach(h => {
                h.classList.remove('open');
                h.nextElementSibling.style.maxHeight = null;
                 h.querySelector('.chevron').style.transform = 'rotate(0deg)';
            });

            if (!wasOpen) {
                header.classList.add('open');
                content.style.maxHeight = content.scrollHeight + "px";
                header.querySelector('.chevron').style.transform = 'rotate(90deg)';
            }
        });
    });
}

function updateMusicToggleButton() {
    const btn = $("#toggleMusicBtn");
    if (!btn) return;
    const icon = !settings.musicMuted ? 
        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>` :
        `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
    btn.innerHTML = icon;
}

/* ---------- Results Screen ---------- */
function showResults() {
    Sound.playNavigate(); // Added sound to finish button
    hide(quizPanel);
    const scoreRatio = ctx.score / ctx.chosen.length;
    let result;

    if (scoreRatio >= 0.8) {
        result = {
            emoji: '🏆',
            title: 'Stellar Performance!',
            message: 'You\'ve mastered this topic. Your knowledge is shining bright!',
            sound: 'sound-finish-good'
        };
    } else if (scoreRatio >= 0.5) {
         result = {
            emoji: '👍',
            title: 'Solid Effort!',
            message: 'A great foundation is built. Keep refining those tricky concepts!',
            sound: 'sound-finish-good'
        };
    } else {
         result = {
            emoji: '🌱',
            title: 'Keep Growing!',
            message: 'Every challenge is a chance to learn. Review your answers and try again!',
            sound: 'sound-finish-bad'
        };
    }

    $("#resultsEmoji").textContent = result.emoji;
    $("#resultsTitle").textContent = result.title;
    $("#resultsScore").textContent = `You scored ${ctx.score} out of ${ctx.chosen.length}`;
    $("#resultsMessage").textContent = result.message;

    if(ctx.key !== 'Custom Quiz' && ctx.key !== 'Full Random') {
        putSet(ctx.key, ctx.index, {
          score: ctx.score,
          total: ctx.chosen.length,
          ts: Date.now()
        });
    }
    
    // Update stats after a quiz
    const progress = S_Progress();
    progress.stats.quizzesCompleted = (progress.stats.quizzesCompleted || 0) + 1;
    if (scoreRatio === 1) {
        progress.stats.perfectScores = (progress.stats.perfectScores || 0) + 1;
    }
    W_Progress(progress);
    checkAchievements();

    Sound.duckBackgroundMusic(400); // Faster fade out
    Sound.play(result.sound, settings[result.sound === 'sound-finish-good' ? 'finishGoodVolume' : 'finishBadVolume']);
    
    const resultsScreen = $("#resultsScreen");
    show(resultsScreen);

    resultsScreen.onclick = () => {
        Sound.playNavigate();
        resultsScreen.classList.add('splash-fade-out');
        setTimeout(() => {
            hide(resultsScreen);
            resultsScreen.classList.remove('splash-fade-out');
            show(headerContainer);
            $(`.tab[data-tab="${currentTab}"]`).click();
            Sound.unduckBackgroundMusic();
        }, 500);
    };
}

/* ---------- Achievements System ---------- */
const ACHIEVEMENTS = {
    'first_visit': { name: "Lab Coat Acquired!", desc: "Began your journey into the microbial world.", icon: '🥼' },
    'first_quiz': { name: "First Culture", desc: "Completed your very first quiz.", icon: '🧪' },
    'perfect_score': { name: "Sterile Technique", desc: "Achieved a perfect 100% score on a quiz.", icon: '🏆' },
    'five_perfect': { name: "Master of Asepsis", desc: "Achieved 5 perfect scores.", icon: '🥇' },
    'streak_5': { name: "Growing Colony", desc: "Answered 5 questions correctly in a row.", icon: '🔥' },
    'streak_15': { name: "Spreading Biofilm", desc: "Answered 15 questions correctly in a row.", icon: '🔥🔥' },
    'streak_30': { name: "Global Pandemic", desc: "Answered 30 questions correctly in a row.", icon: '🔥🔥🔥' },
    'quiz_master_10': { name: "Lab Assistant", desc: "Completed 10 quizzes.", icon: '🧑‍🔬' },
    'quiz_master_50': { name: "Senior Researcher", desc: "Completed 50 quizzes.", icon: '👩‍🏫' },
    'question_champ_100': { name: "Centurion", desc: "Answered 100 questions.", icon: '💯' },
    'redemption': { name: "Adaptive Resistance", desc: "Correctly answered a question in Practice Mode.", icon: '💪' },
    'history_clear': { name: "Decontaminated", desc: "Cleared your entire Wrong History.", icon: '🧼' },
    'all_subjects': { name: "The Explorer", desc: "Completed a quiz in every subject.", icon: '🗺️' },
    'custom_quiz': { name: "Genetic Engineer", desc: "Created and completed your first Custom Quiz.", icon: '🧬' },
    'night_owl': { name: "Night Owl", desc: "Completed a quiz between 10 PM and 4 AM.", icon: '🦉' },
    'early_bird': { name: "Early Bird", desc: "Completed a quiz between 5 AM and 8 AM.", icon: '☀️' },
    'settings_tinkerer': { name: "Lab Technician", desc: "Explored the settings menu.", icon: '⚙️' },
    'full_random': { name: "Embracing Chaos", desc: "Completed a 'Fully Randomized' quiz.", icon: '🎲' },
    'subject_adept': { name: "Subject Specialist", desc: "Completed 5 quizzes in a single subject.", icon: '🎓' },
    'completionist': { name: "Microbe Master", desc: "Unlocked all other achievements.", icon: '👑' }
};

function unlockAchievement(id) {
    const progress = S_Progress();
    if (progress.achievements[id]) return; // Already unlocked

    progress.achievements[id] = Date.now();
    W_Progress(progress);

    const achievement = ACHIEVEMENTS[id];
    Sound.duckBackgroundMusic();
    Sound.playAchievement();

    $('#achievementMicrobe').textContent = achievement.icon;
    $('#achievementName').textContent = achievement.name;
    $('#achievementDesc').textContent = achievement.desc;

    const screen = $('#achievementScreen');
    show(screen);

    screen.onclick = () => {
        screen.classList.add('splash-fade-out');
        setTimeout(() => {
            hide(screen);
            screen.classList.remove('splash-fade-out');
            Sound.unduckBackgroundMusic();
        }, 500);
    };
    checkAchievements(); // Check for completionist
}

function checkAchievements() {
    const progress = S_Progress();
    const stats = progress.stats;

    // First Visit
    if (!progress.achievements['first_visit']) unlockAchievement('first_visit');
    // First Quiz
    if (stats.quizzesCompleted >= 1 && !progress.achievements['first_quiz']) unlockAchievement('first_quiz');
    // Perfect Score
    if (stats.perfectScores >= 1 && !progress.achievements['perfect_score']) unlockAchievement('perfect_score');
    // 5 Perfect Scores
    if (stats.perfectScores >= 5 && !progress.achievements['five_perfect']) unlockAchievement('five_perfect');
    // Streaks
    if (stats.correctStreak >= 5 && !progress.achievements['streak_5']) unlockAchievement('streak_5');
    if (stats.correctStreak >= 15 && !progress.achievements['streak_15']) unlockAchievement('streak_15');
    if (stats.correctStreak >= 30 && !progress.achievements['streak_30']) unlockAchievement('streak_30');
    // Quizzes Completed
    if (stats.quizzesCompleted >= 10 && !progress.achievements['quiz_master_10']) unlockAchievement('quiz_master_10');
    if (stats.quizzesCompleted >= 50 && !progress.achievements['quiz_master_50']) unlockAchievement('quiz_master_50');
    // Questions Answered
    if (stats.questionsAnswered >= 100 && !progress.achievements['question_champ_100']) unlockAchievement('question_champ_100');
    // Redemption (checked in drawPractice)
    if ((progress.__history || []).length < (stats.lastHistoryCount || 0) && !progress.achievements['redemption']) {
        unlockAchievement('redemption');
    }
    stats.lastHistoryCount = (progress.__history || []).length;
    // History Clear (checked in renderHistory)
    // All Subjects
    const completedSubjects = new Set(Object.keys(progress).filter(k => k.includes('::') || SUBJECTS.some(s => s.code === k)));
    if (completedSubjects.size >= SUBJECTS.length && !progress.achievements['all_subjects']) unlockAchievement('all_subjects');
    // Custom Quiz
    if (ctx && ctx.key === 'Custom Quiz' && !progress.achievements['custom_quiz']) unlockAchievement('custom_quiz');
    // Full Random
    if (ctx && ctx.key === 'Full Random' && !progress.achievements['full_random']) unlockAchievement('full_random');
    // Time-based
    const hour = new Date().getHours();
    if ((hour >= 22 || hour < 4) && !progress.achievements['night_owl']) unlockAchievement('night_owl');
    if ((hour >= 5 && hour < 8) && !progress.achievements['early_bird']) unlockAchievement('early_bird');
    // Settings Tinkerer (checked in renderSettings)
    // Subject Adept
    for (const key of Object.keys(POOL)) {
        if (Object.keys(progress[key] || {}).length >= 5 && !progress.achievements['subject_adept']) {
            unlockAchievement('subject_adept');
            break;
        }
    }
    // Completionist
    const unlockedCount = Object.keys(progress.achievements).length;
    if (unlockedCount >= Object.keys(ACHIEVEMENTS).length - 1 && !progress.achievements['completionist']) {
        unlockAchievement('completionist');
    }

    W_Progress(progress);
}

function renderAchievements() {
    achievementsView.innerHTML = "";
    const progress = S_Progress();
    const grid = document.createElement('div');
    grid.className = 'achievement-grid';

    for (const id in ACHIEVEMENTS) {
        const achievement = ACHIEVEMENTS[id];
        const unlocked = !!progress.achievements[id];

        const card = document.createElement('div');
        card.className = `achievement-card ${unlocked ? 'unlocked' : ''}`;
        
        const icon = document.createElement('div');
        icon.className = 'achievement-icon';
        icon.textContent = unlocked ? achievement.icon : '❓';

        const text = document.createElement('div');
        text.className = 'achievement-text';
        
        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = achievement.name;

        const desc = document.createElement('div');
        desc.className = 'desc';
        desc.textContent = unlocked ? achievement.desc : 'Keep studying to unlock!';

        text.append(title, desc);
        card.append(icon, text);
        grid.append(card);
    }
    achievementsView.append(grid);
}


/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
    const splash = $("#splashScreen");
    
    // First-time visit logic
    const progress = S_Progress();
    const today = new Date().toLocaleDateString();
    if (!progress.stats.loginDays.includes(today)) {
        progress.stats.loginDays.push(today);
    }
    W_Progress(progress);
    checkAchievements(); // Check for 'First Visit'

    if (settings.showTribute) {
        setTimeout(() => {
            splash.classList.add("splash-fade-out");
            setTimeout(() => {
                splash.remove();
                $('.shell').classList.add('loaded');
            }, 1000);
        }, 2800); 
    } else {
        splash.remove();
        $('.shell').classList.add('loaded');
    }
    
    renderSubjects();
    
    const toggleMusicBtn = $("#toggleMusicBtn");
    updateMusicToggleButton();
    toggleMusicBtn.onclick = () => {
        Sound.playNavigate();
        Sound.toggleMute();
    };

    // This single event listener on the body will "unlock" audio playback on mobile browsers,
    // which helps prevent the initial sound lag.
    document.body.addEventListener('click', () => {
        if (settings.backgroundMusic) {
            Sound.playBackgroundMusic();
        }
    }, { once: true });
});
