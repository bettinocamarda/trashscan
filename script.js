// URL del modello Teachable Machine esportato
// IMPORTANTE: Sostituisci questo URL con quello del tuo modello esportato da Teachable Machine
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/[TUO_MODELLO_ID]/";

// Elementi DOM
const webcamContainer = document.getElementById('webcam-container');
const labelContainer = document.getElementById('label-container');
const captureBtn = document.getElementById('capture-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const resultContainer = document.getElementById('result-container');
const wasteType = document.getElementById('waste-type');
const wasteDescription = document.getElementById('waste-description');
const resultIcon = document.getElementById('result-icon');
const correctBtn = document.getElementById('correct-btn');
const wrongBtn = document.getElementById('wrong-btn');
const analyzedCount = document.getElementById('analyzed-count');
const accuracy = document.getElementById('accuracy');

// Variabili globali
let model, webcam, maxPredictions;
let capturedImage = null;
let stats = {
    analyzed: 0,
    correct: 0
};

// Database di informazioni sui rifiuti
const wasteDatabase = {
    'Plastica': {
        description: 'Questo oggetto va gettato nel bidone della plastica. Assicurati che sia pulito e svuotato.',
        icon: 'icons/plastica.png',
        color: '#ffeb3b'
    },
    'Carta': {
        description: 'Questo oggetto va gettato nel bidone della carta. Rimuovi eventuali parti non cartacee come nastro adesivo o punti metallici.',
        icon: 'icons/carta.png',
        color: '#2196f3'
    },
    'Organico': {
        description: 'Questo oggetto va gettato nel bidone dell\'organico. Ideale per scarti alimentari e materiali biodegradabili.',
        icon: 'icons/organico.png',
        color: '#795548'
    },
    'Vetro': {
        description: 'Questo oggetto va gettato nel bidone del vetro. Assicurati che sia pulito e svuotato.',
        icon: 'icons/vetro.png',
        color: '#4caf50'
    },
    'Indifferenziato': {
        description: 'Questo oggetto va gettato nel bidone dell\'indifferenziato. Non è riciclabile nei normali circuiti di raccolta differenziata.',
        icon: 'icons/indifferenziato.png',
        color: '#9e9e9e'
    }
};

// Inizializzazione
async function init() {
    // Carica il modello
    const modelURL = MODEL_URL + 'model.json';
    const metadataURL = MODEL_URL + 'metadata.json';
    
    try {
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();
        
        // Configura la webcam
        webcam = new tmImage.Webcam(400, 300, true); // larghezza, altezza, flip camera
        await webcam.setup();
        await webcam.play();
        webcamContainer.appendChild(webcam.canvas);
        
        // Mostra messaggio di stato
        labelContainer.innerHTML = '<p>Webcam pronta! Inquadra un rifiuto e scatta una foto.</p>';
        
        // Abilita il pulsante di cattura
        captureBtn.disabled = false;
        analyzeBtn.disabled = true;
        
        // Event listeners
        captureBtn.addEventListener('click', capturePicture);
        analyzeBtn.addEventListener('click', analyzePicture);
        correctBtn.addEventListener('click', () => provideFeedback(true));
        wrongBtn.addEventListener('click', () => provideFeedback(false));
        
        // Loop per mantenere aggiornata la visualizzazione della webcam
        window.requestAnimationFrame(loop);
    } catch (error) {
        console.error('Errore durante l\'inizializzazione:', error);
        labelContainer.innerHTML = '<p class="error">Errore durante l\'inizializzazione. Ricarica la pagina e assicurati di aver consentito l\'accesso alla webcam.</p>';
    }
}

async function loop() {
    webcam.update();
    window.requestAnimationFrame(loop);
}

// Cattura un'immagine dalla webcam
function capturePicture() {
    capturedImage = webcam.canvas.toDataURL('image/png');
    labelContainer.innerHTML = '<p>Immagine catturata! Ora puoi analizzarla.</p>';
    analyzeBtn.disabled = false;
}

// Analizza l'immagine catturata
async function analyzePicture() {
    if (!capturedImage) {
        labelContainer.innerHTML = '<p class="error">Nessuna immagine catturata. Scatta prima una foto.</p>';
        return;
    }
    
    try {
        // Crea un'immagine temporanea per l'analisi
        const img = new Image();
        img.src = capturedImage;
        
        // Attendi che l'immagine sia caricata
        await new Promise(resolve => {
            img.onload = resolve;
        });
        
        // Fai la predizione
        const predictions = await model.predict(img);
        
        // Trova la classe con la confidenza più alta
        let highestPrediction = predictions[0];
        
        for (let i = 1; i < maxPredictions; i++) {
            if (predictions[i].probability > highestPrediction.probability) {
                highestPrediction = predictions[i];
            }
        }
        
        // Mostra il risultato
        displayResult(highestPrediction.className, highestPrediction.probability.toFixed(2));
        
        // Aggiorna le statistiche
        stats.analyzed++;
        updateStats();
    } catch (error) {
        console.error('Errore durante l\'analisi:', error);
        labelContainer.innerHTML = '<p class="error">Errore durante l\'analisi dell\'immagine. Prova a scattare un\'altra foto.</p>';
    }
}

// Mostra il risultato dell'analisi
function displayResult(wasteClass, confidence) {
    // Ottieni le informazioni dal database
    const wasteInfo = wasteDatabase[wasteClass] || {
        description: 'Tipo di rifiuto non riconosciuto nel database.',
        icon: 'icons/unknown.png',
        color: '#9e9e9e'
    };
    
    // Aggiorna l'interfaccia
    wasteType.textContent = wasteClass;
    wasteDescription.textContent = wasteInfo.description + ` (Confidenza: ${confidence * 100}%)`;
    resultIcon.src = wasteInfo.icon;
    
    // Mostra il container dei risultati
    resultContainer.classList.remove('hidden');
    
    // Scorri alla sezione dei risultati
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Gestisce il feedback dell'utente
function provideFeedback(isCorrect) {
    if (isCorrect) {
        stats.correct++;
        labelContainer.innerHTML = '<p class="success">Grazie per il feedback positivo!</p>';
    } else {
        labelContainer.innerHTML = '<p>Grazie per il feedback! Ci aiuterà a migliorare il modello.</p>';
    }
    
    // Resetta per una nuova scansione
    capturedImage = null;
    analyzeBtn.disabled = true;
    resultContainer.classList.add('hidden');
    
    // Aggiorna le statistiche
    updateStats();
}

// Aggiorna le statistiche visualizzate
function updateStats() {
    analyzedCount.textContent = stats.analyzed;
    const accuracyValue = stats.analyzed > 0 ? (stats.correct / stats.analyzed * 100).toFixed(1) : 0;
    accuracy.textContent = `${accuracyValue}%`;
}

// Salva le statistiche nel localStorage
function saveStats() {
    localStorage.setItem('trashScanStats', JSON.stringify(stats));
}

// Carica le statistiche dal localStorage
function loadStats() {
    const savedStats = localStorage.getItem('trashScanStats');
    if (savedStats) {
        stats = JSON.parse(savedStats);
        updateStats();
    }
}

// Ascolta per la chiusura della finestra per salvare le statistiche
window.addEventListener('beforeunload', saveStats);

// Inizializza l'app quando il DOM è completamente caricato
document.addEventListener('DOMContentLoaded', () => {
    // Carica le statistiche salvate
    loadStats();
    
    // Inizializza la webcam e il modello
    init();
});
