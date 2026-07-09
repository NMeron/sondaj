# SONDAJ — Guide de déploiement

Application de sondages interactifs en direct · CAP2030 · v1.0

## Vue d'ensemble

```
Participants (téléphones)          Vidéoprojecteur              Toi
        │                                │                       │
   index.html                     projection.html          animateur.html
        └────────────┬───────────────────┴───────────┬───────────┘
                     ▼                               ▼
              GitHub Pages (hébergement des 3 pages statiques)
                     │
                     ▼
         Firebase Firestore — europe-west9 (Paris)
         (base de données temps réel, palier gratuit)
```

Toute la logique base de données est isolée dans `js/data-layer.js`.
Le jour où tu changes de moteur (Cloudflare D1…), seul ce fichier bouge.

---

## Étape 1 — Créer le projet Firebase (≈ 15 min, une seule fois)

1. Va sur **https://console.firebase.google.com** avec ton compte Google.
2. **Créer un projet** → nom : `sondaj-cap2030` (ou autre). Désactive
   Google Analytics (inutile ici).
3. Dans le menu de gauche : **Build > Firestore Database > Créer une base
   de données**.
   - ⚠️ **Région : `europe-west9` (Paris)** — ce choix est définitif.
   - Mode : **production** (les règles sécurisées arrivent à l'étape 3).
4. **Build > Authentication > Commencer** → onglet **Sign-in method** →
   active **Adresse e-mail/Mot de passe**.
5. Onglet **Users > Ajouter un utilisateur** : ton email + un mot de passe
   solide. C'est ton compte animateur.

## Étape 2 — Récupérer la configuration

1. ⚙️ **Paramètres du projet** (roue dentée en haut à gauche) →
   section **Vos applications** → icône **`</>`** (Web).
2. Nom de l'app : `sondaj` → **Enregistrer** (pas besoin de Hosting).
3. Copie le bloc `firebaseConfig` affiché et colle ses valeurs dans
   **`js/data-layer.js`** (les six lignes `REMPLACER_...`).

> Ces clés ne sont pas des secrets : elles identifient le projet.
> La sécurité vient des règles Firestore (étape 3).

## Étape 3 — Installer les règles de sécurité

1. **Firestore Database > Règles** (onglet en haut).
2. Ouvre le fichier **`firestore.rules`** de ce dossier, remplace
   `ADMIN_EMAIL@exemple.com` par ton email animateur (étape 1.5).
3. Colle tout le contenu dans l'éditeur de règles → **Publier**.

Ce que garantissent ces règles :
- les participants ne peuvent qu'**ajouter** des réponses (jamais modifier
  ni supprimer) et seulement quand la question est **ouverte** ;
- les réponses trop longues ou mal formées sont rejetées ;
- seul ton compte peut gérer conférences et questions.

## Étape 4 — Publier sur GitHub Pages (comme SiBato)

1. Crée un dépôt GitHub (ex. `sondaj`), pousse tout le contenu de ce
   dossier à la racine.
2. **Settings > Pages** → Source : branche `main`, dossier `/ (root)`.
3. Ton app est en ligne à `https://TON-COMPTE.github.io/sondaj/`.

## Étape 5 — Préparer une conférence

1. Ouvre `animateur.html`, connecte-toi.
2. Saisis un code de conférence (ex. `sibato-2026-09`) → **Créer**.
3. Ajoute tes questions à l'avance : type, anonyme ou non, réponses
   multiples ou non, étiquettes du curseur…
4. Le QR code et les deux liens (participants / projection) s'affichent.

## Le jour J

| Écran | Page | Action |
|---|---|---|
| Vidéoprojecteur | `projection.html?conf=...` | ouvrir en plein écran (F11) |
| Ton téléphone/PC | `animateur.html?conf=...` | ▶ Ouvrir / ⏹ Fermer / 📺 Projeter |
| Public | scanne le QR | vote, la page suit toute seule |

Astuce : dans le texte d'une question, `*mot*` s'affiche **souligné en or**
à la projection.

## Après la conférence

- **⬇ Export CSV** sur la page animateur → ouvre le fichier dans Google
  Sheets (séparateur `;`, encodage UTF-8 automatique) pour tes bilans.
- Les données restent dans Firestore : rien n'est effacé tant que tu ne
  supprimes pas.

## RGPD — mémo

- Hébergement UE (Paris), mention d'information affichée en bas de la page
  participant.
- Minimisation : prénom seul, jamais de nom complet — surtout avec des
  publics mineurs.
- Le CSV exporté contient des prénoms si des questions non-anonymes ont été
  posées : à stocker dans ton Drive, pas à diffuser.

## Limites du palier gratuit Firebase (largement suffisant)

- 50 000 lectures / 20 000 écritures par **jour**.
- Une conférence de 150 personnes × 10 questions ≈ 1 500 écritures et
  quelques milliers de lectures : très loin des plafonds.
