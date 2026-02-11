# EpiTrello - ATP (Arborescence Technique de Projet)

## 0. Contexte et finalité

EpiTrello est une plateforme d'organisation de type Kanban via cartes et tableaux, dédiée aux étudiants et aux encadrants.

Objectif principal :

* Fournir une plateforme simple, efficace et centralisée pour le suivi des modules et projets.
* Permettre aux encadrants et à l'administration de superviser, organiser et évaluer le travail des étudiants.

---

## 1. Lot ATP-01 - Cadrage produit

### 1.1 Cibles et utilisateurs

* Étudiants en école informatique (18-25 ans).
* Encadrants / APE et administration en école informatique (25-40+).

### 1.2 Rôles utilisateurs

#### Étudiant

* Créer et gérer ses tableaux Kanban.
* Visualiser les tableaux partagés par les encadrants.
* Créer, modifier et organiser ses tickets.
* Suivre l'avancement de ses projets et modules.

#### Encadrant / APE

* Créer des tableaux Kanban liés aux modules.
* Suivre l'avancement des étudiants.
* Ajouter des tickets globaux ou spécifiques à un module.
* Définir des deadlines et des consignes.

#### Administrateur

* Gérer l'ensemble des utilisateurs.
* Accéder à tous les tableaux.
* Superviser l'activité globale de la plateforme.
* Modérer ou supprimer des contenus si nécessaire.

---

## 2. Lot ATP-02 - Parcours utilisateur

### 2.1 Nouvel utilisateur et page d'accueil publique

* Présentation de l'application.
* Création d'un compte.
* Accès à la page de connexion SSO (GitHub).

### 2.2 Accueil utilisateur connecté

* Affichage de la barre de recherche (création, recherche de tableaux).
* Affichage des tableaux affectés et précédemment créés.
* Accès rapide aux tableaux récemment utilisés.
* Indication visuelle de l'avancement global des tableaux (ex. pourcentage).

### 2.3 Accès aux tableaux

* Affichage des listes de départ TODO, En Cours et Terminé (vides).
* Affichage de la barre de recherche (création, recherche de tableaux).
* Navigation fluide entre les tableaux.
* Mise à jour en temps réel des modifications.

---

## 3. Lot ATP-03 - Gestion Kanban et tickets

### 3.1 Création et gestion des tickets

* Création des tickets avec nom.
* Modification de la description du ticket (avec aperçu du contenu).
* Assignation de tags personnalisés.
* Checkbox permettant de valider un ticket.
* Suppression des tickets.
* Assignation des tickets sur les différentes listes et ordres.
* Glisser-déposer (drag and drop) des tickets entre les listes.
* Ajout de commentaires sur les tickets.

### 3.2 Création des Kanban avec l'intranet

* Création d'un Kanban avec titre correspondant au nom du module (ex. G - PAR - Quantum).
* Création d'un ticket récapitulatif du module (ex. Description).
* Assignation de la date limite de rendu.
* Création des différents tickets pour chaque projet d'un module.
* Liaison automatique avec les étudiants inscrits au module.
* Possibilité de verrouiller un tableau après la date de rendu.

---

## 4. Lot ATP-04 - Administration

### 4.1 Accès à la page d'accueil administrateur

* Affichage de la barre de recherche des tableaux créés par l'administrateur et des tableaux des étudiants.
* Accès à la liste des utilisateurs.
* Consultation et modification des tableaux existants.
* Suppression ou archivage de tableaux.
* Gestion des droits utilisateurs (étudiant, encadrant, administrateur).

---

## 5. Lot ATP-05 - Exigences UX/UI

* Interface claire et épurée, inspirée des outils Kanban modernes.
* Design responsive (ordinateur, tablette, mobile).
* Codes couleurs pour distinguer les états des tickets.
* Accessibilité (contrastes, lisibilité, navigation clavier).
* Feedback visuel lors des actions utilisateur (création, suppression, déplacement).

---

## 6. Lot ATP-06 - Exigences non fonctionnelles

### 6.1 Sécurité

* Authentification sécurisée via GitHub SSO.
* Gestion des rôles et des permissions.
* Protection contre les accès non autorisés.
* Isolation des requêtes backend.
* Journalisation des actions critiques (création, suppression, modification).

### 6.2 Performances

* Temps de chargement optimisé.
* Mise en cache des données fréquemment utilisées.
* Rafraîchissement partiel des données sans rechargement complet de la page.
* Gestion efficace des connexions simultanées.

---

## 7. Lot ATP-07 - Stack de développement

Ces choix visent un développement efficace centré sur le Front-end et le design UX/UI.

### 7.1 Choix de Svelte Kit

* Rapidité de développement centrée sur le Front-end.
* Framework moderne et performant.
* Permet l'utilisation d'outils SaaS pour déployer l'application.
* Support du SSR (Server Side Rendering).

### 7.2 Choix de MongoDB (décliné)

* Base de données NoSQL basée sur des documents.
* Outils SaaS et extérieur au déploiement de l'application.
* Option déclinée pour des raisons de sécurité récentes (CVE-2025-14847).

### 7.3 Choix de Redis (base de données primaire)

* Cache des requêtes MDB pour une latence minimale.
* Outils SaaS et extérieur au déploiement de l'application.
* Sécurité de développement via un système de connecteur (requêtes isolées de l'objet programmé).
* Utilisation des structures de données Redis (Hash, List, Set).

---

## 8. Lot ATP-08 - Contraintes techniques

* Application accessible via navigateur web.
* Compatibilité avec les navigateurs modernes.
* Déploiement cloud.
* Code maintenable et documenté.
* Respect des bonnes pratiques de sécurité.

---

## 9. Lot ATP-09 - Contraintes temporelles

### 9.1 Cadence projet

* Durée cible du projet : 12 semaines.
* Organisation en sprints de 2 semaines.
* Daily de suivi chaque jour ouvrable (avancement, blocages, priorités).

### 9.2 Jalons de réalisation

* Jalon 1 (S1-S2) : cadrage final, architecture, maquettes UX/UI.
* Jalon 2 (S3-S6) : développement du MVP (authentification, rôles, tableaux, tickets).
* Jalon 3 (S7-S8) : fonctionnalités intranet et administration.
* Jalon 4 (S9-S10) : stabilisation, sécurité, performances, intégration continue.
* Jalon 5 (S11) : campagne de tests, documentation technique et utilisateur.
* Jalon 6 (S12) : recette finale et préparation de mise en production.

### 9.3 Contraintes de pilotage

* Toute dérive supérieure à 15% sur un sprint doit déclencher une replanification.
* Tout blocage critique supérieur à 48h doit être escaladé à l'encadrement.
* Les livraisons intermédiaires doivent rester déployables à chaque fin de sprint.

---

## 10. Lot ATP-10 - Livrables attendus

* Application web fonctionnelle.
* Documentation technique.
* Documentation utilisateur.
* Cahier de tests.
* Code source versionné (Git).
* CI/CD opérationnelles.

---

## 11. Lot ATP-11 - Évolutions possibles

* Importation de tableaux venant de Trello.
