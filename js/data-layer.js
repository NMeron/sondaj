/* ============================================================
   SONDAJ — Couche de données (Firebase Firestore)
   CAP2030 · v1.0
   ------------------------------------------------------------
   TOUTE l'interaction avec la base de données passe par ce
   fichier. Le jour où l'on change de moteur (Cloudflare D1,
   Apps Script...), seul ce fichier est à réécrire.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, getDocs, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ------------------------------------------------------------
   ⚙️ CONFIGURATION — à remplacer par les clés de TON projet
   Firebase (Console Firebase > Paramètres du projet > Vos
   applications > Configuration SDK).
   Ces clés ne sont pas des secrets : la sécurité est assurée
   par les règles Firestore (fichier firestore.rules).
   ------------------------------------------------------------ */
const firebaseConfig = {
  apiKey: "AIzaSyAghtDnStquGB9BGesjrHKtQcrRFTEFMUs",
  authDomain: "sondaj-cap2030.firebaseapp.com",
  projectId: "sondaj-cap2030",
  storageBucket: "sondaj-cap2030.firebasestorage.app",
  messagingSenderId: "218546445072",
  appId: "1:218546445072:web:345fd5923d920b6663a395"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ---------- Identité locale du participant ---------- */
export function getDeviceId() {
  let id = localStorage.getItem("sondaj_device");
  if (!id) {
    id = "d-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("sondaj_device", id);
  }
  return id;
}

export function getPrenom()  { return localStorage.getItem("sondaj_prenom") || ""; }
export function setPrenom(p) { localStorage.setItem("sondaj_prenom", p); }

export function aDejaRepondu(qId) {
  return localStorage.getItem("sondaj_rep_" + qId) === "1";
}
export function marquerRepondu(qId) {
  localStorage.setItem("sondaj_rep_" + qId, "1");
}

/* ---------- Abonnements temps réel ---------- */

/** Question actuellement OUVERTE au vote (page participant). */
export function subscribeQuestionOuverte(confId, callback) {
  const q = query(
    collection(db, "conferences", confId, "questions"),
    where("statut", "==", "ouverte"), limit(1)
  );
  return onSnapshot(q, snap => {
    if (snap.empty) callback(null);
    else callback({ id: snap.docs[0].id, ...snap.docs[0].data() });
  });
}

/** Question actuellement PROJETÉE (page projection). */
export function subscribeQuestionProjetee(confId, callback) {
  const q = query(
    collection(db, "conferences", confId, "questions"),
    where("projetee", "==", true), limit(1)
  );
  return onSnapshot(q, snap => {
    if (snap.empty) callback(null);
    else callback({ id: snap.docs[0].id, ...snap.docs[0].data() });
  });
}

/** Flux temps réel des réponses d'une question. */
export function subscribeReponses(confId, qId, callback) {
  const q = query(
    collection(db, "conferences", confId, "questions", qId, "reponses"),
    orderBy("ts", "asc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/** Toutes les questions d'une conférence (page animateur). */
export function subscribeQuestions(confId, callback) {
  const q = query(
    collection(db, "conferences", confId, "questions"),
    orderBy("ordre", "asc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/* ---------- Écriture participant (avec réessai) ---------- */

/**
 * Envoie une réponse. Réessaie jusqu'à 3 fois avec délai
 * aléatoire croissant — le participant ne voit rien.
 */
export async function envoyerReponse(confId, qId, data, essai = 1) {
  try {
    await addDoc(
      collection(db, "conferences", confId, "questions", qId, "reponses"),
      { ...data, device: getDeviceId(), ts: serverTimestamp() }
    );
  } catch (err) {
    if (essai >= 3) throw err;
    const delai = essai * 800 + Math.random() * 800;
    await new Promise(r => setTimeout(r, delai));
    return envoyerReponse(confId, qId, data, essai + 1);
  }
}

/* ---------- Administration (page animateur) ---------- */

export function login(email, motdepasse) {
  return signInWithEmailAndPassword(auth, email, motdepasse);
}
export function logout() { return signOut(auth); }
export function onAuth(callback) { return onAuthStateChanged(auth, callback); }

export async function creerConference(confId, nom) {
  await setDoc(doc(db, "conferences", confId), {
    nom, creee: serverTimestamp()
  });
}

export async function creerQuestion(confId, q) {
  await addDoc(collection(db, "conferences", confId, "questions"), {
    ...q, statut: "attente", projetee: false, creee: serverTimestamp()
  });
}

export async function majQuestion(confId, qId, champs) {
  await updateDoc(doc(db, "conferences", confId, "questions", qId), champs);
}

/** Ouvre une question au vote (et ferme les autres). */
export async function ouvrirQuestion(confId, qId, questions) {
  for (const q of questions) {
    if (q.statut === "ouverte" && q.id !== qId) {
      await majQuestion(confId, q.id, { statut: "fermee" });
    }
  }
  await majQuestion(confId, qId, { statut: "ouverte", projetee: true });
  for (const q of questions) {
    if (q.projetee && q.id !== qId) {
      await majQuestion(confId, q.id, { projetee: false });
    }
  }
}

export async function fermerQuestion(confId, qId) {
  await majQuestion(confId, qId, { statut: "fermee" });
}

export async function projeter(confId, qId, questions) {
  for (const q of questions) {
    if (q.projetee && q.id !== qId) {
      await majQuestion(confId, q.id, { projetee: false });
    }
  }
  await majQuestion(confId, qId, { projetee: true });
}

export async function supprimerQuestion(confId, qId) {
  await deleteDoc(doc(db, "conferences", confId, "questions", qId));
}

/* ---------- Export bilan (CSV) ---------- */

export async function exporterCSV(confId) {
  const qs = await getDocs(query(
    collection(db, "conferences", confId, "questions"),
    orderBy("ordre", "asc")
  ));
  const lignes = [["Question", "Type", "Horodatage", "Prénom", "Réponse"]];
  for (const qd of qs.docs) {
    const q = qd.data();
    const reps = await getDocs(query(
      collection(db, "conferences", confId, "questions", qd.id, "reponses"),
      orderBy("ts", "asc")
    ));
    reps.forEach(r => {
      const d = r.data();
      const ts = d.ts && d.ts.toDate ? d.ts.toDate().toISOString() : "";
      const val = Array.isArray(d.valeur) ? d.valeur.join(" | ") : String(d.valeur ?? "");
      lignes.push([q.texte, q.type, ts, d.prenom || "", val]);
    });
  }
  const csv = lignes.map(l =>
    l.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(";")
  ).join("\r\n");
  return "\uFEFF" + csv; // BOM pour Excel/Sheets en français
}
