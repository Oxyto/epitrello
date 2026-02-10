# EpiTrello – Cahier des charges

## Présentation du projet

Création d'un site d'organisation (style Kanban) via des cartes et des tableaux du nom d'EpiTrello, dédié à l'organisation des étudiants et des encadrants.

L’objectif principal est de fournir une plateforme simple, efficace et centralisée permettant :

* Aux étudiants de suivre l’avancement de leurs modules et projets.
* Aux encadrants et à l’administration de superviser, organiser et évaluer le travail des étudiants.

---

## Cibles et utilisateurs

Profiles recherchés :

* Étudiants en école informatique (âgé 18-25).
* Encadrants / APE et Administration en école informatique (25-40+).

---

## Rôles utilisateurs

### Étudiant

* Créer et gérer ses tableaux Kanban.
* Visualiser les tableaux partagés par les encadrants.
* Créer, modifier et organiser ses tickets.
* Suivre l’avancement de ses projets et modules.

### Encadrant / APE

* Créer des tableaux Kanban liés aux modules.
* Suivre l’avancement des étudiants.
* Ajouter des tickets globaux ou spécifiques à un module.
* Définir des deadlines et des consignes.

### Administrateur

* Gérer l’ensemble des utilisateurs.
* Accéder à tous les tableaux.
* Superviser l’activité globale de la plateforme.
* Modérer ou supprimer des contenus si nécessaire.

---

## Fonctionnalités

### Utilisateurs

#### Nouvelle utilisateur et page d’accueil

* Présentation de l’application.
* Création d’un compte.
* Accès à la page de connexion SSO (GitHub).

#### Accès à la page d’accueil utilisateur (connecté)

* Affichage de la barre de recherche (création, recherche de tableaux).
* Affichage des tableaux affectés et précédemment créés.
* Accès rapide aux tableaux récemment utilisés.
* Indication visuelle de l’avancement global des tableaux (ex. pourcentage).

#### Accès aux tableaux

* Affichage des listes de départ TODO, En Cours et Terminé (vides).
* Affichage de la barre de recherche (création, recherche de tableaux).
* Navigation fluide entre les tableaux.
* Mise à jour en temps réel des modifications.

#### Création des tickets

* Création des tickets avec nom.
* Modification de la description du ticket (avec aperçu du contenu).
* Assignation de tags personnalisés.
* Checkbox permettant de valider un ticket.
* Suppression des tickets.
* Assignation des tickets sur les différentes listes et ordres.
* Glisser-déposer (drag & drop) des tickets entre les listes.
* Ajout de commentaires sur les tickets.

#### Création des Kanban avec l’intranet

* Création d’un Kanban avec titre correspondant au nom du module. (ex. G - PAR - Quantum)
* Création d’un ticket récapitulatif du module (ex. Description).
* Assignation de la date limite de rendu.
* Création des différents tickets pour chaque projet d’un module.
* Liaison automatique avec les étudiants inscrits au module.
* Possibilité de verrouiller un tableau après la date de rendu.

---

### Administrateurs

#### Accès à la page d’accueil administrateur

* Affichage de la barre de recherche des tableaux créés par l’administrateur et les tableaux des étudiants.
* Accès à la liste des utilisateurs.
* Consultation et modification des tableaux existants.
* Suppression ou archivage de tableaux.
* Gestion des droits utilisateurs (étudiant, encadrant, administrateur).

---

## UX / UI

* Interface claire et épurée, inspirée des outils Kanban modernes.
* Design responsive (ordinateur, tablette, mobile).
* Codes couleurs pour distinguer les états des tickets.
* Accessibilité (contrastes, lisibilité, navigation clavier).
* Feedback visuel lors des actions utilisateur (création, suppression, déplacement).

---

## Sécurité

* Authentification sécurisée via GitHub SSO.
* Gestion des rôles et des permissions.
* Protection contre les accès non autorisés.
* Isolation des requêtes backend.
* Journalisation des actions critiques (création, suppression, modification).

---

## Performances

* Temps de chargement optimisé.
* Mise en cache des données fréquemment utilisées.
* Rafraîchissement partiel des données sans rechargement complet de la page.
* Gestion efficace des connexions simultanées.

---

## Choix de la stack de développement

Ces solutions permettent un développement efficace et centrée sur le Front-end et le design UX/UI.

### Choix de Svelte Kit

* Rapidité de développement centrée sur le Front-end.
* Framework moderne et performant.
* Permet d'utiliser des outils SaaS pour déployer l'application.
* Support du SSR (Server Side Rendering).

### Choix de MongoDB (décliné)

* Base de donnée *NoSQL* basé sur des documents.
* Outils SaaS et extérieur au déploiement de l'application.
* A dû être décliné pour des raisons de sécurité récente (CVE-2025-14847).

### Choix de Redis (Base de données primaire)

* Cache des requêtes MDB pour une latence minimale.
* Outils SaaS et extérieur au déploiement de l'application.
* Sécurité de développement avec un système de connecteur (requêtes isolées de l’objet programmé).
* Utilisation des structures de données Redis (Hash, List, Set).

---

## Contraintes techniques

* Application accessible via navigateur web.
* Compatibilité avec les navigateurs modernes.
* Déploiement cloud.
* Code maintenable et documenté.
* Respect des bonnes pratiques de sécurité.

---

## Livrables attendus

* Application web fonctionnelle.
* Documentation technique.
* Documentation utilisateur.
* Cahier de tests.
* Code source versionné (Git).
* CI/CD Opérationnelles.

---

## Évolutions possibles

* Importation de tableaux venant de Trello.
