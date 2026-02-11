# EpiTrello - ATP (Arborescence Technique de Projet)

## 0. Contexte et finalite

EpiTrello est une plateforme d'organisation de type Kanban via cartes et tableaux, dediee aux etudiants et aux encadrants.

Objectif principal :

* Fournir une plateforme simple, efficace et centralisee pour le suivi des modules et projets.
* Permettre aux encadrants et a l'administration de superviser, organiser et evaluer le travail des etudiants.

---

## 1. Lot ATP-01 - Cadrage produit

### 1.1 Cibles et utilisateurs

* Etudiants en ecole informatique (18-25 ans).
* Encadrants / APE et administration en ecole informatique (25-40+).

### 1.2 Roles utilisateurs

#### Etudiant

* Creer et gerer ses tableaux Kanban.
* Visualiser les tableaux partages par les encadrants.
* Creer, modifier et organiser ses tickets.
* Suivre l'avancement de ses projets et modules.

#### Encadrant / APE

* Creer des tableaux Kanban lies aux modules.
* Suivre l'avancement des etudiants.
* Ajouter des tickets globaux ou specifiques a un module.
* Definir des deadlines et des consignes.

#### Administrateur

* Gerer l'ensemble des utilisateurs.
* Acceder a tous les tableaux.
* Superviser l'activite globale de la plateforme.
* Moderer ou supprimer des contenus si necessaire.

---

## 2. Lot ATP-02 - Parcours utilisateur

### 2.1 Nouvel utilisateur et page d'accueil publique

* Presentation de l'application.
* Creation d'un compte.
* Acces a la page de connexion SSO (GitHub).

### 2.2 Accueil utilisateur connecte

* Affichage de la barre de recherche (creation, recherche de tableaux).
* Affichage des tableaux affectes et precedemment crees.
* Acces rapide aux tableaux recemment utilises.
* Indication visuelle de l'avancement global des tableaux (ex. pourcentage).

### 2.3 Acces aux tableaux

* Affichage des listes de depart TODO, En Cours et Termine (vides).
* Affichage de la barre de recherche (creation, recherche de tableaux).
* Navigation fluide entre les tableaux.
* Mise a jour en temps reel des modifications.

---

## 3. Lot ATP-03 - Gestion Kanban et tickets

### 3.1 Creation et gestion des tickets

* Creation des tickets avec nom.
* Modification de la description du ticket (avec apercu du contenu).
* Assignation de tags personnalises.
* Checkbox permettant de valider un ticket.
* Suppression des tickets.
* Assignation des tickets sur les differentes listes et ordres.
* Glisser-deposer (drag and drop) des tickets entre les listes.
* Ajout de commentaires sur les tickets.

### 3.2 Creation des Kanban avec l'intranet

* Creation d'un Kanban avec titre correspondant au nom du module (ex. G - PAR - Quantum).
* Creation d'un ticket recapitulatif du module (ex. Description).
* Assignation de la date limite de rendu.
* Creation des differents tickets pour chaque projet d'un module.
* Liaison automatique avec les etudiants inscrits au module.
* Possibilite de verrouiller un tableau apres la date de rendu.

---

## 4. Lot ATP-04 - Administration

### 4.1 Acces a la page d'accueil administrateur

* Affichage de la barre de recherche des tableaux crees par l'administrateur et des tableaux des etudiants.
* Acces a la liste des utilisateurs.
* Consultation et modification des tableaux existants.
* Suppression ou archivage de tableaux.
* Gestion des droits utilisateurs (etudiant, encadrant, administrateur).

---

## 5. Lot ATP-05 - Exigences UX/UI

* Interface claire et epuree, inspiree des outils Kanban modernes.
* Design responsive (ordinateur, tablette, mobile).
* Codes couleurs pour distinguer les etats des tickets.
* Accessibilite (contrastes, lisibilite, navigation clavier).
* Feedback visuel lors des actions utilisateur (creation, suppression, deplacement).

---

## 6. Lot ATP-06 - Exigences non fonctionnelles

### 6.1 Securite

* Authentification securisee via GitHub SSO.
* Gestion des roles et des permissions.
* Protection contre les acces non autorises.
* Isolation des requetes backend.
* Journalisation des actions critiques (creation, suppression, modification).

### 6.2 Performances

* Temps de chargement optimise.
* Mise en cache des donnees frequemment utilisees.
* Rafraichissement partiel des donnees sans rechargement complet de la page.
* Gestion efficace des connexions simultanees.

---

## 7. Lot ATP-07 - Stack de developpement

Ces choix visent un developpement efficace centre sur le Front-end et le design UX/UI.

### 7.1 Choix de Svelte Kit

* Rapidite de developpement centree sur le Front-end.
* Framework moderne et performant.
* Permet l'utilisation d'outils SaaS pour deployer l'application.
* Support du SSR (Server Side Rendering).

### 7.2 Choix de MongoDB (decline)

* Base de donnees NoSQL basee sur des documents.
* Outils SaaS et exterieur au deploiement de l'application.
* Option declinee pour des raisons de securite recentes (CVE-2025-14847).

### 7.3 Choix de Redis (base de donnees primaire)

* Cache des requetes MDB pour une latence minimale.
* Outils SaaS et exterieur au deploiement de l'application.
* Securite de developpement via un systeme de connecteur (requetes isolees de l'objet programme).
* Utilisation des structures de donnees Redis (Hash, List, Set).

---

## 8. Lot ATP-08 - Contraintes techniques

* Application accessible via navigateur web.
* Compatibilite avec les navigateurs modernes.
* Deploiement cloud.
* Code maintenable et documente.
* Respect des bonnes pratiques de securite.

---

## 9. Lot ATP-09 - Contraintes temporelles

### 9.1 Cadence projet

* Duree cible du projet : 12 semaines.
* Organisation en sprints de 2 semaines.
* Daily de suivi chaque jour ouvrable (avancement, blocages, priorites).

### 9.2 Jalons de realisation

* Jalon 1 (S1-S2) : cadrage final, architecture, maquettes UX/UI.
* Jalon 2 (S3-S6) : developpement du MVP (authentification, roles, tableaux, tickets).
* Jalon 3 (S7-S8) : fonctionnalites intranet et administration.
* Jalon 4 (S9-S10) : stabilisation, securite, performances, integration continue.
* Jalon 5 (S11) : campagne de tests, documentation technique et utilisateur.
* Jalon 6 (S12) : recette finale et preparation de mise en production.

### 9.3 Contraintes de pilotage

* Toute derive superieure a 15% sur un sprint doit declencher une replanification.
* Tout blocage critique superieur a 48h doit etre escalade a l'encadrement.
* Les livraisons intermediaires doivent rester deployables a chaque fin de sprint.

---

## 10. Lot ATP-10 - Livrables attendus

* Application web fonctionnelle.
* Documentation technique.
* Documentation utilisateur.
* Cahier de tests.
* Code source versionne (Git).
* CI/CD operationnelles.

---

## 11. Lot ATP-11 - Evolutions possibles

* Importation de tableaux venant de Trello.
